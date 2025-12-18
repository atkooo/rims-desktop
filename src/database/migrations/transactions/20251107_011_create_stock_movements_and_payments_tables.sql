-- Migration: Buat tabel stock_movements sama payments
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
    is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1)),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
    FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE SET NULL,
    FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CHECK ((item_id IS NOT NULL) OR (bundle_id IS NOT NULL) OR (accessory_id IS NOT NULL))
);

-- Buat index untuk bundle_id sama accessory_id
CREATE INDEX IF NOT EXISTS idx_stock_movements_bundle ON stock_movements(bundle_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_accessory ON stock_movements(accessory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_sync ON stock_movements(is_sync);

-- Buat tabel sales_payments
CREATE TABLE sales_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash','transfer','card')) DEFAULT 'cash',
    reference_number VARCHAR(100),
    user_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1)),
    FOREIGN KEY (transaction_id) REFERENCES sales_transactions(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Buat tabel rental_payments
CREATE TABLE rental_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash','transfer','card')) DEFAULT 'cash',
    reference_number VARCHAR(100),
    user_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1)),
    FOREIGN KEY (transaction_id) REFERENCES rental_transactions(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Buat index untuk payments
CREATE INDEX idx_sales_payments_transaction ON sales_payments(transaction_id);
CREATE INDEX idx_sales_payments_user ON sales_payments(user_id);
CREATE INDEX idx_sales_payments_date ON sales_payments(payment_date);
CREATE INDEX idx_sales_payments_sync ON sales_payments(is_sync);

CREATE INDEX idx_rental_payments_transaction ON rental_payments(transaction_id);
CREATE INDEX idx_rental_payments_user ON rental_payments(user_id);
CREATE INDEX idx_rental_payments_date ON rental_payments(payment_date);
CREATE INDEX idx_rental_payments_sync ON rental_payments(is_sync);

