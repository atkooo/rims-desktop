-- Migration: Create a view for unified Stock Opname comparison across items, bundles, and accessories
PRAGMA foreign_keys = ON;

CREATE VIEW IF NOT EXISTS v_stock_opname_comparison AS
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
  END AS available_qty_mismatch,
  'item' AS product_type
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
) sm_calc ON sm_calc.item_id = i.id

UNION ALL

SELECT
  a.id,
  a.code,
  a.name,
  a.stock_quantity AS current_stock_quantity,
  a.available_quantity AS current_available_quantity,
  COALESCE(sm_calc.calculated_stock_quantity, 0) AS calculated_stock_quantity,
  COALESCE(sm_calc.calculated_available_quantity, 0) AS calculated_available_quantity,
  CASE
    WHEN a.stock_quantity != COALESCE(sm_calc.calculated_stock_quantity, 0) THEN 1
    ELSE 0
  END AS stock_qty_mismatch,
  CASE
    WHEN a.available_quantity != COALESCE(sm_calc.calculated_available_quantity, 0) THEN 1
    ELSE 0
  END AS available_qty_mismatch,
  'accessory' AS product_type
FROM accessories a
LEFT JOIN (
  SELECT
    accessory_id,
    COALESCE(SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END), 0) AS calculated_stock_quantity,
    COALESCE(SUM(
      CASE
        WHEN movement_type = 'IN' AND (reference_type IS NULL OR reference_type NOT LIKE '%rental%') THEN quantity
        WHEN movement_type = 'OUT' THEN -quantity
        ELSE 0
      END
    ), 0) AS calculated_available_quantity
  FROM stock_movements
  WHERE accessory_id IS NOT NULL
  GROUP BY accessory_id
) sm_calc ON sm_calc.accessory_id = a.id

UNION ALL

SELECT
  b.id,
  b.code,
  b.name,
  b.stock_quantity AS current_stock_quantity,
  b.available_quantity AS current_available_quantity,
  COALESCE(sm_calc.calculated_stock_quantity, 0) AS calculated_stock_quantity,
  COALESCE(sm_calc.calculated_available_quantity, 0) AS calculated_available_quantity,
  CASE
    WHEN b.stock_quantity != COALESCE(sm_calc.calculated_stock_quantity, 0) THEN 1
    ELSE 0
  END AS stock_qty_mismatch,
  CASE
    WHEN b.available_quantity != COALESCE(sm_calc.calculated_available_quantity, 0) THEN 1
    ELSE 0
  END AS available_qty_mismatch,
  'bundle' AS product_type
FROM bundles b
LEFT JOIN (
  SELECT
    bundle_id,
    COALESCE(SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END), 0) AS calculated_stock_quantity,
    COALESCE(SUM(
      CASE
        WHEN movement_type = 'IN' AND (reference_type IS NULL OR reference_type NOT LIKE '%rental%') THEN quantity
        WHEN movement_type = 'OUT' THEN -quantity
        ELSE 0
      END
    ), 0) AS calculated_available_quantity
    FROM stock_movements
    WHERE bundle_id IS NOT NULL
      AND item_id IS NULL
      AND accessory_id IS NULL
  GROUP BY bundle_id
) sm_calc ON sm_calc.bundle_id = b.id;
