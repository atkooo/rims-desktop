-- Migration: Add bundle_id and accessory_id to stock_movements
PRAGMA foreign_keys = ON;

-- Add bundle_id column (nullable)
ALTER TABLE stock_movements ADD COLUMN bundle_id INTEGER;

-- Add accessory_id column (nullable)
ALTER TABLE stock_movements ADD COLUMN accessory_id INTEGER;

-- Add foreign key constraints
-- Note: SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we'll rely on application-level validation
-- But we can create indexes for performance

-- Create indexes for bundle_id and accessory_id
CREATE INDEX IF NOT EXISTS idx_stock_movements_bundle ON stock_movements(bundle_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_accessory ON stock_movements(accessory_id);

-- Note: The application should ensure that exactly one of item_id, bundle_id, or accessory_id is set
-- This constraint will be enforced at the application level

