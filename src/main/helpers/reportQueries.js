/**
 * Shared SQL queries for reports
 * Used by both reportViewHandlers and reportExportHandlers to avoid duplication
 */

function getTransactionsViewQuery() {
  return `
    SELECT 
      id,
      transaction_code,
      transaction_type,
      customer_id,
      customer_name,
      user_name,
      transaction_date,
      planned_return_date,
      actual_return_date,
      total_days,
      subtotal,
      deposit,
      tax,
      total_amount,
      paid_amount,
      payment_status,
      status,
      notes,
      cashier_session_id,
      cashier_session_code,
      created_at
    FROM (
      SELECT
        rt.id,
        rt.transaction_code,
        'rental' AS transaction_type,
        rt.customer_id,
        c.name AS customer_name,
        u.full_name AS user_name,
        rt.rental_date AS transaction_date,
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
        cs.session_code AS cashier_session_code,
        rt.created_at
      FROM rental_transactions rt
      LEFT JOIN customers c ON rt.customer_id = c.id
      LEFT JOIN users u ON rt.user_id = u.id
      LEFT JOIN cashier_sessions cs ON rt.cashier_session_id = cs.id
      LEFT JOIN rental_payments p ON p.transaction_id = rt.id
      GROUP BY rt.id
      
      UNION ALL
      
      SELECT
        st.id,
        st.transaction_code,
        'sale' AS transaction_type,
        st.customer_id,
        c.name AS customer_name,
        u.full_name AS user_name,
        st.sale_date AS transaction_date,
        NULL AS planned_return_date,
        NULL AS actual_return_date,
        NULL AS total_days,
        st.subtotal,
        NULL AS deposit,
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
        cs.session_code AS cashier_session_code,
        st.created_at
      FROM sales_transactions st
      LEFT JOIN customers c ON st.customer_id = c.id
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN cashier_sessions cs ON st.cashier_session_id = cs.id
      LEFT JOIN sales_payments p ON p.transaction_id = st.id
      GROUP BY st.id
    )
    ORDER BY transaction_date DESC
  `;
}

function getRentalTransactionsQuery() {
  return `
    SELECT
      rt.id,
      rt.transaction_code,
      rt.customer_id,
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
      cs.session_code AS cashier_session_code,
      rt.created_at
    FROM rental_transactions rt
    LEFT JOIN customers c ON rt.customer_id = c.id
    LEFT JOIN users u ON rt.user_id = u.id
    LEFT JOIN cashier_sessions cs ON rt.cashier_session_id = cs.id
    LEFT JOIN rental_payments p ON p.transaction_id = rt.id
    GROUP BY rt.id
    ORDER BY rt.rental_date DESC
  `;
}

function getSalesTransactionsQuery() {
  return `
    SELECT
      st.id,
      st.transaction_code,
      st.customer_id,
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
      cs.session_code AS cashier_session_code,
      st.created_at
    FROM sales_transactions st
    LEFT JOIN customers c ON st.customer_id = c.id
    LEFT JOIN users u ON st.user_id = u.id
    LEFT JOIN cashier_sessions cs ON st.cashier_session_id = cs.id
    LEFT JOIN sales_payments p ON p.transaction_id = st.id
    GROUP BY st.id
    ORDER BY st.sale_date DESC
  `;
}

function getDailyRevenueQuery() {
  return `
    SELECT
      date(transaction_date) AS revenue_date,
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN transaction_type = 'rental' THEN 1 ELSE 0 END) AS rental_count,
      SUM(CASE WHEN transaction_type = 'sale' THEN 1 ELSE 0 END) AS sales_count,
      SUM(total_amount) AS total_revenue,
      SUM(CASE WHEN transaction_type = 'rental' THEN total_amount ELSE 0 END) AS rental_revenue,
      SUM(CASE WHEN transaction_type = 'sale' THEN total_amount ELSE 0 END) AS sales_revenue,
      SUM(paid_amount) AS total_paid,
      SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
      SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid_count
    FROM (
      SELECT
        rt.rental_date AS transaction_date,
        'rental' AS transaction_type,
        rt.total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        CASE 
          WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
          ELSE 'unpaid'
        END as payment_status
      FROM rental_transactions rt
      LEFT JOIN rental_payments p ON p.transaction_id = rt.id
      GROUP BY rt.id
      
      UNION ALL
      
      SELECT
        st.sale_date AS transaction_date,
        'sale' AS transaction_type,
        st.total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        CASE 
          WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
          ELSE 'unpaid'
        END as payment_status
      FROM sales_transactions st
      LEFT JOIN sales_payments p ON p.transaction_id = st.id
      GROUP BY st.id
    )
    GROUP BY date(transaction_date)
    ORDER BY revenue_date DESC
  `;
}

function getRevenueByCashierQuery() {
  return `
    SELECT
      cs.id AS cashier_session_id,
      cs.session_code,
      u.full_name AS cashier_name,
      u.username,
      date(cs.opening_date) AS session_date,
      cs.opening_balance,
      COALESCE(cs.closing_balance, 0) AS closing_balance,
      COALESCE(cs.expected_balance, cs.opening_balance) AS expected_balance,
      (COALESCE(cs.closing_balance, 0) - cs.opening_balance) AS actual_revenue,
      (COALESCE(cs.expected_balance, cs.opening_balance) - cs.opening_balance) AS expected_revenue,
      (COALESCE(cs.closing_balance, 0) - COALESCE(cs.expected_balance, cs.opening_balance)) AS difference,
      COUNT(DISTINCT rt.id) AS rental_count,
      COUNT(DISTINCT st.id) AS sales_count,
      COALESCE(SUM(rt.total_amount), 0) AS rental_total,
      COALESCE(SUM(st.total_amount), 0) AS sales_total,
      COALESCE(SUM(rt.total_amount), 0) + COALESCE(SUM(st.total_amount), 0) AS total_revenue,
      cs.status,
      cs.opening_date,
      cs.closing_date
    FROM cashier_sessions cs
    LEFT JOIN users u ON cs.user_id = u.id
    LEFT JOIN rental_transactions rt ON rt.cashier_session_id = cs.id
    LEFT JOIN sales_transactions st ON st.cashier_session_id = cs.id
    GROUP BY cs.id
    ORDER BY cs.opening_date DESC
  `;
}

function getPaymentsQuery() {
  return `
    SELECT
      p.id,
      p.transaction_type,
      p.transaction_id,
      COALESCE(rt.transaction_code, st.transaction_code) AS transaction_code,
      COALESCE(c1.name, c2.name) AS customer_name,
      p.payment_date,
      p.amount,
      p.payment_method,
      p.reference_number,
      u.full_name AS user_name,
      p.notes,
      COALESCE(cs1.session_code, cs2.session_code) AS cashier_session_code
    FROM (
      SELECT 
        p.id,
        'rental' as transaction_type,
        p.transaction_id,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.reference_number,
        p.user_id,
        p.notes,
        rt.cashier_session_id
      FROM rental_payments p
      LEFT JOIN rental_transactions rt ON p.transaction_id = rt.id
      UNION ALL
      SELECT 
        p.id,
        'sale' as transaction_type,
        p.transaction_id,
        p.payment_date,
        p.amount,
        p.payment_method,
        p.reference_number,
        p.user_id,
        p.notes,
        st.cashier_session_id
      FROM sales_payments p
      LEFT JOIN sales_transactions st ON p.transaction_id = st.id
    ) p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN rental_transactions rt ON p.transaction_type = 'rental' AND p.transaction_id = rt.id
    LEFT JOIN sales_transactions st ON p.transaction_type = 'sale' AND p.transaction_id = st.id
    LEFT JOIN customers c1 ON rt.customer_id = c1.id
    LEFT JOIN customers c2 ON st.customer_id = c2.id
    LEFT JOIN cashier_sessions cs1 ON rt.cashier_session_id = cs1.id
    LEFT JOIN cashier_sessions cs2 ON st.cashier_session_id = cs2.id
    ORDER BY p.payment_date DESC
  `;
}

function getFinanceReportQuery() {
  return `
    SELECT
      date(transaction_date) AS report_date,
      SUM(total_amount) AS total_revenue,
      SUM(paid_amount) AS total_paid,
      SUM(total_amount - paid_amount) AS total_unpaid,
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
      SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid_count
    FROM (
      SELECT
        rt.rental_date AS transaction_date,
        rt.total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        CASE 
          WHEN COALESCE(SUM(p.amount), 0) >= rt.total_amount THEN 'paid'
          ELSE 'unpaid'
        END as payment_status
      FROM rental_transactions rt
      LEFT JOIN rental_payments p ON p.transaction_id = rt.id
      GROUP BY rt.id
      
      UNION ALL
      
      SELECT
        st.sale_date AS transaction_date,
        st.total_amount,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        CASE 
          WHEN COALESCE(SUM(p.amount), 0) >= st.total_amount THEN 'paid'
          ELSE 'unpaid'
        END as payment_status
      FROM sales_transactions st
      LEFT JOIN sales_payments p ON p.transaction_id = st.id
      GROUP BY st.id
    )
    GROUP BY date(transaction_date)
    ORDER BY report_date DESC
  `;
}

function getNetProfitReportQuery() {
  return `
    SELECT
      st.transaction_code AS kode_transaksi,
      st.sale_date AS tanggal_penjualan,
      c.name AS nama_pelanggan,
      u.full_name AS nama_kasir,
      CASE 
        WHEN std.item_id IS NOT NULL THEN 'Item'
        WHEN std.accessory_id IS NOT NULL THEN 'Aksesoris'
        ELSE 'Unknown'
      END AS tipe_produk,
      COALESCE(i.code, a.code) AS kode_produk,
      COALESCE(i.name, a.name) AS nama_produk,
      std.quantity AS jumlah,
      std.sale_price AS harga_jual,
      COALESCE(i.purchase_price, a.purchase_price, 0) AS harga_beli,
      (std.sale_price - COALESCE(i.purchase_price, a.purchase_price, 0)) AS laba_per_unit,
      (std.sale_price - COALESCE(i.purchase_price, a.purchase_price, 0)) * std.quantity AS laba_total,
      std.subtotal AS subtotal_penjualan,
      COALESCE(st.status, 'pending') AS status
    FROM sales_transactions st
    JOIN sales_transaction_details std ON std.sales_transaction_id = st.id
    LEFT JOIN items i ON std.item_id = i.id
    LEFT JOIN accessories a ON std.accessory_id = a.id
    LEFT JOIN customers c ON st.customer_id = c.id
    LEFT JOIN users u ON st.user_id = u.id
    ORDER BY st.sale_date DESC, st.transaction_code DESC
  `;
}

function getStockReportQuery() {
  return `
    SELECT
      i.id,
      i.code,
      i.name,
      c.name AS category_name,
      'item' AS product_type,
      i.stock_quantity,
      i.available_quantity,
      (i.stock_quantity - i.available_quantity) AS rented_quantity,
      i.rental_price_per_day,
      i.sale_price,
      i.min_stock_alert,
      i.is_active,
      (
        SELECT sm.created_at 
        FROM stock_movements sm 
        WHERE sm.item_id = i.id 
        ORDER BY sm.created_at DESC 
        LIMIT 1
      ) AS last_movement_date,
      (
        SELECT COUNT(*) 
        FROM stock_movements sm 
        WHERE sm.item_id = i.id
      ) AS total_movements,
      i.created_at,
      i.updated_at
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    
    UNION ALL
    
    SELECT
      a.id,
      a.code,
      a.name,
      'Aksesoris' AS category_name,
      'accessory' AS product_type,
      a.stock_quantity,
      a.available_quantity,
      0 AS rented_quantity,
      a.rental_price_per_day,
      a.sale_price,
      a.min_stock_alert,
      a.is_active,
      (
        SELECT sm.created_at 
        FROM stock_movements sm 
        WHERE sm.accessory_id = a.id 
        ORDER BY sm.created_at DESC 
        LIMIT 1
      ) AS last_movement_date,
      (
        SELECT COUNT(*) 
        FROM stock_movements sm 
        WHERE sm.accessory_id = a.id
      ) AS total_movements,
      a.created_at,
      a.updated_at
    FROM accessories a
    
    UNION ALL
    
    SELECT
      b.id,
      b.code,
      b.name,
      'Paket/Bundle' AS category_name,
      'bundle' AS product_type,
      b.stock_quantity,
      b.available_quantity,
      0 AS rented_quantity,
      b.rental_price_per_day,
      NULL AS sale_price,
      0 AS min_stock_alert,
      b.is_active,
      NULL AS last_movement_date,
      0 AS total_movements,
      b.created_at,
      b.updated_at
    FROM bundles b
    
    ORDER BY product_type, name ASC
  `;
}

function getStockItemsQuery() {
  return `
    SELECT
      i.id,
      i.code,
      i.name,
      c.name AS category_name,
      i.stock_quantity,
      i.available_quantity,
      (i.stock_quantity - i.available_quantity) AS rented_quantity,
      i.rental_price_per_day,
      i.sale_price,
      i.min_stock_alert,
      i.is_active,
      (
        SELECT sm.created_at 
        FROM stock_movements sm 
        WHERE sm.item_id = i.id 
        ORDER BY sm.created_at DESC 
        LIMIT 1
      ) AS last_movement_date,
      (
        SELECT COUNT(*) 
        FROM stock_movements sm 
        WHERE sm.item_id = i.id
      ) AS total_movements,
      i.created_at,
      i.updated_at
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY i.name ASC
  `;
}

function getStockAccessoriesQuery() {
  return `
    SELECT
      a.id,
      a.code,
      a.name,
      'Aksesoris' AS category_name,
      a.stock_quantity,
      a.available_quantity,
      0 AS rented_quantity,
      a.rental_price_per_day,
      a.sale_price,
      a.min_stock_alert,
      a.is_active,
      (
        SELECT sm.created_at 
        FROM stock_movements sm 
        WHERE sm.accessory_id = a.id 
        ORDER BY sm.created_at DESC 
        LIMIT 1
      ) AS last_movement_date,
      (
        SELECT COUNT(*) 
        FROM stock_movements sm 
        WHERE sm.accessory_id = a.id
      ) AS total_movements,
      a.created_at,
      a.updated_at
    FROM accessories a
    ORDER BY a.name ASC
  `;
}

function getStockBundlesQuery() {
  return `
    SELECT
      b.id,
      b.code,
      b.name,
      'Paket/Bundle' AS category_name,
      b.stock_quantity,
      b.available_quantity,
      0 AS rented_quantity,
      b.rental_price_per_day,
      NULL AS sale_price,
      0 AS min_stock_alert,
      b.is_active,
      NULL AS last_movement_date,
      0 AS total_movements,
      b.created_at,
      b.updated_at
    FROM bundles b
    ORDER BY b.name ASC
  `;
}

function getStockMovementsQuery() {
  return `
    SELECT
      sm.id,
      COALESCE(i.name, a.name, b.name) AS product_name,
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
  `;
}

function getLowStockAlertQuery() {
  return `
    SELECT
      id,
      code,
      name,
      category_name,
      'item' AS product_type,
      stock_quantity,
      available_quantity,
      min_stock_alert,
      (min_stock_alert - stock_quantity) AS shortage,
      is_active
    FROM (
      SELECT
        i.id,
        i.code,
        i.name,
        c.name AS category_name,
        i.stock_quantity,
        i.available_quantity,
        i.min_stock_alert,
        i.is_active
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.is_active = 1
        AND i.stock_quantity <= i.min_stock_alert
        AND i.min_stock_alert > 0
      
      UNION ALL
      
      SELECT
        a.id,
        a.code,
        a.name,
        'Aksesoris' AS category_name,
        a.stock_quantity,
        a.available_quantity,
        a.min_stock_alert,
        a.is_active
      FROM accessories a
      WHERE a.is_active = 1
        AND a.stock_quantity <= a.min_stock_alert
        AND a.min_stock_alert > 0
    )
    ORDER BY shortage DESC, name ASC
  `;
}

function getStockByCategoryQuery() {
  return `
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      COUNT(DISTINCT i.id) AS item_count,
      SUM(i.stock_quantity) AS total_stock,
      SUM(i.available_quantity) AS total_available,
      SUM(i.stock_quantity - i.available_quantity) AS total_rented,
      AVG(i.rental_price_per_day) AS avg_rental_price,
      AVG(i.sale_price) AS avg_sale_price,
      SUM(CASE WHEN i.stock_quantity <= i.min_stock_alert AND i.min_stock_alert > 0 THEN 1 ELSE 0 END) AS low_stock_count
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id AND i.is_active = 1
    GROUP BY c.id, c.name
    HAVING item_count > 0
    ORDER BY total_stock DESC
  `;
}

module.exports = {
  getTransactionsViewQuery,
  getRentalTransactionsQuery,
  getSalesTransactionsQuery,
  getDailyRevenueQuery,
  getRevenueByCashierQuery,
  getPaymentsQuery,
  getFinanceReportQuery,
  getNetProfitReportQuery,
  getStockReportQuery,
  getStockItemsQuery,
  getStockAccessoriesQuery,
  getStockBundlesQuery,
  getStockMovementsQuery,
  getLowStockAlertQuery,
  getStockByCategoryQuery,
};

