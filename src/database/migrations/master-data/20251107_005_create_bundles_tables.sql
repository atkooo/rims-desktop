-- Migration: Create bundles and bundle_details tables
PRAGMA foreign_keys = ON;

CREATE TABLE bundles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(50) CHECK (bundle_type IN ('rental','sale')),
    price DECIMAL(15,2) DEFAULT 0,
    rental_price_per_day DECIMAL(15,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    image_path VARCHAR(255),
    is_active BOOLEAN DEFAULT 1,
    discount_group_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (discount_group_id) REFERENCES discount_groups(id) ON DELETE SET NULL
);

-- Create index for discount_group_id
CREATE INDEX IF NOT EXISTS idx_bundles_discount_group ON bundles(discount_group_id);

CREATE TABLE bundle_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bundle_id INTEGER NOT NULL,
    item_id INTEGER,
    accessory_id INTEGER,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL
);

