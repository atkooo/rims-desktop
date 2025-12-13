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
        rt.subtotal,
        rt.deposit,
        rt.tax,
        rt.total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        CASE 
          WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
          ELSE 'unpaid'
        END as payment_status,
        rt.status,
        rt.notes,
        rt.cashier_session_id,
        cs.session_code AS cashier_session_code
      FROM rental_transactions rt
      LEFT JOIN customers c ON rt.customer_id = c.id
      LEFT JOIN users u ON rt.user_id = u.id
      LEFT JOIN cashier_sessions cs ON rt.cashier_session_id = cs.id
      LEFT JOIN rental_payments p ON p.transaction_id = rt.id
      GROUP BY rt.id
      ORDER BY rt.rental_date DESC
    `,
    "rental transactions",
  );

  register(
    "transactions:getRentalDetailsView",
    () => `
      SELECT
        rd.id,
        rd.rental_transaction_id,
        rd.item_id,
        rt.transaction_code,
        i.name AS item_name,
        i.code AS item_code,
        rd.quantity,
        rd.rental_price,
        rd.subtotal,
        rd.is_returned,
        rd.return_condition,
        rd.notes,
        rd.created_at
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
        st.subtotal,
        st.discount,
        st.tax,
        st.total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        CASE 
          WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
          ELSE 'unpaid'
        END as payment_status,
        COALESCE(st.status, 'pending') as status,
        st.notes,
        st.cashier_session_id,
        cs.session_code AS cashier_session_code
      FROM sales_transactions st
      LEFT JOIN customers c ON st.customer_id = c.id
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN cashier_sessions cs ON st.cashier_session_id = cs.id
      LEFT JOIN sales_payments p ON p.transaction_id = st.id
      GROUP BY st.id
      ORDER BY st.sale_date DESC
    `,
    "sales transactions",
  );

  register(
    "transactions:getSalesDetailsView",
    () => `
      SELECT
        sd.id,
        sd.sales_transaction_id,
        sd.item_id,
        sd.accessory_id,
        st.transaction_code,
        COALESCE(i.name, a.name) AS item_name,
        COALESCE(i.code, a.code) AS item_code,
        CASE WHEN sd.item_id IS NOT NULL THEN 'item' ELSE 'accessory' END AS item_type,
        CASE WHEN sd.item_id IS NOT NULL THEN 'Item' ELSE 'Aksesoris' END AS item_type_label,
        sd.quantity,
        sd.sale_price,
        sd.subtotal,
        sd.created_at
      FROM sales_transaction_details sd
      LEFT JOIN sales_transactions st ON sd.sales_transaction_id = st.id
      LEFT JOIN items i ON sd.item_id = i.id
      LEFT JOIN accessories a ON sd.accessory_id = a.id
      ORDER BY sd.id DESC
    `,
    "sales transaction details",
  );

  register(
    "transactions:getStockMovementsView",
    () => `
      SELECT
        sm.id,
        COALESCE(i.name, a.name, b.name) AS item_name,
        COALESCE(i.code, a.code, b.code) AS product_code,
        CASE 
          WHEN sm.item_id IS NOT NULL THEN 'Item'
          WHEN sm.accessory_id IS NOT NULL THEN 'Aksesoris'
          WHEN sm.bundle_id IS NOT NULL THEN 'Paket/Bundle'
          ELSE 'Unknown'
        END AS product_type,
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
      LEFT JOIN accessories a ON sm.accessory_id = a.id
      LEFT JOIN bundles b ON sm.bundle_id = b.id
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
        'rental' as transaction_type,
        p.transaction_id,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.reference_number,
        u.full_name AS user_name,
        p.notes
      FROM rental_payments p
      LEFT JOIN users u ON p.user_id = u.id
      UNION ALL
      SELECT
        p.id,
        'sale' as transaction_type,
        p.transaction_id,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.reference_number,
        u.full_name AS user_name,
        p.notes
      FROM sales_payments p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY payment_date DESC
    `,
    "payments",
  );
}

module.exports = setupTransactionViewHandlers;
