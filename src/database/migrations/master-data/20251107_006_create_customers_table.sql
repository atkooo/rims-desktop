-- Migration: Create customers table
PRAGMA foreign_keys = ON;

CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    id_card_number VARCHAR(50),
    photo_path VARCHAR(255),
    id_card_image_path VARCHAR(255),
    notes TEXT,
    discount_group_id INTEGER,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (discount_group_id) REFERENCES discount_groups(id) ON DELETE SET NULL
);

-- Create index for discount_group_id
CREATE INDEX IF NOT EXISTS idx_customers_discount_group ON customers(discount_group_id);

