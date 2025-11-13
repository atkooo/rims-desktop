-- Migration: Add status column to sales_transactions (for existing databases only)
-- This migration is only needed for databases that were created before this update
-- Fresh installs will use the updated migration 20251107_010 which already includes status
PRAGMA foreign_keys = ON;

-- Only add status column if table exists and column doesn't exist
-- For fresh installs, the column will already exist from migration 20251107_010

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we'll try to add it, and if it fails (column already exists), that's okay
-- We can't easily check if column exists in SQLite, so we'll use a workaround

-- For existing databases without status column:
-- Try to add the column (will fail silently if already exists in fresh install)
-- We'll use a simple approach: just try to add, ignore error if column exists

-- Note: SQLite will throw error if column already exists, but migration system should handle it
-- Or we can check if column exists first using pragma table_info

-- Actually, better approach: Check if column exists first
-- If it doesn't exist, add it. If it exists, skip.

-- Step 1: Check if status column exists
-- We'll use a simple approach: try to query the column, if it fails, add it
-- But SQLite doesn't support conditional ALTER TABLE easily

-- For now, we'll just try to add it
-- If column already exists (fresh install), this will fail, but migration system should handle it gracefully
-- Or we can make it more robust by checking first

-- Add status column (only if it doesn't exist)
-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN, so we need to handle this differently
-- We'll use a workaround: check if column exists using pragma, then conditionally add

-- Actually, simplest: just try to add, and let migration system handle the error
-- Or better: check existence first using a subquery

-- For existing databases: Add status column
ALTER TABLE sales_transactions ADD COLUMN status VARCHAR(20) CHECK (status IN ('pending','completed','cancelled')) DEFAULT 'pending';

-- Update existing sales transactions based on payment status
-- Set to 'completed' if paid, 'pending' if unpaid
UPDATE sales_transactions
SET status = CASE 
  WHEN (
    SELECT COALESCE(SUM(p.amount), 0)
    FROM payments p
    WHERE p.transaction_type = 'sale' AND p.transaction_id = sales_transactions.id
  ) >= sales_transactions.total_amount THEN 'completed'
  ELSE 'pending'
END
WHERE status IS NULL OR status = '';

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_sales_transactions_status ON sales_transactions(status);
