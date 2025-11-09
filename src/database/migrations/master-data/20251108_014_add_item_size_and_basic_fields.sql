-- Migration: add item size relation and simplified fields to items
PRAGMA foreign_keys = ON;

ALTER TABLE items ADD COLUMN price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE items ADD COLUMN type VARCHAR(50) DEFAULT 'RENTAL';
ALTER TABLE items ADD COLUMN status VARCHAR(20) DEFAULT 'AVAILABLE';
ALTER TABLE items ADD COLUMN size_id INTEGER REFERENCES item_sizes(id) ON UPDATE CASCADE ON DELETE SET NULL;

UPDATE items
SET price = COALESCE(price, sale_price, 0)
WHERE price IS NULL OR price = 0;

UPDATE items
SET type = CASE
    WHEN is_available_for_rent = 1 AND is_available_for_sale = 1 THEN 'HYBRID'
    WHEN is_available_for_rent = 1 THEN 'RENTAL'
    ELSE 'SALE'
END
WHERE type IS NULL OR TRIM(type) = '';

UPDATE items
SET status = CASE
    WHEN available_quantity <= 0 THEN 'RENTED'
    ELSE 'AVAILABLE'
END
WHERE status IS NULL OR TRIM(status) = '';
