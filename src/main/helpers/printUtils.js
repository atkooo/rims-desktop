/**
 * Utility functions for printing PDFs
 */
const { BrowserWindow, shell } = require("electron");
const logger = require("./logger");

/**
 * Print PDF to specific printer
 * @param {string} filePath - Path to PDF file
 * @param {string} printerName - Name of printer
 * @param {boolean} silent - Silent print mode
 * @param {object} thermalOptions - Thermal printer options (paperSize, autoCut, etc.)
 * @returns {Promise<{success: boolean, filePath: string, printer: string}>}
 */
async function printPDF(filePath, printerName, silent = false, thermalOptions = {}) {
  // For thermal printers, prefer Electron print API for better quality control
  // pdf-to-printer may not handle grayscale/quality settings well for thermal printers
  const isThermalPrinter = thermalOptions.paperSize || thermalOptions.printDensity;
  
  if (!isThermalPrinter) {
    // For non-thermal printers, try pdf-to-printer first
    try {
      const ptp = require("pdf-to-printer");

      // Build print options
      const printOptions = {
        printer: printerName,
        silent: silent,
      };

      // Add paper size if specified
      if (thermalOptions.paperSize) {
        if (thermalOptions.paperSize === "58") {
          printOptions.paperSize = "A4"; // Fallback, actual size comes from PDF
        } else if (thermalOptions.paperSize === "80") {
          printOptions.paperSize = "A4"; // Fallback, actual size comes from PDF
        }
      }

      await ptp.print(filePath, printOptions);

      logger.info(`PDF printed to printer: ${printerName}`);
      return {
        success: true,
        filePath,
        printer: printerName,
      };
    } catch (ptpError) {
      logger.warn(
        "pdf-to-printer failed, trying Electron print method:",
        ptpError,
      );
    }
  } else {
    // For thermal printers, skip pdf-to-printer and use Electron print API directly
    // This gives us better control over grayscale and quality settings
    logger.info("Using Electron print API for thermal printer with quality optimization");
  }

  // Use Electron's webContents.print() method (primary for thermal, fallback for others)
  try {
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
        const normalizedPath = filePath.replace(/\\/g, "/");
        await printWindow.loadURL(`file://${normalizedPath}`);

        // Wait for PDF to load
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve(); // Resolve even on timeout to continue
          }, 3000);

          printWindow.webContents.once("did-finish-load", () => {
            clearTimeout(timeout);
            setTimeout(resolve, 1000); // Give PDF viewer time to render
          });
        });

        // Print to specific printer using Electron's print API
        // Configure print options for thermal printer quality
        // For thermal printers, we need grayscale mode and optimized settings
        const printOptions = {
          silent: silent,
          printBackground: true, // Important: print background graphics for better contrast
          deviceName: printerName,
          color: false, // CRITICAL: Use grayscale for thermal printer (produces sharper, darker output)
          margins: {
            marginType: "none", // No margins for thermal printer
          },
          // Additional settings for better quality
          pagesPerSheet: 1,
          collate: false,
          copies: 1,
        };

        // Log print density setting for debugging
        if (thermalOptions.printDensity) {
          logger.info(`Printing with density: ${thermalOptions.printDensity}`);
          // Note: Electron print API doesn't have direct density control,
          // but using grayscale (color: false) and printBackground: true
          // should produce better contrast for thermal printers
        }

        return new Promise((resolve, reject) => {
          printWindow.webContents.print(
            printOptions,
            (success, errorType) => {
              // Close print window after printing
              setTimeout(() => {
                if (!printWindow.isDestroyed()) {
                  printWindow.close();
                }
              }, 1000);

              if (success) {
                logger.info(`PDF printed to printer: ${printerName}`);
                resolve({
                  success: true,
                  filePath,
                  printer: printerName,
                });
              } else {
                logger.error(`Print failed: ${errorType}`);
                reject(
                  new Error(
                    `Gagal mencetak: ${errorType || "Unknown error"}`,
                  ),
                );
              }
            },
          );
        });
      } catch (printError) {
        if (!printWindow.isDestroyed()) {
          printWindow.close();
        }
        throw printError;
      }
  } catch (electronPrintError) {
    logger.error(
      "Electron print method also failed:",
      electronPrintError,
    );
    // Final fallback: open PDF viewer
    await shell.openPath(filePath);
    throw new Error(
      `Gagal mencetak ke printer ${printerName}. PDF dibuka di viewer untuk print manual.`,
    );
  }
}

/**
 * Open PDF in default viewer
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<{success: boolean, filePath: string}>}
 */
async function openPDF(filePath) {
  await shell.openPath(filePath);
  return { success: true, filePath };
}

module.exports = {
  printPDF,
  openPDF,
};






