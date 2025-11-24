const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const fs = require("fs").promises;
const path = require("path");
const { printPDF, openPDF } = require("../helpers/printUtils");
const { loadSettings } = require("../helpers/settingsUtils");
const { formatCurrency, formatDateTime } = require("../helpers/formatUtils");
const { getDataDir } = require("../helpers/pathUtils");

// Function to generate receipt (struk) - compact format for thermal printer
async function generateReceipt(transactionId, transactionType, options = {}) {
  try {
    // Import jsPDF - for jsPDF 3.x, use require with jsPDF property
    const jsPDFModule = require("jspdf");
    const jsPDF = jsPDFModule.jsPDF;

    if (!jsPDF || typeof jsPDF !== "function") {
      throw new Error(
        "jsPDF constructor not found. Please check jsPDF installation.",
      );
    }

    // Get receipt display settings
    const settings = await loadSettings();

    // Ensure receiptSettings exists
    if (!settings.receiptSettings) {
      settings.receiptSettings = {};
    }
    
    // Ensure showLogo has a default value (default to true)
    if (settings.receiptSettings.showLogo === undefined) {
      settings.receiptSettings.showLogo = true;
    }

    // Override with options if provided
    if (options.receiptSettings) {
      settings.receiptSettings = {
        ...settings.receiptSettings,
        ...options.receiptSettings,
      };
      // Ensure showLogo is still set after override
      if (settings.receiptSettings.showLogo === undefined) {
        settings.receiptSettings.showLogo = true;
      }
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
        [transactionId],
      );

      if (!transaction) {
        throw new Error("Transaksi penjualan tidak ditemukan");
      }

      // Get transaction details (items and accessories)
      transactionDetails = await database.query(
        `SELECT std.*, 
         COALESCE(i.name, a.name) AS item_name, 
         COALESCE(i.code, a.code) AS item_code
         FROM sales_transaction_details std
         LEFT JOIN items i ON std.item_id = i.id
         LEFT JOIN accessories a ON std.accessory_id = a.id
         WHERE std.sales_transaction_id = ?
         ORDER BY std.id`,
        [transactionId],
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
        [transactionId],
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
        [transactionId],
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
    // Normalize transaction type: ensure it matches database format ('sale' or 'rental')
    const normalizedTransactionType = transactionType === "sale" ? "sale" : "rental";
    const payments = await database.query(
      `SELECT p.*, u.full_name AS user_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.transaction_id = ? AND p.transaction_type = ?
       ORDER BY p.payment_date DESC`,
      [transactionId, normalizedTransactionType],
    );

    // Get thermal printer settings
    const thermalPaperSize = settings.thermalPaperSize || "80";
    const thermalFontSize = settings.thermalFontSize || "medium";
    const thermalPrintDensity = settings.thermalPrintDensity || "normal";
    
    // Calculate paper width in mm based on thermal paper size
    let paperWidth = settings.paperWidth || 80;
    if (thermalPaperSize === "58") {
      paperWidth = 58;
    } else if (thermalPaperSize === "80") {
      paperWidth = 80;
    }
    // If custom, use the paperWidth from settings
    
    const paperWidthMM = paperWidth; // Already in mm
    
    // Adjust margin based on paper size (smaller paper = smaller margin)
    let margin = 5;
    if (paperWidthMM <= 58) {
      margin = 3; // Smaller margin for 58mm paper
    } else {
      margin = 5; // Standard margin for 80mm paper
    }
    
    const contentWidth = paperWidthMM - margin * 2;
    
    // Define font sizes based on thermal font size setting
    const fontSizes = {
      small: { normal: 7, medium: 8, large: 9, title: 10 },
      medium: { normal: 9, medium: 10, large: 11, title: 12 },
      large: { normal: 11, medium: 12, large: 13, title: 14 },
    };
    const fontSize = fontSizes[thermalFontSize] || fontSizes.medium;

    // Generate PDF with custom page size
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [paperWidthMM, 297], // Standard receipt paper height
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;
    
    // Add extra top spacing for better appearance
    yPos += 3; // Add 3mm extra space at the top

    // Helper function to format date (for receipt, use formatDateTime)
    const formatDate = formatDateTime;

    // Helper to add centered text (backward compatible: accepts size string or numeric fontSize)
    const addCenteredText = (text, sizeOrFontSize = "medium", isBold = false) => {
      let fontSizeValue;
      if (typeof sizeOrFontSize === "number") {
        // Backward compatibility: numeric fontSize
        fontSizeValue = sizeOrFontSize;
      } else {
        // New: size string (small, medium, large, title)
        fontSizeValue = fontSize[sizeOrFontSize] || fontSize.medium;
      }
      doc.setFontSize(fontSizeValue);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, yPos);
      yPos += fontSizeValue * 0.4;
    };

    // Helper to add centered text with wrapping
    const addCenteredTextWrapped = (text, size = "medium", isBold = false, maxWidth = null) => {
      const fontSizeValue = fontSize[size] || fontSize.medium;
      doc.setFontSize(fontSizeValue);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const textWidth = maxWidth || (contentWidth * 0.9); // Use 90% of content width for wrapping
      const lines = doc.splitTextToSize(text, textWidth);
      lines.forEach((line) => {
        const lineWidth = doc.getTextWidth(line);
        doc.text(line, (pageWidth - lineWidth) / 2, yPos);
        yPos += fontSizeValue * 0.5; // Slightly more spacing between wrapped lines
      });
    };

    // Helper to add left-aligned text (backward compatible)
    const addLeftText = (text, sizeOrFontSize = "normal") => {
      let fontSizeValue;
      if (typeof sizeOrFontSize === "number") {
        // Backward compatibility: numeric fontSize
        fontSizeValue = sizeOrFontSize;
      } else {
        // New: size string (small, medium, large, title)
        fontSizeValue = fontSize[sizeOrFontSize] || fontSize.normal;
      }
      doc.setFontSize(fontSizeValue);
      doc.setFont("helvetica", "normal");
      doc.text(text, margin, yPos);
      yPos += fontSizeValue * 0.4;
    };

    // Helper to add line
    const addLine = () => {
      // Adjust line width based on print density
      let lineWidth = 0.2;
      if (thermalPrintDensity === "dark") {
        lineWidth = 0.3;
      } else if (thermalPrintDensity === "light") {
        lineWidth = 0.15;
      }
      doc.setLineWidth(lineWidth);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      // Adjust spacing based on paper size
      const spacing = paperWidthMM <= 58 ? 3 : 4;
      yPos += spacing;
    };

    // Helper to add logo (grayscale for thermal printer)
    const addLogo = async (logoPath) => {
      // Ensure receiptSettings exists and showLogo has a default
      if (!settings.receiptSettings) {
        settings.receiptSettings = {};
      }
      const showLogo = settings.receiptSettings.showLogo !== false; // Default to true
      
      if (!logoPath) {
        logger.warn("addLogo called but logoPath is empty");
        return;
      }
      
      if (!showLogo) {
        logger.info("Logo disabled in receipt settings");
        return;
      }
      
      try {
        // Use getDataDir() to ensure consistent path resolution
        const DATA_DIR = getDataDir();
        const logoFilePath = path.join(DATA_DIR, logoPath);
        
        logger.info("Attempting to load logo from:", logoFilePath);
        
        // Check if file exists
        try {
          await fs.access(logoFilePath);
          logger.info("Logo file found, reading...");
        } catch (accessError) {
          logger.warn("Logo file not found:", logoFilePath, accessError.message);
          return;
        }

        // Read logo file as base64
        const logoBuffer = await fs.readFile(logoFilePath);
        logger.info("Logo file read successfully, size:", logoBuffer.length, "bytes");
        
        const base64 = logoBuffer.toString("base64");
        const ext = path.extname(logoPath).toLowerCase();
        let mimeType = "image/png";
        if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
        if (ext === ".webp") mimeType = "image/webp";
        
        const logoDataUrl = `data:${mimeType};base64,${base64}`;
        
        // Logo dimensions (max width 40mm for 80mm paper, centered)
        const logoWidth = 40; // mm
        const logoHeight = Math.min(logoWidth * 0.6, 20); // Maintain aspect ratio, max height 20mm
        
        logger.info("Adding logo to PDF at position:", yPos, "size:", logoWidth, "x", logoHeight);
        
        // Add logo at top, centered
        doc.addImage(
          logoDataUrl,
          "PNG", // jsPDF will handle conversion
          (pageWidth - logoWidth) / 2, // Center horizontally
          yPos,
          logoWidth,
          logoHeight,
          undefined,
          "FAST", // Fast rendering for thermal printer
          0 // Rotation
        );
        
        logger.info("Logo added successfully to receipt");
        yPos += logoHeight + 3; // Move down after logo
      } catch (error) {
        logger.error("Error adding logo to receipt:", error);
        logger.error("Error stack:", error.stack);
        // Continue without logo if there's an error
      }
    };

    // Header - Logo
    // Debug: Log logo path and showLogo setting
    logger.info("Receipt logo check - logoPath:", settings.logoPath, "showLogo:", settings.receiptSettings?.showLogo);
    
    if (settings.logoPath) {
      await addLogo(settings.logoPath);
    } else {
      logger.warn("No logo path found in settings");
    }

    // Header - Company Name
    if (settings.receiptSettings.showCompanyName && settings.companyName) {
      addCenteredText(settings.companyName, 12, true);
      yPos += 2;
    }

    // Company Address
    if (settings.receiptSettings.showAddress && settings.address) {
      addCenteredTextWrapped(settings.address, 9);
      yPos += 1;
    }

    // Company Phone
    if (settings.receiptSettings.showPhone && settings.phone) {
      addCenteredText(`Telp: ${settings.phone}`, 9);
      yPos += 2;
    }

    addLine();
    yPos += 2; // Extra spacing after line before STRUK title

    // Title: STRUK
    addCenteredText("STRUK", 14, true);
    yPos += 3;

    // Transaction Code
    if (settings.receiptSettings.showTransactionCode) {
      addLeftText(`No: ${transaction.transaction_code}`, 9);
    }

    // Date
    if (settings.receiptSettings.showDate) {
      const dateStr =
        transactionType === "sale"
          ? transaction.sale_date
          : transaction.rental_date;
      addLeftText(`Tgl: ${formatDate(dateStr)}`, 9);
    }

    // Cashier
    if (settings.receiptSettings.showCashier && transaction.user_name) {
      addLeftText(`Kasir: ${transaction.user_name}`, 9);
    }

    yPos += 2;
    addLine();
    yPos += 1; // Extra spacing after line before customer info

    // Customer Info
    if (
      settings.receiptSettings.showCustomerInfo &&
      customer &&
      customer.name
    ) {
      addLeftText("Pelanggan:", 9);
      doc.setFont("helvetica", "bold");
      addLeftText(customer.name, 9);
      doc.setFont("helvetica", "normal");
      if (customer.phone) {
        addLeftText(`Telp: ${customer.phone}`, 8);
      }
      if (customer.address) {
        const addressLines = doc.splitTextToSize(
          customer.address,
          contentWidth,
        );
        addressLines.forEach((line) => {
          addLeftText(line, 8);
        });
      }
      yPos += 2;
      addLine();
      yPos += 1; // Extra spacing after line before items header
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
      yPos += 2; // Extra spacing after line before items list
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      // Items
      for (const detail of transactionDetails) {
        const itemName = detail.item_name || "-";
        const quantity = detail.quantity || 0;
        const price =
          transactionType === "sale" ? detail.sale_price : detail.rental_price;
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
      yPos += 1; // Extra spacing after line before summary
    }

    // Summary
    const subtotal = transaction.subtotal || 0;
    const discount = transaction.discount || 0;
    const tax = transaction.tax || 0;
    const total = transaction.total_amount || 0;
    // Calculate total paid from payments history for accuracy
    const totalPaidFromPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const paid = totalPaidFromPayments > 0 ? totalPaidFromPayments : (transaction.paid_amount || 0);
    const remaining = total - paid;

    doc.setFontSize(9);

    if (settings.receiptSettings.showSubtotal) {
      doc.text("Subtotal:", margin, yPos);
      doc.text(formatCurrency(subtotal), pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 4;
    }

    if (settings.receiptSettings.showDiscount && discount > 0) {
      doc.text("Diskon:", margin, yPos);
      doc.text(`- ${formatCurrency(discount)}`, pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 4;
    }

    if (settings.receiptSettings.showTax && tax > 0) {
      doc.text("Pajak:", margin, yPos);
      doc.text(`+ ${formatCurrency(tax)}`, pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 4;
    }

    if (settings.receiptSettings.showTotal) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TOTAL:", margin, yPos);
      doc.text(formatCurrency(total), pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }

    if (settings.receiptSettings.showPaymentInfo) {
      addLine();
      yPos += 1; // Extra spacing after line before payment info
      doc.text("Dibayar:", margin, yPos);
      doc.text(formatCurrency(paid), pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 4;

      if (remaining > 0) {
        doc.text("Sisa:", margin, yPos);
        doc.text(formatCurrency(remaining), pageWidth - margin, yPos, {
          align: "right",
        });
        yPos += 4;
      }

      // Payment status - Calculate based on actual payment amount
      const isFullyPaid = paid >= total && total > 0;
      const statusText = isFullyPaid ? "LUNAS" : "BELUM DIBAYAR";
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
          const methodLabel =
            methodLabels[payment.payment_method] || payment.payment_method;
          doc.text(
            `${formatDate(payment.payment_date)} - ${methodLabel}: ${formatCurrency(payment.amount)}`,
            margin,
            yPos,
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

    // Get thermal printer settings from companySettings
    const thermalPaperSize = companySettings?.thermalPaperSize || "80";
    const thermalFontSize = companySettings?.thermalFontSize || "medium";
    const thermalPrintDensity = companySettings?.thermalPrintDensity || "normal";
    
    const settings = {
      companyName: companySettings?.companyName || "TOKO CONTOH",
      address: companySettings?.address || "Jl. Contoh No. 123, Jakarta",
      phone: companySettings?.phone || "0812-3456-7890",
      paperWidth: companySettings?.paperWidth || 80,
      receiptSettings: receiptSettings || {
        showCompanyName: true,
        showAddress: true,
        showPhone: true,
        showLogo: true,
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

    // Calculate paper width based on thermal paper size
    let paperWidth = settings.paperWidth || 80;
    if (thermalPaperSize === "58") {
      paperWidth = 58;
    } else if (thermalPaperSize === "80") {
      paperWidth = 80;
    }
    
    // Adjust margin based on paper size
    let margin = 5;
    if (paperWidth <= 58) {
      margin = 3;
    } else {
      margin = 5;
    }
    
    const contentWidth = paperWidth - margin * 2;
    
    // Define font sizes based on thermal font size setting
    const fontSizes = {
      small: { normal: 7, medium: 8, large: 9, title: 10 },
      medium: { normal: 9, medium: 10, large: 11, title: 12 },
      large: { normal: 11, medium: 12, large: 13, title: 14 },
    };
    const fontSize = fontSizes[thermalFontSize] || fontSizes.medium;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [paperWidth, 297],
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = margin;
    
    // Add extra top spacing for better appearance
    yPos += 3; // Add 3mm extra space at the top

    // Use format helpers from imports at top
    const formatDate = formatDateTime;

    const addCenteredText = (text, sizeOrFontSize = "medium", isBold = false) => {
      let fontSizeValue;
      if (typeof sizeOrFontSize === "number") {
        fontSizeValue = sizeOrFontSize;
      } else {
        fontSizeValue = fontSize[sizeOrFontSize] || fontSize.medium;
      }
      doc.setFontSize(fontSizeValue);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, yPos);
      yPos += fontSizeValue * 0.4;
    };

    // Helper to add centered text with wrapping
    const addCenteredTextWrapped = (text, sizeOrFontSize = "medium", isBold = false, maxWidth = null) => {
      let fontSizeValue;
      if (typeof sizeOrFontSize === "number") {
        fontSizeValue = sizeOrFontSize;
      } else {
        fontSizeValue = fontSize[sizeOrFontSize] || fontSize.medium;
      }
      doc.setFontSize(fontSizeValue);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const textWidth = maxWidth || (contentWidth * 0.9);
      const lines = doc.splitTextToSize(text, textWidth);
      lines.forEach((line) => {
        const lineWidth = doc.getTextWidth(line);
        doc.text(line, (pageWidth - lineWidth) / 2, yPos);
        yPos += fontSizeValue * 0.5;
      });
    };

    const addLeftText = (text, sizeOrFontSize = "normal") => {
      let fontSizeValue;
      if (typeof sizeOrFontSize === "number") {
        fontSizeValue = sizeOrFontSize;
      } else {
        fontSizeValue = fontSize[sizeOrFontSize] || fontSize.normal;
      }
      doc.setFontSize(fontSizeValue);
      doc.setFont("helvetica", "normal");
      doc.text(text, margin, yPos);
      yPos += fontSizeValue * 0.4;
    };

    const addLine = () => {
      // Adjust line width based on print density
      let lineWidth = 0.2;
      if (thermalPrintDensity === "dark") {
        lineWidth = 0.3;
      } else if (thermalPrintDensity === "light") {
        lineWidth = 0.15;
      }
      doc.setLineWidth(lineWidth);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      // Adjust spacing based on paper size
      const spacing = paperWidth <= 58 ? 3 : 4;
      yPos += spacing;
    };

    // Helper to add logo (grayscale for thermal printer)
    const addLogo = async (logoPath) => {
      // Ensure receiptSettings exists and showLogo has a default
      if (!settings.receiptSettings) {
        settings.receiptSettings = {};
      }
      const showLogo = settings.receiptSettings.showLogo !== false; // Default to true
      
      if (!logoPath) {
        logger.warn("addLogo called but logoPath is empty");
        return;
      }
      
      if (!showLogo) {
        logger.info("Logo disabled in receipt settings");
        return;
      }
      
      try {
        // Use getDataDir() to ensure consistent path resolution
        const DATA_DIR = getDataDir();
        const logoFilePath = path.join(DATA_DIR, logoPath);
        
        logger.info("Attempting to load logo from:", logoFilePath);
        logger.info("Logo path from settings:", logoPath);
        logger.info("DATA_DIR:", DATA_DIR);
        
        // Check if file exists
        try {
          await fs.access(logoFilePath);
          logger.info("Logo file found, reading...");
        } catch (accessError) {
          logger.warn("Logo file not found:", logoFilePath, "Error:", accessError.message);
          return;
        }

        // Read logo file as base64
        const logoBuffer = await fs.readFile(logoFilePath);
        logger.info("Logo file read successfully, size:", logoBuffer.length, "bytes");
        
        const base64 = logoBuffer.toString("base64");
        const ext = path.extname(logoPath).toLowerCase();
        let mimeType = "image/png";
        if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
        if (ext === ".webp") mimeType = "image/webp";
        
        const logoDataUrl = `data:${mimeType};base64,${base64}`;
        
        // Logo dimensions (max width 40mm for 80mm paper, centered)
        const logoWidth = 40; // mm
        const logoHeight = Math.min(logoWidth * 0.6, 20); // Maintain aspect ratio, max height 20mm
        
        logger.info("Adding logo to PDF at position:", yPos, "size:", logoWidth, "x", logoHeight);
        
        // Add logo at top, centered
        doc.addImage(
          logoDataUrl,
          "PNG", // jsPDF will handle conversion
          (pageWidth - logoWidth) / 2, // Center horizontally
          yPos,
          logoWidth,
          logoHeight,
          undefined,
          "FAST", // Fast rendering for thermal printer
          0 // Rotation
        );
        
        logger.info("Logo added successfully to receipt");
        yPos += logoHeight + 3; // Move down after logo
      } catch (error) {
        logger.error("Error adding logo to receipt:", error);
        logger.error("Error stack:", error.stack);
        // Continue without logo if there's an error
      }
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

    // Header - Logo
    if (companySettings?.logoPath) {
      await addLogo(companySettings.logoPath);
    }

    // Header
    if (settings.receiptSettings.showCompanyName && settings.companyName) {
      addCenteredText(settings.companyName, 12, true);
      yPos += 2;
    }

    if (settings.receiptSettings.showAddress && settings.address) {
      addCenteredTextWrapped(settings.address, 9);
      yPos += 1;
    }

    if (settings.receiptSettings.showPhone && settings.phone) {
      addCenteredText(`Telp: ${settings.phone}`, 9);
      yPos += 2;
    }

    addLine();
    yPos += 2; // Extra spacing after line before STRUK title

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
    yPos += 1; // Extra spacing after line before customer info

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
        const addressLines = doc.splitTextToSize(
          sampleTransaction.customer_address,
          contentWidth,
        );
        addressLines.forEach((line) => {
          addLeftText(line, 8);
        });
      }
      yPos += 2;
      addLine();
      yPos += 1; // Extra spacing after line before items header
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
      yPos += 2; // Extra spacing after line before items list
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
      yPos += 1; // Extra spacing after line before summary
    }

    // Summary
    doc.setFontSize(9);

    if (settings.receiptSettings.showSubtotal) {
      doc.text("Subtotal:", margin, yPos);
      doc.text(
        formatCurrency(sampleTransaction.subtotal),
        pageWidth - margin,
        yPos,
        { align: "right" },
      );
      yPos += 4;
    }

    if (
      settings.receiptSettings.showDiscount &&
      sampleTransaction.discount > 0
    ) {
      doc.text("Diskon:", margin, yPos);
      doc.text(
        `- ${formatCurrency(sampleTransaction.discount)}`,
        pageWidth - margin,
        yPos,
        { align: "right" },
      );
      yPos += 4;
    }

    if (settings.receiptSettings.showTax && sampleTransaction.tax > 0) {
      doc.text("Pajak:", margin, yPos);
      doc.text(
        `+ ${formatCurrency(sampleTransaction.tax)}`,
        pageWidth - margin,
        yPos,
        { align: "right" },
      );
      yPos += 4;
    }

    if (settings.receiptSettings.showTotal) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TOTAL:", margin, yPos);
      doc.text(
        formatCurrency(sampleTransaction.total_amount),
        pageWidth - margin,
        yPos,
        { align: "right" },
      );
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }

    if (settings.receiptSettings.showPaymentInfo) {
      addLine();
      yPos += 1; // Extra spacing after line before payment info
      doc.text("Dibayar:", margin, yPos);
      doc.text(
        formatCurrency(sampleTransaction.paid_amount),
        pageWidth - margin,
        yPos,
        { align: "right" },
      );
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
      const noteLines = doc.splitTextToSize(
        sampleTransaction.notes,
        contentWidth,
      );
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
  ipcMain.handle(
    "receipt:generate",
    async (event, { transactionId, transactionType, receiptSettings }) => {
      return await generateReceipt(transactionId, transactionType, {
        receiptSettings,
      });
    },
  );

  // Generate sample receipt for settings preview
  ipcMain.handle(
    "receipt:generateSample",
    async (event, { receiptSettings, companySettings }) => {
      const result = await generateSampleReceipt(
        receiptSettings,
        companySettings,
      );

      // Note: We no longer create file:// URLs as they are blocked by browsers in development.
      // The frontend will use blob URLs created from pdfBase64 instead.

      return result;
    },
  );

  // Print receipt to specific printer
  ipcMain.handle(
    "receipt:print",
    async (
      event,
      {
        transactionId,
        transactionType,
        printerName,
        silent = false,
        receiptSettings,
      },
    ) => {
      try {
        // Generate receipt first
        const result = await generateReceipt(transactionId, transactionType, {
          receiptSettings,
        });

        // If printer name is provided, print directly to that printer
        if (printerName) {
          // Get thermal printer settings for print options
          const settings = await loadSettings();
          const thermalOptions = {
            paperSize: settings.thermalPaperSize || "80",
            autoCut: settings.thermalAutoCut || false,
          };
          return await printPDF(result.filePath, printerName, silent, thermalOptions);
        } else {
          // No printer specified, open PDF in default viewer
          return await openPDF(result.filePath);
        }
      } catch (error) {
        logger.error("Error printing receipt:", error);
        throw error;
      }
    },
  );
}

module.exports = setupReceiptHandlers;
