-- Migration: Buat tabel sales transactions
PRAGMA foreign_keys = ON;

CREATE TABLE sales_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER,
    user_id INTEGER NOT NULL,
    cashier_session_id INTEGER,
    sale_date DATE NOT NULL,
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    change_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('pending','completed','cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1)),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (cashier_session_id) REFERENCES cashier_sessions(id) ON DELETE SET NULL,
    CHECK (total_amount >= 0),
    CHECK (subtotal >= 0),
    CHECK (discount >= 0),
    CHECK (tax >= 0),
    CHECK (change_amount >= 0)
);

CREATE TABLE sales_transaction_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_transaction_id INTEGER NOT NULL,
    item_id INTEGER,
    accessory_id INTEGER,
    quantity INTEGER NOT NULL,
    sale_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_sync INTEGER DEFAULT 0 CHECK (is_sync IN (0, 1)),
    FOREIGN KEY (sales_transaction_id) REFERENCES sales_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
    FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE RESTRICT,
    CHECK (quantity > 0),
    CHECK (sale_price >= 0),
    CHECK (subtotal >= 0)
);

-- Buat index untuk accessory_id
CREATE INDEX IF NOT EXISTS idx_sales_transaction_details_accessory ON sales_transaction_details(accessory_id);

-- Buat index buat performa query yang lebih baik
CREATE INDEX idx_sales_transactions_customer ON sales_transactions(customer_id);
CREATE INDEX idx_sales_transactions_user ON sales_transactions(user_id);
CREATE INDEX idx_sales_transactions_cashier_session ON sales_transactions(cashier_session_id);
CREATE INDEX idx_sales_transactions_date ON sales_transactions(sale_date);

CREATE INDEX idx_sales_transaction_details_transaction ON sales_transaction_details(sales_transaction_id);
CREATE INDEX idx_sales_transaction_details_item ON sales_transaction_details(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_status ON sales_transactions(status);
CREATE INDEX idx_sales_transactions_is_sync ON sales_transactions(is_sync);
CREATE INDEX idx_sales_transaction_details_is_sync ON sales_transaction_details(is_sync);

