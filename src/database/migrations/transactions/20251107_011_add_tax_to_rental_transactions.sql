-- Migration: Add tax column to rental_transactions
PRAGMA foreign_keys = ON;

ALTER TABLE rental_transactions ADD COLUMN tax DECIMAL(15,2) DEFAULT 0;

-- Add check constraint for tax
-- Note: SQLite doesn't support adding CHECK constraints via ALTER TABLE,
-- but we'll document it here for reference
-- CHECK (tax >= 0)


