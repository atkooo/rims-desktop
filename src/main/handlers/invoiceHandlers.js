const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const fs = require("fs").promises;
const path = require("path");
const { printPDF, openPDF } = require("../helpers/printUtils");

// Function to generate PDF invoice
async function generateInvoicePDF(transactionId, transactionType) {
  try {
    // Import jsPDF - for jsPDF 3.x, use require with jsPDF property
    const jsPDFModule = require("jspdf");
    const jsPDF = jsPDFModule.jsPDF;

    if (!jsPDF || typeof jsPDF !== "function") {
      throw new Error(
        "jsPDF constructor not found. Please check jsPDF installation.",
      );
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

      // Get transaction details
      transactionDetails = await database.query(
        `SELECT std.*, i.name AS item_name, i.code AS item_code
           FROM sales_transaction_details std
           LEFT JOIN items i ON std.item_id = i.id
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

    // Get company settings
    const { loadSettings } = require("../helpers/settingsUtils");
    const { formatCurrency, formatDate } = require("../helpers/formatUtils");
    const settings = await loadSettings();

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;


    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Company info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(settings.companyName || "RIMS", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (settings.address) {
      doc.text(settings.address, margin, yPos);
      yPos += 5;
    }
    if (settings.phone) {
      doc.text(`Telp: ${settings.phone}`, margin, yPos);
      yPos += 5;
    }
    yPos += 10;

    // Transaction info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Informasi Transaksi", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Kode: ${transaction.transaction_code}`, margin, yPos);
    yPos += 5;
    doc.text(
      `Tanggal: ${formatDate(transactionType === "sale" ? transaction.sale_date : transaction.rental_date)}`,
      margin,
      yPos,
    );
    yPos += 5;
    if (transaction.user_name) {
      doc.text(`Kasir: ${transaction.user_name}`, margin, yPos);
      yPos += 5;
    }
    yPos += 5;

    // Customer info
    if (customer && customer.name) {
      doc.setFont("helvetica", "bold");
      doc.text("Customer", margin, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`Nama: ${customer.name}`, margin, yPos);
      yPos += 5;
      if (customer.phone) {
        doc.text(`Telp: ${customer.phone}`, margin, yPos);
        yPos += 5;
      }
      if (customer.address) {
        doc.text(`Alamat: ${customer.address}`, margin, yPos);
        yPos += 5;
      }
      yPos += 5;
    }

    // Items table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Item", margin, yPos);
    doc.text("Qty", margin + 60, yPos);
    doc.text("Harga", margin + 90, yPos);
    doc.text("Subtotal", margin + 140, yPos);
    yPos += 6;

    // Draw line
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Items
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const detail of transactionDetails) {
      const itemName = detail.item_name || "-";
      const quantity = detail.quantity || 0;
      const price =
        transactionType === "sale" ? detail.sale_price : detail.rental_price;
      const subtotal = detail.subtotal || 0;

      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }

      doc.text(itemName.substring(0, 30), margin, yPos);
      doc.text(quantity.toString(), margin + 60, yPos);
      doc.text(formatCurrency(price), margin + 90, yPos);
      doc.text(formatCurrency(subtotal), margin + 140, yPos);
      yPos += 6;
    }

    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Summary
    const subtotal = transaction.subtotal || 0;
    const discount = transaction.discount || 0;
    const tax = transaction.tax || 0;
    const total = transaction.total_amount || 0;
    const paid = transaction.paid_amount || 0;
    const remaining = total - paid;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Subtotal:", margin + 100, yPos);
    doc.text(formatCurrency(subtotal), margin + 140, yPos);
    yPos += 6;

    if (discount > 0) {
      doc.text("Diskon:", margin + 100, yPos);
      doc.text(`- ${formatCurrency(discount)}`, margin + 140, yPos);
      yPos += 6;
    }

    if (tax > 0) {
      doc.text("Pajak:", margin + 100, yPos);
      doc.text(`+ ${formatCurrency(tax)}`, margin + 140, yPos);
      yPos += 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Total:", margin + 100, yPos);
    doc.text(formatCurrency(total), margin + 140, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Dibayar:", margin + 100, yPos);
    doc.text(formatCurrency(paid), margin + 140, yPos);
    yPos += 6;

    if (remaining > 0) {
      doc.text("Sisa:", margin + 100, yPos);
      doc.text(formatCurrency(remaining), margin + 140, yPos);
      yPos += 6;
    }

    // Payment status
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const paymentStatus = transaction.payment_status || "unpaid";
    const statusText =
      paymentStatus === "paid"
        ? "LUNAS"
        : "BELUM DIBAYAR";
    doc.text(`Status: ${statusText}`, margin, yPos);

    // Notes
    if (transaction.notes) {
      yPos += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Catatan:", margin, yPos);
      yPos += 6;
      doc.text(transaction.notes, margin, yPos);
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Dicetak pada: ${new Date().toLocaleString("id-ID")}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    );

    // Save PDF to file
    const invoiceDir = path.join(__dirname, "../../data/exports/pdf");
    await fs.mkdir(invoiceDir, { recursive: true });
    const fileName = `invoice_${transaction.transaction_code}_${Date.now()}.pdf`;
    const filePath = path.join(invoiceDir, fileName);

    const pdfBuffer = doc.output("arraybuffer");
    await fs.writeFile(filePath, Buffer.from(pdfBuffer));

    // Also return PDF as base64 for preview/download
    const pdfBase64 = doc.output("datauristring");

    return {
      success: true,
      filePath,
      fileName,
      pdfBase64,
    };
  } catch (error) {
    logger.error("Error generating invoice PDF:", error);
    throw error;
  }
}

function setupInvoiceHandlers() {
  // Generate PDF invoice for transaction
  ipcMain.handle(
    "invoice:generatePDF",
    async (event, { transactionId, transactionType }) => {
      return await generateInvoicePDF(transactionId, transactionType);
    },
  );

  // Print invoice to specific printer
  ipcMain.handle(
    "invoice:print",
    async (
      event,
      { transactionId, transactionType, printerName, silent = false },
    ) => {
      try {
        // Generate PDF first
        const result = await generateInvoicePDF(transactionId, transactionType);

        // If printer name is provided, print directly to that printer
        if (printerName) {
          return await printPDF(result.filePath, printerName, silent);
        } else {
          // No printer specified, open PDF in default viewer
          return await openPDF(result.filePath);
        }
      } catch (error) {
        logger.error("Error printing invoice:", error);
        throw error;
      }
    },
  );
}

module.exports = setupInvoiceHandlers;
