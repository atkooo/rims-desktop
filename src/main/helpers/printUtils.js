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
 * @returns {Promise<{success: boolean, filePath: string, printer: string}>}
 */
async function printPDF(filePath, printerName, silent = false) {
  try {
    // Try using pdf-to-printer library first (better for direct printing)
    const ptp = require("pdf-to-printer");

    await ptp.print(filePath, {
      printer: printerName,
      silent: silent,
    });

    logger.info(`PDF printed to printer: ${printerName}`);
    return {
      success: true,
      filePath,
      printer: printerName,
    };
  } catch (ptpError) {
    // Fallback: Use Electron's webContents.print() method
    logger.warn(
      "pdf-to-printer failed, trying Electron print method:",
      ptpError,
    );

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
        return new Promise((resolve, reject) => {
          printWindow.webContents.print(
            {
              silent: silent,
              printBackground: true,
              deviceName: printerName,
            },
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




