-- Migration: Update v_stock_alerts view to include accessories
-- This migration updates the stock alerts view to include both items and accessories

PRAGMA foreign_keys = ON;

-- Drop existing view
DROP VIEW IF EXISTS v_stock_alerts;

-- Recreate view with items and accessories
CREATE VIEW IF NOT EXISTS v_stock_alerts AS
SELECT
  i.id,
  i.code,
  i.name,
  i.stock_quantity,
  i.min_stock_alert,
  'item' AS type,
  c.name AS category_name
FROM items i
LEFT JOIN categories c ON c.id = i.category_id
WHERE i.is_active = 1
  AND i.stock_quantity <= i.min_stock_alert
  AND i.min_stock_alert > 0
UNION ALL
SELECT
  a.id,
  a.code,
  a.name,
  a.stock_quantity,
  a.min_stock_alert,
  'accessory' AS type,
  'Aksesoris' AS category_name
FROM accessories a
WHERE a.is_active = 1
  AND a.stock_quantity <= a.min_stock_alert
  AND a.min_stock_alert > 0;

