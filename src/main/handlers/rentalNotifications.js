const { ipcMain, Notification } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");

function setupRentalNotifications() {
  // Check overdue rentals every hour
  setInterval(checkOverdueRentals, 1000 * 60 * 60);

  // Also expose as IPC handler for manual checks
  ipcMain.handle("rentals:checkOverdue", async () => {
    return await checkOverdueRentals();
  });
}

async function checkOverdueRentals() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Get rentals that are due today or overdue
    const overdueRentals = await database.query(
      `
            SELECT t.*, 
                   GROUP_CONCAT(ti.item_id) as item_ids,
                   GROUP_CONCAT(i.name) as item_names,
                   t.expected_return_date
            FROM transactions t
            JOIN transaction_items ti ON t.id = ti.transaction_id
            JOIN items i ON ti.item_id = i.id
            WHERE t.type = 'RENTAL'
            AND t.status = 'ACTIVE'
            AND t.expected_return_date <= ?
            GROUP BY t.id
        `,
      [today]
    );

    // Send notifications for each overdue rental
    overdueRentals.forEach((rental) => {
      const daysOverdue = calculateDaysOverdue(rental.expected_return_date);
      const itemNames = rental.item_names.split(",").join(", ");

      // Show system notification
      new Notification({
        title: `Rental Jatuh Tempo${daysOverdue > 0 ? " - " + daysOverdue + " hari" : ""}`,
        body: `Customer: ${rental.customerName}\nItems: ${itemNames}`,
      }).show();

      // Log the notification
      logger.info("Rental overdue notification sent:", {
        transactionId: rental.id,
        customerName: rental.customerName,
        daysOverdue,
      });
    });

    return overdueRentals;
  } catch (error) {
    logger.error("Error checking overdue rentals:", error);
    throw error;
  }
}

function calculateDaysOverdue(expectedDate) {
  const today = new Date();
  const expected = new Date(expectedDate);
  const diffTime = today - expected;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

module.exports = setupRentalNotifications;
