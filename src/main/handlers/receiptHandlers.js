const { ipcMain, dialog } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const fs = require("fs").promises;
const path = require("path");

// Function to generate receipt (struk) - compact format for thermal printer
async function generateReceipt(transactionId, transactionType, options = {}) {
  try {
    // Import jsPDF - for jsPDF 3.x, use require with jsPDF property
    const jsPDFModule = require("jspdf");
    const jsPDF = jsPDFModule.jsPDF;
    
    if (!jsPDF || typeof jsPDF !== "function") {
      throw new Error("jsPDF constructor not found. Please check jsPDF installation.");
    }
    
    // Get receipt display settings
    const settingsFile = path.join(__dirname, "../../data/settings.json");
    let settings = {
      companyName: "RIMS",
      address: "-",
      phone: "-",
      paperWidth: 80,
      receiptSettings: {
        showCompanyName: true,
        showAddress: true,
        showPhone: true,
        showCustomerInfo: true,
        showTransactionCode: true,
        showDate: true,
        showCashier: true,
        showItems: true,
        showSubtotal: true,
        showDiscount: true,
        showTax: true,
        showTotal: true,
        showPaymentInfo: true,
        showNotes: true,
        showFooter: true,
      },
    };

    try {
      const settingsData = await fs.readFile(settingsFile, "utf8");
      const savedSettings = JSON.parse(settingsData);
      settings = { ...settings, ...savedSettings };
      if (savedSettings.receiptSettings) {
        settings.receiptSettings = { ...settings.receiptSettings, ...savedSettings.receiptSettings };
      }
    } catch (error) {
      logger.warn("Could not load settings, using defaults");
    }

    // Override with options if provided
    if (options.receiptSettings) {
      settings.receiptSettings = { ...settings.receiptSettings, ...options.receiptSettings };
    }

    let transaction;
    let transactionDetails = [];
    let customer = null;

    if (transactionType === "sale") {
      // Get sale transaction
      transaction = await database.queryOne(
        `SELECT st.*, c.name AS customer_name, c.phone AS customer_phone, 
         c.address AS customer_address, u.full_name AS user_name
         FROM sales_transactions st
         LEFT JOIN customers c ON st.customer_id = c.id
         LEFT JOIN users u ON st.user_id = u.id
         WHERE st.id = ?`,
        [transactionId]
      );

      if (!transaction) {
        throw new Error("Transaksi penjualan tidak ditemukan");
      }

      // Get transaction details
      transactionDetails = await database.query(
        `SELECT std.*, i.name AS item_name, i.code AS item_code
         FROM sales_transaction_details std
         LEFT JOIN items i ON std.item_id = i.id
         WHERE std.sales_transaction_id = ?
         ORDER BY std.id`,
        [transactionId]
      );

      if (transaction.customer_id) {
        customer = {
          name: transaction.customer_name,
          phone: transaction.customer_phone,
          address: transaction.customer_address,
        };
      }
    } else if (transactionType === "rental") {
      // Get rental transaction
      transaction = await database.queryOne(
        `SELECT rt.*, c.name AS customer_name, c.phone AS customer_phone,
         c.address AS customer_address, u.full_name AS user_name
         FROM rental_transactions rt
         LEFT JOIN customers c ON rt.customer_id = c.id
         LEFT JOIN users u ON rt.user_id = u.id
         WHERE rt.id = ?`,
        [transactionId]
      );

      if (!transaction) {
        throw new Error("Transaksi sewa tidak ditemukan");
      }

      // Get transaction details
      transactionDetails = await database.query(
        `SELECT rtd.*, i.name AS item_name, i.code AS item_code
         FROM rental_transaction_details rtd
         LEFT JOIN items i ON rtd.item_id = i.id
         WHERE rtd.rental_transaction_id = ?
         ORDER BY rtd.id`,
        [transactionId]
      );

      if (transaction.customer_id) {
        customer = {
          name: transaction.customer_name,
          phone: transaction.customer_phone,
          address: transaction.customer_address,
        };
      }
    } else {
      throw new Error("Tipe transaksi tidak valid");
    }

    // Get payment history for this transaction
    const payments = await database.query(
      `SELECT p.*, u.full_name AS user_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.transaction_id = ? AND p.transaction_type = ?
       ORDER BY p.payment_date DESC`,
      [transactionId, transactionType]
    );

    // Calculate paper width in mm (default 80mm for thermal printer)
    const paperWidth = settings.paperWidth || 80;
    const paperWidthMM = paperWidth; // Already in mm
    const margin = 5; // Small margin for thermal printer
    const contentWidth = paperWidthMM - (margin * 2);

    // Generate PDF with custom page size
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [paperWidthMM, 297], // Standard receipt paper height
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;

    // Helper function to format currency
    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(value || 0);
    };

    // Helper function to format date
    const formatDate = (dateString) => {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // Helper to add centered text
    const addCenteredText = (text, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, yPos);
      yPos += fontSize * 0.4;
    };

    // Helper to add left-aligned text
    const addLeftText = (text, fontSize = 9) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      doc.text(text, margin, yPos);
      yPos += fontSize * 0.4;
    };

    // Helper to add line
    const addLine = () => {
      doc.setLineWidth(0.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3;
    };

    // Header - Company Name
    if (settings.receiptSettings.showCompanyName && settings.companyName) {
      addCenteredText(settings.companyName, 12, true);
      yPos += 2;
    }

    // Company Address
    if (settings.receiptSettings.showAddress && settings.address) {
      addCenteredText(settings.address, 9);
      yPos += 1;
    }

    // Company Phone
    if (settings.receiptSettings.showPhone && settings.phone) {
      addCenteredText(`Telp: ${settings.phone}`, 9);
      yPos += 2;
    }

    addLine();

    // Title: STRUK
    addCenteredText("STRUK", 14, true);
    yPos += 3;

    // Transaction Code
    if (settings.receiptSettings.showTransactionCode) {
      addLeftText(`No: ${transaction.transaction_code}`, 9);
    }

    // Date
    if (settings.receiptSettings.showDate) {
      const dateStr = transactionType === "sale" ? transaction.sale_date : transaction.rental_date;
      addLeftText(`Tgl: ${formatDate(dateStr)}`, 9);
    }

    // Cashier
    if (settings.receiptSettings.showCashier && transaction.user_name) {
      addLeftText(`Kasir: ${transaction.user_name}`, 9);
    }

    yPos += 2;
    addLine();

    // Customer Info
    if (settings.receiptSettings.showCustomerInfo && customer && customer.name) {
      addLeftText("Pelanggan:", 9);
      doc.setFont("helvetica", "bold");
      addLeftText(customer.name, 9);
      doc.setFont("helvetica", "normal");
      if (customer.phone) {
        addLeftText(`Telp: ${customer.phone}`, 8);
      }
      if (customer.address) {
        const addressLines = doc.splitTextToSize(customer.address, contentWidth);
        addressLines.forEach((line) => {
          addLeftText(line, 8);
        });
      }
      yPos += 2;
      addLine();
    }

    // Items Header
    if (settings.receiptSettings.showItems) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Item", margin, yPos);
      doc.text("Qty", margin + 35, yPos);
      doc.text("Harga", margin + 50, yPos);
      doc.text("Subtotal", margin + 75, yPos);
      yPos += 4;
      addLine();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      // Items
      for (const detail of transactionDetails) {
        const itemName = detail.item_name || "-";
        const quantity = detail.quantity || 0;
        const price = transactionType === "sale" ? detail.sale_price : detail.rental_price;
        const subtotal = detail.subtotal || 0;

        // Check if we need a new page
        if (yPos > 280) {
          doc.addPage();
          yPos = margin;
        }

        // Item name (may wrap)
        const nameLines = doc.splitTextToSize(itemName, 30);
        nameLines.forEach((line, idx) => {
          doc.text(line, margin, yPos);
          if (idx === 0) {
            doc.text(quantity.toString(), margin + 35, yPos);
            doc.text(formatCurrency(price), margin + 50, yPos);
            doc.text(formatCurrency(subtotal), margin + 75, yPos);
          }
          yPos += 3.5;
        });
      }

      yPos += 2;
      addLine();
    }

    // Summary
    const subtotal = transaction.subtotal || 0;
    const discount = transaction.discount || 0;
    const tax = transaction.tax || 0;
    const total = transaction.total_amount || 0;
    const paid = transaction.paid_amount || 0;
    const remaining = total - paid;

    doc.setFontSize(9);

    if (settings.receiptSettings.showSubtotal) {
      doc.text("Subtotal:", margin, yPos);
      doc.text(formatCurrency(subtotal), pageWidth - margin, yPos, { align: "right" });
      yPos += 4;
    }

    if (settings.receiptSettings.showDiscount && discount > 0) {
      doc.text("Diskon:", margin, yPos);
      doc.text(`- ${formatCurrency(discount)}`, pageWidth - margin, yPos, { align: "right" });
      yPos += 4;
    }

    if (settings.receiptSettings.showTax && tax > 0) {
      doc.text("Pajak:", margin, yPos);
      doc.text(`+ ${formatCurrency(tax)}`, pageWidth - margin, yPos, { align: "right" });
      yPos += 4;
    }

    if (settings.receiptSettings.showTotal) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TOTAL:", margin, yPos);
      doc.text(formatCurrency(total), pageWidth - margin, yPos, { align: "right" });
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }

    if (settings.receiptSettings.showPaymentInfo) {
      addLine();
      doc.text("Dibayar:", margin, yPos);
      doc.text(formatCurrency(paid), pageWidth - margin, yPos, { align: "right" });
      yPos += 4;

      if (remaining > 0) {
        doc.text("Sisa:", margin, yPos);
        doc.text(formatCurrency(remaining), pageWidth - margin, yPos, { align: "right" });
        yPos += 4;
      }

      // Payment status
      const paymentStatus = transaction.payment_status || "unpaid";
      const statusText =
        paymentStatus === "paid"
          ? "LUNAS"
          : paymentStatus === "partial"
            ? "SEBAGIAN"
            : "BELUM DIBAYAR";
      doc.setFont("helvetica", "bold");
      doc.text(`Status: ${statusText}`, margin, yPos);
      yPos += 4;

      // Payment methods if any
      if (payments.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        payments.forEach((payment) => {
          const methodLabels = {
            cash: "Tunai",
            transfer: "Transfer",
            card: "Kartu",
          };
          const methodLabel = methodLabels[payment.payment_method] || payment.payment_method;
          doc.text(
            `${formatDate(payment.payment_date)} - ${methodLabel}: ${formatCurrency(payment.amount)}`,
            margin,
            yPos
          );
          yPos += 3;
        });
      }
    }

    // Notes
    if (settings.receiptSettings.showNotes && transaction.notes) {
      yPos += 2;
      addLine();
      doc.setFontSize(9);
      doc.text("Catatan:", margin, yPos);
      yPos += 4;
      const noteLines = doc.splitTextToSize(transaction.notes, contentWidth);
      noteLines.forEach((line) => {
        doc.text(line, margin, yPos);
        yPos += 3.5;
      });
    }

    // Footer
    if (settings.receiptSettings.showFooter) {
      yPos += 5;
      addLine();
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      addCenteredText(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 7);
      yPos += 3;
      addCenteredText("Terima Kasih", 9, true);
    }

    // Save PDF to file
    const receiptDir = path.join(__dirname, "../../data/exports/pdf");
    await fs.mkdir(receiptDir, { recursive: true });
    const fileName = `struk_${transaction.transaction_code}_${Date.now()}.pdf`;
    const filePath = path.join(receiptDir, fileName);

    const pdfBuffer = doc.output("arraybuffer");
    await fs.writeFile(filePath, Buffer.from(pdfBuffer));

    // Also return PDF as base64 for preview/download
    const pdfBase64 = doc.output("datauristring");

    return {
      success: true,
      filePath,
      fileName,
      pdfBase64,
      settings: settings.receiptSettings,
    };
  } catch (error) {
    logger.error("Error generating receipt:", error);
    throw error;
  }
}

// Generate sample receipt for preview in settings
async function generateSampleReceipt(receiptSettings, companySettings) {
  try {
    const jsPDFModule = require("jspdf");
    const jsPDF = jsPDFModule.jsPDF;
    
    if (!jsPDF || typeof jsPDF !== "function") {
      throw new Error("jsPDF constructor not found.");
    }
    
    const settings = {
      companyName: companySettings?.companyName || "TOKO CONTOH",
      address: companySettings?.address || "Jl. Contoh No. 123, Jakarta",
      phone: companySettings?.phone || "0812-3456-7890",
      paperWidth: companySettings?.paperWidth || 80,
      receiptSettings: receiptSettings || {
        showCompanyName: true,
        showAddress: true,
        showPhone: true,
        showCustomerInfo: true,
        showTransactionCode: true,
        showDate: true,
        showCashier: true,
        showItems: true,
        showSubtotal: true,
        showDiscount: true,
        showTax: true,
        showTotal: true,
        showPaymentInfo: true,
        showNotes: true,
        showFooter: true,
      },
    };

    const paperWidth = settings.paperWidth || 80;
    const margin = 5;
    const contentWidth = paperWidth - (margin * 2);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [paperWidth, 297],
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;

    const formatCurrency = (value) => {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(value || 0);
    };

    const formatDate = (dateString) => {
      if (!dateString) return "-";
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const addCenteredText = (text, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, yPos);
      yPos += fontSize * 0.4;
    };

    const addLeftText = (text, fontSize = 9) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "normal");
      doc.text(text, margin, yPos);
      yPos += fontSize * 0.4;
    };

    const addLine = () => {
      doc.setLineWidth(0.2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3;
    };

    // Sample data
    const sampleTransaction = {
      transaction_code: "SLS-2025-0001",
      sale_date: new Date().toISOString(),
      user_name: "Kasir Contoh",
      customer_name: "Budi Santoso",
      customer_phone: "0812-3456-7890",
      customer_address: "Jl. Contoh No. 456",
      subtotal: 500000,
      discount: 50000,
      tax: 45000,
      total_amount: 495000,
      paid_amount: 500000,
      payment_status: "paid",
      notes: "Contoh catatan transaksi",
    };

    const sampleItems = [
      { item_name: "Baju Pesta", quantity: 2, price: 200000, subtotal: 400000 },
      { item_name: "Aksesoris", quantity: 1, price: 100000, subtotal: 100000 },
    ];

    // Header
    if (settings.receiptSettings.showCompanyName && settings.companyName) {
      addCenteredText(settings.companyName, 12, true);
      yPos += 2;
    }

    if (settings.receiptSettings.showAddress && settings.address) {
      addCenteredText(settings.address, 9);
      yPos += 1;
    }

    if (settings.receiptSettings.showPhone && settings.phone) {
      addCenteredText(`Telp: ${settings.phone}`, 9);
      yPos += 2;
    }

    addLine();

    // Title
    addCenteredText("STRUK", 14, true);
    yPos += 3;

    // Transaction Info
    if (settings.receiptSettings.showTransactionCode) {
      addLeftText(`No: ${sampleTransaction.transaction_code}`, 9);
    }

    if (settings.receiptSettings.showDate) {
      addLeftText(`Tgl: ${formatDate(sampleTransaction.sale_date)}`, 9);
    }

    if (settings.receiptSettings.showCashier && sampleTransaction.user_name) {
      addLeftText(`Kasir: ${sampleTransaction.user_name}`, 9);
    }

    yPos += 2;
    addLine();

    // Customer Info
    if (settings.receiptSettings.showCustomerInfo) {
      addLeftText("Pelanggan:", 9);
      doc.setFont("helvetica", "bold");
      addLeftText(sampleTransaction.customer_name, 9);
      doc.setFont("helvetica", "normal");
      if (sampleTransaction.customer_phone) {
        addLeftText(`Telp: ${sampleTransaction.customer_phone}`, 8);
      }
      if (sampleTransaction.customer_address) {
        const addressLines = doc.splitTextToSize(sampleTransaction.customer_address, contentWidth);
        addressLines.forEach((line) => {
          addLeftText(line, 8);
        });
      }
      yPos += 2;
      addLine();
    }

    // Items
    if (settings.receiptSettings.showItems) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Item", margin, yPos);
      doc.text("Qty", margin + 35, yPos);
      doc.text("Harga", margin + 50, yPos);
      doc.text("Subtotal", margin + 75, yPos);
      yPos += 4;
      addLine();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      sampleItems.forEach((item) => {
        const nameLines = doc.splitTextToSize(item.item_name, 30);
        nameLines.forEach((line, idx) => {
          doc.text(line, margin, yPos);
          if (idx === 0) {
            doc.text(item.quantity.toString(), margin + 35, yPos);
            doc.text(formatCurrency(item.price), margin + 50, yPos);
            doc.text(formatCurrency(item.subtotal), margin + 75, yPos);
          }
          yPos += 3.5;
        });
      });

      yPos += 2;
      addLine();
    }

    // Summary
    doc.setFontSize(9);

    if (settings.receiptSettings.showSubtotal) {
      doc.text("Subtotal:", margin, yPos);
      doc.text(formatCurrency(sampleTransaction.subtotal), pageWidth - margin, yPos, { align: "right" });
      yPos += 4;
    }

    if (settings.receiptSettings.showDiscount && sampleTransaction.discount > 0) {
      doc.text("Diskon:", margin, yPos);
      doc.text(`- ${formatCurrency(sampleTransaction.discount)}`, pageWidth - margin, yPos, { align: "right" });
      yPos += 4;
    }

    if (settings.receiptSettings.showTax && sampleTransaction.tax > 0) {
      doc.text("Pajak:", margin, yPos);
      doc.text(`+ ${formatCurrency(sampleTransaction.tax)}`, pageWidth - margin, yPos, { align: "right" });
      yPos += 4;
    }

    if (settings.receiptSettings.showTotal) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TOTAL:", margin, yPos);
      doc.text(formatCurrency(sampleTransaction.total_amount), pageWidth - margin, yPos, { align: "right" });
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }

    if (settings.receiptSettings.showPaymentInfo) {
      addLine();
      doc.text("Dibayar:", margin, yPos);
      doc.text(formatCurrency(sampleTransaction.paid_amount), pageWidth - margin, yPos, { align: "right" });
      yPos += 4;
      doc.setFont("helvetica", "bold");
      doc.text(`Status: LUNAS`, margin, yPos);
      yPos += 4;
    }

    // Notes
    if (settings.receiptSettings.showNotes && sampleTransaction.notes) {
      yPos += 2;
      addLine();
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Catatan:", margin, yPos);
      yPos += 4;
      const noteLines = doc.splitTextToSize(sampleTransaction.notes, contentWidth);
      noteLines.forEach((line) => {
        doc.text(line, margin, yPos);
        yPos += 3.5;
      });
    }

    // Footer
    if (settings.receiptSettings.showFooter) {
      yPos += 5;
      addLine();
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      addCenteredText(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 7);
      yPos += 3;
      addCenteredText("Terima Kasih", 9, true);
    }

    const pdfBase64 = doc.output("datauristring");
    return { success: true, pdfBase64 };
  } catch (error) {
    logger.error("Error generating sample receipt:", error);
    throw error;
  }
}

function setupReceiptHandlers() {
  // Generate receipt for preview
  ipcMain.handle("receipt:generate", async (event, { transactionId, transactionType, receiptSettings }) => {
    return await generateReceipt(transactionId, transactionType, { receiptSettings });
  });

  // Generate sample receipt for settings preview
  ipcMain.handle("receipt:generateSample", async (event, { receiptSettings, companySettings }) => {
    const result = await generateSampleReceipt(receiptSettings, companySettings);
    
    // Note: We no longer create file:// URLs as they are blocked by browsers in development.
    // The frontend will use blob URLs created from pdfBase64 instead.
    
    return result;
  });

  // Print receipt to specific printer
  ipcMain.handle("receipt:print", async (event, { transactionId, transactionType, printerName, silent = false, receiptSettings }) => {
    try {
      // Generate receipt first
      const result = await generateReceipt(transactionId, transactionType, { receiptSettings });

      // If printer name is provided, print directly to that printer
      if (printerName) {
        try {
          // Try using pdf-to-printer library first (better for direct printing)
          const ptp = require("pdf-to-printer");
          
          await ptp.print(result.filePath, {
            printer: printerName,
            silent: silent,
          });

          logger.info(`Receipt printed to printer: ${printerName}`);
          return { success: true, filePath: result.filePath, printer: printerName };
        } catch (ptpError) {
          // Fallback: Use Electron's webContents.print() method
          logger.warn("pdf-to-printer failed, trying Electron print method:", ptpError);
          
          try {
            const { BrowserWindow } = require("electron");
            
            // Create a hidden window to load and print the PDF
            const printWindow = new BrowserWindow({
              show: false,
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                plugins: true, // Enable plugins for PDF support
              },
            });

            try {
              // Load PDF file using file:// protocol
              const filePath = result.filePath.replace(/\\/g, '/');
              await printWindow.loadURL(`file://${filePath}`);
              
              // Wait for PDF to load
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  resolve(); // Resolve even on timeout to continue
                }, 3000);
                
                printWindow.webContents.once("did-finish-load", () => {
                  clearTimeout(timeout);
                  setTimeout(resolve, 1000); // Give PDF viewer time to render
                });
              });

              // Print to specific printer using Electron's print API
              return new Promise((resolve, reject) => {
                printWindow.webContents.print({
                  silent: silent,
                  printBackground: true,
                  deviceName: printerName,
                }, (success, errorType) => {
                  // Close print window after printing
                  setTimeout(() => {
                    if (!printWindow.isDestroyed()) {
                      printWindow.close();
                    }
                  }, 1000);
                  
                  if (success) {
                    logger.info(`Receipt printed to printer: ${printerName}`);
                    resolve({ success: true, filePath: result.filePath, printer: printerName });
                  } else {
                    logger.error(`Print failed: ${errorType}`);
                    reject(new Error(`Gagal mencetak: ${errorType || "Unknown error"}`));
                  }
                });
              });
            } catch (printError) {
              if (!printWindow.isDestroyed()) {
                printWindow.close();
              }
              throw printError;
            }
          } catch (electronPrintError) {
            logger.error("Electron print method also failed:", electronPrintError);
            // Final fallback: open PDF viewer
            const { shell } = require("electron");
            await shell.openPath(result.filePath);
            throw new Error(`Gagal mencetak ke printer ${printerName}. PDF dibuka di viewer untuk print manual.`);
          }
        }
      } else {
        // No printer specified, open PDF in default viewer
        const { shell } = require("electron");
        await shell.openPath(result.filePath);
        return { success: true, filePath: result.filePath };
      }
    } catch (error) {
      logger.error("Error printing receipt:", error);
      throw error;
    }
  });
}

module.exports = setupReceiptHandlers;

