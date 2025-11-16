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
      // Return default settings if file doesn't exist
      return {
        companyName: "",
        address: "",
        phone: "",
        printer: "",
        paperWidth: 80,
        autoPrint: true,
        taxPercentage: 0,
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
    }
    logger.warn("Could not load settings, using defaults:", error);
    return {
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
  }
}

module.exports = {
  loadSettings,
};






