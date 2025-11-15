-- Migration: Update v_items_with_stock view to include min_stock_alert
-- This migration adds min_stock_alert to the items with stock view

PRAGMA foreign_keys = ON;

-- Drop existing view
DROP VIEW IF EXISTS v_items_with_stock;

-- Recreate view with min_stock_alert
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
  i.min_stock_alert,
  i.is_active
FROM items i
LEFT JOIN categories c ON c.id = i.category_id;


