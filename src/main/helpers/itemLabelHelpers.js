const database = require("./database");
const logger = require("./logger");
const { formatCurrency } = require("./formatUtils");
const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");

/**
 * Generate barcode label PDF for a single item
 * @param {number} itemId - Item ID
 * @param {Object} options - Options for label generation
 * @returns {Promise<Object>} Object with success, filePath, and fileName
 */
async function generateBarcodeLabel(itemId, options = {}) {
  try {
    // Import jsPDF
    const jsPDFModule = require("jspdf");
    const jsPDF = jsPDFModule.jsPDF;

    if (!jsPDF || typeof jsPDF !== "function") {
      throw new Error(
        "jsPDF constructor not found. Please check jsPDF installation."
      );
    }

    // Get item data
    const item = await database.queryOne(
      `
      SELECT
        i.*,
        c.name AS category_name,
        s.name AS size_name,
        s.code AS size_code
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN item_sizes s ON i.size_id = s.id
      WHERE i.id = ?
    `,
      [itemId]
    );

    if (!item) {
      throw new Error("Item tidak ditemukan");
    }

    // Import jsbarcode and canvas
    const JsBarcode = require("jsbarcode");
    const { createCanvas } = require("canvas");

    // Create canvas for barcode
    const canvas = createCanvas(200, 100);

    // Use JsBarcode - it works with node-canvas
    try {
      JsBarcode(canvas, item.code, {
        format: "CODE128",
        width: 2.4,
        height: 70,
        displayValue: true,
        fontSize: 16,
        fontOptions: "bold",
        margin: 8,
      });
    } catch (barcodeError) {
      logger.error("Error generating barcode:", barcodeError);
      throw new Error("Gagal generate barcode: " + barcodeError.message);
    }

    // Convert canvas to buffer then to base64 data URL
    const buffer = canvas.toBuffer("image/png");
    const barcodeDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;

    // Create PDF - Label size: 70mm x 40mm (standard label size)
    // Convert mm to points: 1mm = 2.83465 points
    const labelWidth = 70 * 2.83465; // ~198 points
    const labelHeight = 40 * 2.83465; // ~113 points
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: [labelWidth, labelHeight],
    });

    // Set font
    doc.setFont("helvetica");

    // Background color (light gray)
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, labelWidth, labelHeight, "F");

    // Border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.rect(5, 5, labelWidth - 10, labelHeight - 10, "S");

    // Title block (align vertically centered)
    const maxNameWidth = labelWidth - 20;
    const nameFontSize = 13;
    const nameLineHeight = 16;
    const priceFontSize = 11;
    const priceLineHeight = 12;
    const sizeFontSize = 10;
    const sizeLineHeight = 12;
    const gapAfterName = 4;
    const gapAfterPriceWhenSize = 3;
    const barcodeSpacing = 10;
    const borderPadding = 5;
    const contentTopPadding = 0; // No padding - start content directly at border
    const preferredBarcodeHeight = 48;
    const drawableHeight = labelHeight - borderPadding * 2;

    // Force single line - truncate if too long
    let itemNameText = item.name || "N/A";
    const itemNameLines = doc.splitTextToSize(itemNameText, maxNameWidth);
    if (itemNameLines.length > 1) {
      let truncated = itemNameText;
      const ellipsis = "...";
      while (
        doc.getTextWidth(truncated + ellipsis) > maxNameWidth &&
        truncated.length > 0
      ) {
        truncated = truncated.substring(0, truncated.length - 1);
      }
      itemNameText = truncated + ellipsis;
    }

    const sizeLabel = (item.size_name || item.size_code || "").trim();
    const hasSizeLabel = sizeLabel.length > 0;
    const priceGapAfter = hasSizeLabel ? gapAfterPriceWhenSize : barcodeSpacing;
    const textBlockHeight =
      nameLineHeight +
      gapAfterName +
      priceLineHeight +
      (hasSizeLabel
        ? priceGapAfter + sizeLineHeight + barcodeSpacing
        : priceGapAfter);
    const totalContentHeight = textBlockHeight + preferredBarcodeHeight;
    const extraSpace =
      drawableHeight - totalContentHeight >= 0
        ? drawableHeight - totalContentHeight
        : 0;
    const bottomExtra = extraSpace;
    // Start content with minimal top space
    // Border rectangle starts at Y=5
    // In jsPDF, Y coordinate is the baseline of text
    // For helvetica font, text ascent is approximately fontSize * 0.75
    // To position text top near border top (Y=5), we need baseline = border + ascent
    // But to minimize space, position baseline so text top is just inside border
    const textAscent = nameFontSize * 0.75; // Approximate text ascent for helvetica
    const contentTop = borderPadding + textAscent; // Position baseline so text top is at border

    let cursorY = contentTop;
    const writeLine = (lineHeight, gapAfter, drawLine) => {
      // Draw first, then move cursor (no space before first line)
      drawLine(cursorY);
      cursorY += lineHeight + gapAfter;
    };

    // Draw name directly at contentTop (minimal space before)
    writeLine(nameLineHeight, gapAfterName, (y) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(nameFontSize);
      doc.setTextColor(30, 30, 30);
      doc.text(itemNameText, labelWidth / 2, y, {
        align: "center",
        maxWidth: maxNameWidth,
      });
    });

    writeLine(priceLineHeight, priceGapAfter, (y) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(priceFontSize);
      doc.setTextColor(0, 100, 0);
      doc.text(
        formatCurrency(item.sale_price || item.rental_price_per_day || 0),
        labelWidth / 2,
        y,
        {
          align: "center",
        }
      );
    });

    if (hasSizeLabel) {
      writeLine(sizeLineHeight, barcodeSpacing, (y) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(sizeFontSize);
        doc.setTextColor(75, 85, 99);
        doc.text(`Ukuran: ${sizeLabel}`, labelWidth / 2, y, {
          align: "center",
          maxWidth: maxNameWidth,
        });
      });
      doc.setTextColor(30, 30, 30);
    }

    // Barcode image - fixed size, centered vertically within remaining area
    const borderTop = borderPadding;
    const borderBottom = labelHeight - borderPadding;
    const borderLeft = borderPadding;
    const borderRight = labelWidth - borderPadding;
    const marginBottom = 5;

    let barcodeHeight = preferredBarcodeHeight;
    let barcodeWidth = (barcodeHeight / 50) * 150;
    const codeY = cursorY;

    const barcodeBottomLimit = Math.max(
      borderBottom - marginBottom - bottomExtra,
      borderTop + marginBottom
    );

    if (codeY + barcodeHeight > barcodeBottomLimit) {
      barcodeHeight = Math.max(
        25,
        borderBottom - codeY - marginBottom - bottomExtra
      );
      barcodeWidth = (barcodeHeight / 50) * 150;
    }

    let barcodeX = (labelWidth - barcodeWidth) / 2;
    if (barcodeX < borderLeft) {
      barcodeX = borderLeft;
      if (barcodeX + barcodeWidth > borderRight) {
        barcodeWidth = borderRight - borderLeft;
        barcodeHeight = (barcodeWidth / 150) * 50;
      }
    } else if (barcodeX + barcodeWidth > borderRight) {
      barcodeX = borderRight - barcodeWidth;
      if (barcodeX < borderLeft) {
        barcodeX = borderLeft;
        barcodeWidth = borderRight - borderLeft;
        barcodeHeight = (barcodeWidth / 150) * 50;
      }
    }

    doc.addImage(
      barcodeDataUrl,
      "PNG",
      barcodeX,
      codeY,
      barcodeWidth,
      barcodeHeight
    );

    // Save PDF
    const userDataPath = app.getPath("userData");
    const labelsDir = path.join(userDataPath, "labels");
    await fs.mkdir(labelsDir, { recursive: true });

    const fileName = `label_${item.code}_${Date.now()}.pdf`;
    const filePath = path.join(labelsDir, fileName);

    // Save PDF
    doc.save(filePath);

    logger.info(`Barcode label generated: ${filePath}`);

    return {
      success: true,
      filePath,
      fileName,
    };
  } catch (error) {
    logger.error("Error generating barcode label:", error);
    throw error;
  }
}

/**
 * Generate bulk labels PDF for multiple items
 * @param {Array<number>} itemIds - Array of item IDs
 * @param {Object} options - Options for bulk label generation
 * @returns {Promise<Object>} Object with success, filePath, fileName, labelCount, pdfBase64, etc.
 */
async function generateBulkLabelsPDF(itemIds, options = {}) {
  try {
    const jsPDFModule = require("jspdf");
    const jsPDF = jsPDFModule.jsPDF;
    const JsBarcode = require("jsbarcode");
    const { createCanvas } = require("canvas");

    if (!jsPDF || typeof jsPDF !== "function") {
      throw new Error(
        "jsPDF constructor not found. Please check jsPDF installation."
      );
    }

    const resolvedOptions = {
      paperWidth: 58,
      labelHeight: 46,
      spacing: 2,
      margin: 3,
      saveFile: true,
      previewPadding: 0,
      ...options,
    };

    const placeholders = itemIds.map(() => "?").join(",");
    const items = await database.query(
      `
      SELECT
        i.*,
        c.name AS category_name,
        s.name AS size_name,
        s.code AS size_code
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN item_sizes s ON i.size_id = s.id
      WHERE i.id IN (${placeholders})
      ORDER BY i.code
    `,
      itemIds
    );

    if (items.length === 0) {
      throw new Error("Tidak ada item yang ditemukan");
    }

    const {
      paperWidth,
      labelHeight,
      spacing,
      margin,
      saveFile,
      previewPadding,
    } = resolvedOptions;

    const totalHeight =
      margin * 2 +
      items.length * labelHeight +
      Math.max(0, items.length - 1) * spacing +
      2 +
      previewPadding;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [
        paperWidth,
        Math.max(totalHeight, labelHeight + margin * 2 + 2),
      ],
    });

    // Draw labels vertically to mimic a thermal roll
    let currentY = margin;

    for (const item of items) {
      const labelTop = currentY;
      const labelBottom = labelTop + labelHeight;
      const effectiveMargin =
        items.length === 1 ? Math.min(margin, 2) : margin;
      const contentWidth = paperWidth - effectiveMargin * 2;
      const centerX = paperWidth / 2;

      // Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, labelTop, paperWidth, labelHeight, "F");
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.rect(
        effectiveMargin / 2,
        labelTop + effectiveMargin / 2,
        paperWidth - effectiveMargin,
        labelHeight - effectiveMargin,
        "S"
      );

      const topPadding = Math.max(effectiveMargin + 2, 5) + 6;
      let cursorY = labelTop + topPadding;
      const maxNameLines = 2;
      const nameText = (item.name || "N/A").trim();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);

      const nameLines = doc
        .splitTextToSize(nameText, contentWidth - 2)
        .slice(0, maxNameLines);
      for (const line of nameLines) {
        doc.text(line, centerX, cursorY, { align: "center" });
        cursorY += 4.5;
      }

      // Price
      const displayPrice = item.sale_price || item.rental_price_per_day || 0;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 100, 0);
      doc.text(formatCurrency(displayPrice), centerX, cursorY, {
        align: "center",
      });
      cursorY += 5;

      // Size info
      const sizeLabel = (item.size_name || item.size_code || "").trim();
      if (sizeLabel) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(75, 75, 75);
        doc.text(`Ukuran: ${sizeLabel}`, centerX, cursorY, {
          align: "center",
        });
        cursorY += 6;
      }

      // Barcode area
      const barcodeSpacing = 5;
      const barcodeHeight = 20;
      const barcodeBottomLimit =
        labelBottom - effectiveMargin - barcodeHeight - 0.5;
      const barcodeTop = Math.min(
        Math.max(cursorY + barcodeSpacing, labelTop + topPadding + 1),
        barcodeBottomLimit
      );
      const barcodeWidth = contentWidth;
      const barcodeCanvas = createCanvas(400, 120);
      try {
        JsBarcode(barcodeCanvas, item.code, {
          format: "CODE128",
          width: 2.3,
          height: 70,
          displayValue: true,
          fontSize: 18,
          fontOptions: "bold",
          margin: 2,
        });
      } catch (barcodeError) {
        logger.error(
          `Error generating barcode for item ${item.id}:`,
          barcodeError
        );
      }
      const barcodeBuffer = barcodeCanvas.toBuffer("image/png");
      const barcodeDataUrl = `data:image/png;base64,${barcodeBuffer.toString(
        "base64"
      )}`;
      const maxBarcodeWidth = Math.max(contentWidth - 4, 1);
      const barcodeDrawWidth = Math.min(barcodeWidth, maxBarcodeWidth);
      doc.addImage(
        barcodeDataUrl,
        "PNG",
        effectiveMargin + (contentWidth - barcodeDrawWidth) / 2,
        barcodeTop,
        barcodeDrawWidth,
        barcodeHeight
      );

      currentY += labelHeight + spacing;
    }

    const pdfBase64 = doc.output("datauristring");
    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    let filePath = null;
    let fileName = null;
    if (saveFile) {
      const userDataPath = app.getPath("userData");
      const labelsDir = path.join(userDataPath, "labels");
      await fs.mkdir(labelsDir, { recursive: true });
      fileName = `bulk_labels_${Date.now()}.pdf`;
      filePath = path.join(labelsDir, fileName);
      await fs.writeFile(filePath, pdfBuffer);
      logger.info(
        `Generated bulk labels PDF with ${items.length} labels: ${filePath}`
      );
    } else {
      logger.info(
        `Generated bulk labels preview with ${items.length} labels`
      );
    }

    return {
      success: true,
      filePath,
      fileName,
      labelCount: items.length,
      pdfBase64,
      paperWidth,
      totalHeight: Math.max(totalHeight, labelHeight + margin * 2 + 2),
    };
  } catch (error) {
    logger.error("Error generating bulk labels PDF:", error);
    throw error;
  }
}

module.exports = {
  generateBarcodeLabel,
  generateBulkLabelsPDF,
};

