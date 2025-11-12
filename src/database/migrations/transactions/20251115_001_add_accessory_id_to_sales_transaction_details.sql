-- Migration: Add accessory_id to sales_transaction_details
PRAGMA foreign_keys = ON;

-- Add accessory_id column (nullable, so it can be either item_id or accessory_id)
ALTER TABLE sales_transaction_details ADD COLUMN accessory_id INTEGER;

-- Add foreign key constraint for accessory_id
-- Note: SQLite doesn't support adding foreign keys via ALTER TABLE, so we'll need to recreate the table
-- But for now, we'll just add the column and handle the constraint in application logic

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_transaction_details_accessory ON sales_transaction_details(accessory_id);

-- Add check constraint to ensure either item_id or accessory_id is set (but not both)
-- SQLite doesn't support adding CHECK constraints via ALTER TABLE, so this will be handled in application logic

