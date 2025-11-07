const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");

function setupReportHandlers() {
  const registerView = (channel, sql, label) => {
    ipcMain.handle(channel, async () => {
      try {
        return await database.query(sql);
      } catch (error) {
        logger.error(`Error fetching ${label}:`, error);
        throw error;
      }
    });
  };

  registerView(
    "reports:getItemsWithStock",
    `
      SELECT id,
             code,
             name,
             category_name,
             stock_quantity,
             available_quantity,
             rented_quantity,
             rental_price_per_day,
             sale_price,
             is_active
      FROM v_items_with_stock
      ORDER BY name ASC
    `,
    "items with stock",
  );

  registerView(
    "reports:getActiveRentals",
    `
      SELECT id,
             transaction_code,
             customer_name,
             rental_date,
             planned_return_date,
             total_amount,
             status,
             days_overdue
      FROM v_active_rentals
      ORDER BY rental_date DESC
    `,
    "active rentals",
  );

  registerView(
    "reports:getDailySales",
    `
      SELECT sale_date,
             total_transactions,
             total_sales,
             total_discount
      FROM v_daily_sales
      ORDER BY sale_date DESC
    `,
    "daily sales",
  );

  registerView(
    "reports:getStockAlerts",
    `
      SELECT id,
             code,
             name,
             stock_quantity,
             min_stock_alert
      FROM v_stock_alerts
      ORDER BY stock_quantity ASC
    `,
    "stock alerts",
  );

  registerView(
    "reports:getTopCustomers",
    `
      SELECT name,
             phone,
             total_transactions
      FROM v_top_customers
      ORDER BY total_transactions DESC
    `,
    "top customers",
  );
}

module.exports = setupReportHandlers;
