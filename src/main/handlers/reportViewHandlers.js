const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");
const reportQueries = require("../helpers/reportQueries");

function setupReportViewHandlers() {
  const register = (channel, sqlBuilder, label) => {
    ipcMain.handle(channel, async () => {
      try {
        const sql =
          typeof sqlBuilder === "function" ? sqlBuilder() : sqlBuilder;
        return await database.query(sql);
      } catch (error) {
        logger.error(`Error fetching ${label}:`, error);
        throw error;
      }
    });
  };

  // Combined transactions report (rental + sales)
  register(
    "reports:getTransactionsView",
    reportQueries.getTransactionsViewQuery,
    "transactions report",
  );

  // Rental Transactions Report (specific)
  register(
    "reports:getRentalTransactions",
    reportQueries.getRentalTransactionsQuery,
    "rental transactions report",
  );

  // Sales Transactions Report (specific)
  register(
    "reports:getSalesTransactions",
    reportQueries.getSalesTransactionsQuery,
    "sales transactions report",
  );

  // Daily Revenue Report
  register(
    "reports:getDailyRevenue",
    reportQueries.getDailyRevenueQuery,
    "daily revenue report",
  );

  // Revenue by Cashier Report
  register(
    "reports:getRevenueByCashier",
    reportQueries.getRevenueByCashierQuery,
    "revenue by cashier report",
  );

  // Payments Report
  register(
    "reports:getPayments",
    reportQueries.getPaymentsQuery,
    "payments report",
  );

  // Net Profit Report
  register(
    "reports:getNetProfitReport",
    reportQueries.getNetProfitReportQuery,
    "net profit report",
  );

  // Transactions by Customer Report
  register(
    "reports:getTransactionsByCustomer",
    () => `
      SELECT
        c.id AS customer_id,
        c.code AS customer_code,
        c.name AS customer_name,
        c.phone,
        c.email,
        COUNT(DISTINCT rt.id) AS rental_count,
        COUNT(DISTINCT st.id) AS sales_count,
        COUNT(DISTINCT rt.id) + COUNT(DISTINCT st.id) AS total_transactions,
        COALESCE(SUM(rt.total_amount), 0) AS total_rental_amount,
        COALESCE(SUM(st.total_amount), 0) AS total_sales_amount,
        COALESCE(SUM(rt.total_amount), 0) + COALESCE(SUM(st.total_amount), 0) AS total_amount,
        COALESCE(SUM(CASE WHEN p1.transaction_type = 'rental' THEN p1.amount ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN p2.transaction_type = 'sale' THEN p2.amount ELSE 0 END), 0) AS total_paid
      FROM customers c
      LEFT JOIN rental_transactions rt ON rt.customer_id = c.id
      LEFT JOIN sales_transactions st ON st.customer_id = c.id
      LEFT JOIN rental_payments p1 ON p1.transaction_id = rt.id
      LEFT JOIN sales_payments p2 ON p2.transaction_id = st.id
      GROUP BY c.id
      HAVING total_transactions > 0
      ORDER BY total_amount DESC
    `,
    "transactions by customer report",
  );

  // Stock Items Report
  register(
    "reports:getStockItems",
    reportQueries.getStockItemsQuery,
    "stock items report",
  );

  // Stock Accessories Report
  register(
    "reports:getStockAccessories",
    reportQueries.getStockAccessoriesQuery,
    "stock accessories report",
  );

  // Stock Bundles Report
  register(
    "reports:getStockBundles",
    reportQueries.getStockBundlesQuery,
    "stock bundles report",
  );

  // Stock Movements Report
  register(
    "reports:getStockMovements",
    reportQueries.getStockMovementsQuery,
    "stock movements report",
  );

  // Low Stock Alert Report
  register(
    "reports:getLowStockAlert",
    reportQueries.getLowStockAlertQuery,
    "low stock alert report",
  );

  // Stock by Category Report
  register(
    "reports:getStockByCategory",
    reportQueries.getStockByCategoryQuery,
    "stock by category report",
  );

  // Stock report with comprehensive information
  register(
    "reports:getStockView",
    reportQueries.getStockReportQuery,
    "stock report",
  );
}

module.exports = setupReportViewHandlers;

