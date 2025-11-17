-- Migration: Create stock_movements and payments tables
PRAGMA foreign_keys = ON;

CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    bundle_id INTEGER,
    accessory_id INTEGER,
    movement_type VARCHAR(10) CHECK (movement_type IN ('IN','OUT')) NOT NULL,
    reference_type VARCHAR(50),
    reference_id INTEGER,
    quantity INTEGER NOT NULL,
    stock_before INTEGER,
    stock_after INTEGER,
    user_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE SET NULL,
    FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for bundle_id and accessory_id
CREATE INDEX IF NOT EXISTS idx_stock_movements_bundle ON stock_movements(bundle_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_accessory ON stock_movements(accessory_id);

CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('rental','sale')) NOT NULL,
    transaction_id INTEGER NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash','transfer','card')) DEFAULT 'cash',
    reference_number VARCHAR(100),
    user_id INTEGER,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

