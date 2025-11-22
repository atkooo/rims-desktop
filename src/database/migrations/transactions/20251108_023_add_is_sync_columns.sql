-- Migration: Add is_sync columns to transaction tables
PRAGMA foreign_keys = ON;

-- Add is_sync column to rental_transactions (only if table exists)
-- Note: executeSqlFile will check if column already exists before adding
ALTER TABLE rental_transactions ADD COLUMN is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1));

-- Add is_sync column to rental_transaction_details
ALTER TABLE rental_transaction_details ADD COLUMN is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1));

-- Add is_sync column to sales_transactions
ALTER TABLE sales_transactions ADD COLUMN is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1));

-- Add is_sync column to sales_transaction_details
ALTER TABLE sales_transaction_details ADD COLUMN is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1));

-- Add is_sync column to payments
ALTER TABLE payments ADD COLUMN is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1));

-- Add is_sync column to stock_movements
ALTER TABLE stock_movements ADD COLUMN is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1));

-- Create indexes for is_sync columns for better query performance
CREATE INDEX IF NOT EXISTS idx_rental_transactions_is_sync ON rental_transactions(is_sync);
CREATE INDEX IF NOT EXISTS idx_rental_transaction_details_is_sync ON rental_transaction_details(is_sync);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_is_sync ON sales_transactions(is_sync);
CREATE INDEX IF NOT EXISTS idx_sales_transaction_details_is_sync ON sales_transaction_details(is_sync);
CREATE INDEX IF NOT EXISTS idx_payments_is_sync ON payments(is_sync);
CREATE INDEX IF NOT EXISTS idx_stock_movements_is_sync ON stock_movements(is_sync);

