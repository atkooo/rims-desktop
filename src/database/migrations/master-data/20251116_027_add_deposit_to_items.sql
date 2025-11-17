-- Migration: Add deposit column to items table
PRAGMA foreign_keys = ON;

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- The migration system (executeSqlFile) has allowDuplicateColumn: true
-- which will gracefully handle the case where the column already exists
-- This migration is safe to run multiple times

-- Attempt to add deposit column (will be ignored if column already exists)
ALTER TABLE items ADD COLUMN deposit DECIMAL(15,2) DEFAULT 0;

-- Add check constraint for deposit
-- Note: SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we'll rely on application-level validation
-- But we can create a view or trigger if needed in the future

