-- Migration: Buat view buat bandingin stock sekarang dengan nilai yang dihitung dari stock_movements
PRAGMA foreign_keys = ON;

CREATE VIEW IF NOT EXISTS v_items_stock_calculated AS
SELECT
  i.id,
  i.code,
  i.name,
  i.stock_quantity AS current_stock_quantity,
  i.available_quantity AS current_available_quantity,
  COALESCE(sm_calc.calculated_stock_quantity, 0) AS calculated_stock_quantity,
  COALESCE(sm_calc.calculated_available_quantity, 0) AS calculated_available_quantity,
  CASE
    WHEN i.stock_quantity != COALESCE(sm_calc.calculated_stock_quantity, 0) THEN 1
    ELSE 0
  END AS stock_qty_mismatch,
  CASE
    WHEN i.available_quantity != COALESCE(sm_calc.calculated_available_quantity, 0) THEN 1
    ELSE 0
  END AS available_qty_mismatch
FROM items i
LEFT JOIN (
  SELECT
    item_id,
    COALESCE(SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END), 0) AS calculated_stock_quantity,
    COALESCE(SUM(
      CASE
        WHEN movement_type = 'IN' AND (reference_type IS NULL OR reference_type NOT LIKE '%rental%') THEN quantity
        WHEN movement_type = 'OUT' THEN -quantity
        ELSE 0
      END
    ), 0) AS calculated_available_quantity
  FROM stock_movements
  WHERE item_id IS NOT NULL
  GROUP BY item_id
) sm_calc ON sm_calc.item_id = i.id;
