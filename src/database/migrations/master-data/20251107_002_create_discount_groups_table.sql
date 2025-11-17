-- Migration: Create discount_groups table
PRAGMA foreign_keys = ON;

CREATE TABLE discount_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    CHECK (discount_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_discount_groups_code ON discount_groups(code);
CREATE INDEX IF NOT EXISTS idx_discount_groups_active ON discount_groups(is_active);

