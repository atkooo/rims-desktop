const { ipcMain } = require("electron");
const database = require("../helpers/database");
const logger = require("../helpers/logger");

function setupTransactionViewHandlers() {
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

  register(
    "transactions:getRentalsView",
    () => `
      SELECT
        rt.id,
        rt.customer_id,
        rt.transaction_code,
        c.name AS customer_name,
        u.full_name AS user_name,
        rt.rental_date,
        rt.planned_return_date,
        rt.actual_return_date,
        rt.total_days,
        rt.total_amount,
        rt.paid_amount,
        rt.payment_status,
        rt.status,
        rt.notes
      FROM rental_transactions rt
      LEFT JOIN customers c ON rt.customer_id = c.id
      LEFT JOIN users u ON rt.user_id = u.id
      ORDER BY rt.rental_date DESC
    `,
    "rental transactions",
  );

  register(
    "transactions:getRentalDetailsView",
    () => `
      SELECT
        rd.id,
        rt.transaction_code,
        i.name AS item_name,
        rd.quantity,
        rd.rental_price,
        rd.subtotal,
        rd.is_returned,
        rd.return_condition,
        rd.notes
      FROM rental_transaction_details rd
      LEFT JOIN rental_transactions rt ON rd.rental_transaction_id = rt.id
      LEFT JOIN items i ON rd.item_id = i.id
      ORDER BY rd.id DESC
    `,
    "rental transaction details",
  );

  register(
    "transactions:getSalesView",
    () => `
      SELECT
        st.id,
        st.customer_id,
        st.transaction_code,
        c.name AS customer_name,
        u.full_name AS user_name,
        st.sale_date,
        st.total_amount,
        st.paid_amount,
        st.payment_status,
        st.payment_method,
        st.notes
      FROM sales_transactions st
      LEFT JOIN customers c ON st.customer_id = c.id
      LEFT JOIN users u ON st.user_id = u.id
      ORDER BY st.sale_date DESC
    `,
    "sales transactions",
  );

  register(
    "transactions:getSalesDetailsView",
    () => `
      SELECT
        sd.id,
        st.transaction_code,
        i.name AS item_name,
        sd.quantity,
        sd.sale_price,
        sd.subtotal,
        sd.created_at
      FROM sales_transaction_details sd
      LEFT JOIN sales_transactions st ON sd.sales_transaction_id = st.id
      LEFT JOIN items i ON sd.item_id = i.id
      ORDER BY sd.id DESC
    `,
    "sales transaction details",
  );

  register(
    "transactions:getBookingsView",
    () => `
      SELECT
        b.id,
        b.booking_code,
        c.name AS customer_name,
        u.full_name AS user_name,
        i.name AS item_name,
        b.quantity,
        b.booking_date,
        b.planned_start_date,
        b.planned_end_date,
        b.estimated_price,
        b.deposit,
        b.status,
        b.notes
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN items i ON b.item_id = i.id
      ORDER BY b.booking_date DESC
    `,
    "bookings",
  );

  register(
    "transactions:getStockMovementsView",
    () => `
      SELECT
        sm.id,
        i.name AS item_name,
        sm.movement_type,
        sm.reference_type,
        sm.reference_id,
        sm.quantity,
        sm.stock_before,
        sm.stock_after,
        u.full_name AS user_name,
        sm.notes,
        sm.created_at
      FROM stock_movements sm
      LEFT JOIN items i ON sm.item_id = i.id
      LEFT JOIN users u ON sm.user_id = u.id
      ORDER BY sm.created_at DESC
    `,
    "stock movements",
  );

  register(
    "transactions:getPaymentsView",
    () => `
      SELECT
        p.id,
        p.transaction_type,
        p.transaction_id,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.reference_number,
        u.full_name AS user_name,
        p.notes
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.payment_date DESC
    `,
    "payments",
  );
}

module.exports = setupTransactionViewHandlers;
