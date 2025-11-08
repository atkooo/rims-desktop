-- Migration: Create reporting views
PRAGMA foreign_keys = ON;

-- Items with stock overview
CREATE VIEW IF NOT EXISTS v_items_with_stock AS
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
  i.is_active
FROM items i
LEFT JOIN categories c ON c.id = i.category_id;

-- Active/overdue rentals with days overdue
CREATE VIEW IF NOT EXISTS v_active_rentals AS
SELECT
  rt.id,
  rt.transaction_code,
  c.name AS customer_name,
  rt.rental_date,
  rt.planned_return_date,
  rt.total_amount,
  rt.status,
  CASE
    WHEN julianday('now') > julianday(rt.planned_return_date)
      THEN CAST(julianday('now') - julianday(rt.planned_return_date) AS INTEGER)
    ELSE 0
  END AS days_overdue
FROM rental_transactions rt
LEFT JOIN customers c ON c.id = rt.customer_id
WHERE rt.status IN ('active','overdue');

-- Daily sales aggregation
CREATE VIEW IF NOT EXISTS v_daily_sales AS
SELECT
  date(st.sale_date) AS sale_date,
  COUNT(*) AS total_transactions,
  COALESCE(SUM(st.total_amount), 0) AS total_sales,
  COALESCE(SUM(st.discount), 0) AS total_discount
FROM sales_transactions st
GROUP BY date(st.sale_date);

-- Low stock alerts
CREATE VIEW IF NOT EXISTS v_stock_alerts AS
SELECT
  i.id,
  i.code,
  i.name,
  i.stock_quantity,
  i.min_stock_alert
FROM items i
WHERE i.is_active = 1
  AND i.stock_quantity <= i.min_stock_alert;

-- Top customers by total transactions (rentals + sales)
CREATE VIEW IF NOT EXISTS v_top_customers AS
SELECT
  c.name,
  c.phone,
  (
    (SELECT COUNT(*) FROM rental_transactions rt WHERE rt.customer_id = c.id)
    +
    (SELECT COUNT(*) FROM sales_transactions st WHERE st.customer_id = c.id)
  ) AS total_transactions
FROM customers c
WHERE c.is_active = 1;

