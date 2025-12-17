/**
 * Utility functions for loading and managing settings
 */
const fs = require("fs").promises;
const { getSettingsFile } = require("./pathUtils");
const logger = require("./logger");

/**
 * Load settings from file
 */
async function loadSettings() {
  try {
    const settingsFile = getSettingsFile();
    const data = await fs.readFile(settingsFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      // Get system timezone as default
      const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Return default settings if file doesn't exist
      return {
        companyName: "",
        companySubtitle: "",
        address: "",
        phone: "",
        printer: "",
        paperWidth: 80,
        thermalPaperSize: "80", // 58, 80, or custom
        thermalFontSize: "medium", // small, medium, large
        thermalPrintDensity: "normal", // light, normal, dark
      thermalAutoCut: false,
      useReceiptPrinterForLabels: true,
      autoPrint: true,
      taxPercentage: 0,
      timezone: systemTimezone, // Use system timezone as default
        sync: {
          autoSyncEnabled: false,
          autoSyncInterval: 300000, // Default: 5 minutes
        },
        receiptSettings: {
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
    }
    logger.warn("Could not load settings, using defaults:", error);
      // Get system timezone as default
      const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      return {
        companyName: "RIMS",
        companySubtitle: "",
        address: "-",
      phone: "-",
      paperWidth: 80,
      thermalPaperSize: "80",
      thermalFontSize: "medium",
      thermalPrintDensity: "normal",
      thermalAutoCut: false,
      useReceiptPrinterForLabels: true,
      timezone: systemTimezone, // Use system timezone as default
      sync: {
        autoSyncEnabled: false,
        autoSyncInterval: 300000, // Default: 5 minutes
      },
      receiptSettings: {
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
  }
}

module.exports = {
  loadSettings,
};




