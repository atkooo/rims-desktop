-- =====================================================
-- RIMS (Rental & Inventory Management System)
-- Database Schema (v2 - Improved) for SQLite
-- =====================================================

PRAGMA foreign_keys = ON;

-- =====================================================
-- MASTER DATA
-- =====================================================

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accessories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    purchase_price DECIMAL(15,2) DEFAULT 0,
    rental_price_per_day DECIMAL(15,2) DEFAULT 0,
    sale_price DECIMAL(15,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 0,
    image_path VARCHAR(255),
    is_available_for_rent BOOLEAN DEFAULT 1,
    is_available_for_sale BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER NOT NULL,
    description TEXT,
    purchase_price DECIMAL(15,2) DEFAULT 0,
    rental_price_per_day DECIMAL(15,2) DEFAULT 0,
    sale_price DECIMAL(15,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 0,
    image_path VARCHAR(255),
    is_available_for_rent BOOLEAN DEFAULT 1,
    is_available_for_sale BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    id_card_number VARCHAR(50),
    notes TEXT,
    total_transactions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(20) UNIQUE NOT NULL CHECK (name IN ('admin','manager','staff')),
    description VARCHAR(200)
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100),
    role_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- =====================================================
-- TRANSACTIONS
-- =====================================================

CREATE TABLE rental_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rental_date DATE NOT NULL,
    planned_return_date DATE NOT NULL,
    actual_return_date DATE,
    total_days INTEGER NOT NULL,
    subtotal DECIMAL(15,2) DEFAULT 0,
    deposit DECIMAL(15,2) DEFAULT 0,
    late_fee DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash','transfer','card')) DEFAULT 'cash',
    payment_status VARCHAR(20) CHECK (payment_status IN ('unpaid','partial','paid')) DEFAULT 'unpaid',
    paid_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('active','returned','cancelled','overdue')) DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE rental_transaction_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rental_transaction_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    rental_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    is_returned BOOLEAN DEFAULT 0,
    return_condition VARCHAR(50) CHECK (return_condition IN ('good','damaged','lost')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_transaction_id) REFERENCES rental_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE sales_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER,
    user_id INTEGER NOT NULL,
    sale_date DATE NOT NULL,
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash','transfer','card')) DEFAULT 'cash',
    payment_status VARCHAR(20) CHECK (payment_status IN ('unpaid','partial','paid')) DEFAULT 'paid',
    paid_amount DECIMAL(15,2) DEFAULT 0,
    change_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE sales_transaction_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_transaction_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    sale_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_transaction_id) REFERENCES sales_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    estimated_price DECIMAL(15,2),
    deposit DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('pending','confirmed','cancelled','completed')) DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    movement_type VARCHAR(20) CHECK (movement_type IN ('in','out','adjustment','damaged','lost')) NOT NULL,
    reference_type VARCHAR(30),
    reference_id INTEGER,
    quantity INTEGER NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('rental','sale')) NOT NULL,
    transaction_id INTEGER NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash','transfer','card')) NOT NULL,
    reference_number VARCHAR(100),
    user_id INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_file VARCHAR(255) NOT NULL,
    backup_path VARCHAR(500),
    file_size INTEGER,
    backup_type VARCHAR(20) CHECK (backup_type IN ('manual','automatic')) DEFAULT 'manual',
    user_id INTEGER,
    status VARCHAR(20) CHECK (status IN ('success','failed')) DEFAULT 'success',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_items_code ON items(code);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_rental_status ON rental_transactions(status);
CREATE INDEX idx_sales_date ON sales_transactions(sale_date);
CREATE INDEX idx_booking_status ON bookings(status);
CREATE INDEX idx_stock_item ON stock_movements(item_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER trg_update_timestamp
AFTER UPDATE ON items
BEGIN
  UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_update_customer_timestamp
AFTER UPDATE ON customers
BEGIN
  UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_update_rental_timestamp
AFTER UPDATE ON rental_transactions
BEGIN
  UPDATE rental_transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =====================================================
-- VIEWS
-- =====================================================

CREATE VIEW v_items_with_stock AS
SELECT i.id, i.code, i.name, c.name AS category_name,
       i.stock_quantity, i.available_quantity,
       (i.stock_quantity - i.available_quantity) AS rented_quantity,
       i.rental_price_per_day, i.sale_price, i.is_active
FROM items i
LEFT JOIN categories c ON i.category_id = c.id;

CREATE VIEW v_active_rentals AS
SELECT rt.id, rt.transaction_code, c.name AS customer_name,
       rt.rental_date, rt.planned_return_date, rt.total_amount, rt.status,
       JULIANDAY('now') - JULIANDAY(rt.planned_return_date) AS days_overdue
FROM rental_transactions rt
LEFT JOIN customers c ON rt.customer_id = c.id
WHERE rt.status = 'active';

CREATE VIEW v_daily_sales AS
SELECT DATE(sale_date) AS sale_date,
       COUNT(*) AS total_transactions,
       SUM(total_amount) AS total_sales,
       SUM(discount) AS total_discount
FROM sales_transactions
GROUP BY DATE(sale_date);

CREATE VIEW v_stock_alerts AS
SELECT id, code, name, stock_quantity, min_stock_alert
FROM items
WHERE stock_quantity <= min_stock_alert;

CREATE VIEW v_top_customers AS
SELECT name, phone, total_transactions
FROM customers
ORDER BY total_transactions DESC
LIMIT 5;
