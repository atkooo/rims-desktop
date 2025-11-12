-- Migration: Add discount_group_id to customers table
PRAGMA foreign_keys = ON;

-- Add discount_group_id column to customers table
ALTER TABLE customers ADD COLUMN discount_group_id INTEGER;

-- Add foreign key constraint
-- Note: SQLite doesn't support adding foreign keys via ALTER TABLE directly,
-- so we'll create it via a trigger or handle it in application logic
-- For now, we'll just add the column and index

CREATE INDEX IF NOT EXISTS idx_customers_discount_group ON customers(discount_group_id);




