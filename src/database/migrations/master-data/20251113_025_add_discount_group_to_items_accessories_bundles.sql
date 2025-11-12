-- Migration: Add discount_group_id to items, accessories, and bundles tables
PRAGMA foreign_keys = ON;

-- Add discount_group_id to items table
ALTER TABLE items ADD COLUMN discount_group_id INTEGER;

-- Add discount_group_id to accessories table
ALTER TABLE accessories ADD COLUMN discount_group_id INTEGER;

-- Add discount_group_id to bundles table
ALTER TABLE bundles ADD COLUMN discount_group_id INTEGER;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_discount_group ON items(discount_group_id);
CREATE INDEX IF NOT EXISTS idx_accessories_discount_group ON accessories(discount_group_id);
CREATE INDEX IF NOT EXISTS idx_bundles_discount_group ON bundles(discount_group_id);




