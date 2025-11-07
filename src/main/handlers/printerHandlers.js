const { ipcMain } = require("electron");
const logger = require("../helpers/logger");
const { getSettings } = require("./settingsHandlers");
const escpos = require("escpos");
// Register USB adapter
escpos.USB = require("escpos-usb");

function setupPrinterHandlers() {
  // Print receipt
  ipcMain.handle("printer:printReceipt", async (event, data) => {
    try {
      const settings = await getSettings();
      const device = new escpos.USB();
      const options = { encoding: "GB18030" };
      const printer = new escpos.Printer(device, options);

      device.open(function (error) {
        if (error) {
          logger.error("Printer error:", error);
          throw error;
        }

        printer
          // Header
          .align("ct")
          .style("b")
          .size(1, 1)
          .text(settings.companyName)
          .style("normal")
          .size(0, 0)
          .text(settings.address)
          .text(settings.phone)
          .text("--------------------------------")

          // Transaction Info
          .align("lt")
          .text(`No: ${data.transactionId}`)
          .text(`Tanggal: ${new Date(data.date).toLocaleString()}`)
          .text(`Customer: ${data.customerName}`)
          .text("--------------------------------")

          // Items
          .tableCustom([
            { text: "Item", width: 0.4 },
            { text: "Qty", width: 0.2, align: "RIGHT" },
            { text: "Harga", width: 0.4, align: "RIGHT" },
          ]);

        data.items
          .forEach((item) => {
            printer.tableCustom([
              { text: item.name, width: 0.4 },
              { text: item.quantity.toString(), width: 0.2, align: "RIGHT" },
              {
                text: formatCurrency(item.price * item.quantity),
                width: 0.4,
                align: "RIGHT",
              },
            ]);
          })

          // Total
          .text("--------------------------------")
          .align("rt")
          .text(`Total: ${formatCurrency(data.totalAmount)}`)

          // Footer
          .align("ct")
          .text("--------------------------------")
          .text("Terima Kasih")
          .text("Silahkan datang kembali")
          .cut()
          .close();
      });

      return true;
    } catch (error) {
      logger.error("Error printing receipt:", error);
      throw error;
    }
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

module.exports = setupPrinterHandlers;
