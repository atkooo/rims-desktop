-- =====================================================
-- RIMS (Rental & Inventory Management System)
-- Database Schema - SQLite
-- =====================================================




CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Tabel Aksesoris
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

-- Tabel Paket/Bundling
CREATE TABLE bundles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(50), -- penjualan, sewa
    price DECIMAL(15,2) DEFAULT 0,
    rental_price_per_day DECIMAL(15,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    image_path VARCHAR(255),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Detail Paket/Bundling
CREATE TABLE bundle_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bundle_id INTEGER NOT NULL,
    item_id INTEGER,
    accessory_id INTEGER,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (accessory_id) REFERENCES accessories(id)
);
-- Tabel Barang/Produk
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
    available_quantity INTEGER DEFAULT 0, -- stok tersedia (tidak sedang disewa)
    min_stock_alert INTEGER DEFAULT 0,
    image_path VARCHAR(255),
    is_available_for_rent BOOLEAN DEFAULT 1,
    is_available_for_sale BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);


-- Tabel Pelanggan
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    id_card_number VARCHAR(50), -- KTP/SIM
    notes TEXT,
    total_transactions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Roles
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(20) UNIQUE NOT NULL, -- admin, manager, staff
    description VARCHAR(200)
);

-- Users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'staff', -- stores role name for simplicity
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- TRANSAKSI TABLES
-- =====================================================


-- Tabel Transaksi Sewa (Header)
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
    payment_method VARCHAR(20) DEFAULT 'cash', -- cash, transfer, card
    payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid, partial, paid
    paid_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, returned, cancelled, overdue
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);


-- Tabel Detail Item yang Disewa
CREATE TABLE rental_transaction_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rental_transaction_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    rental_price DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    is_returned BOOLEAN DEFAULT 0,
    return_condition VARCHAR(50), -- good, damaged, lost
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rental_transaction_id) REFERENCES rental_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);


-- Tabel Transaksi Penjualan (Header)
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
    payment_method VARCHAR(20) DEFAULT 'cash',
    payment_status VARCHAR(20) DEFAULT 'paid',
    paid_amount DECIMAL(15,2) DEFAULT 0,
    change_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);


-- Tabel Detail Item yang Dijual
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


-- =====================================================
-- BOOKING/RESERVASI
-- =====================================================


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
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);


-- =====================================================
-- STOCK MOVEMENT (Audit Trail)
-- =====================================================


CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    movement_type VARCHAR(20) NOT NULL, -- in, out, adjustment, damaged, lost
    reference_type VARCHAR(30), -- rental, sale, purchase, return
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


-- =====================================================
-- PAYMENT HISTORY
-- =====================================================


CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_type VARCHAR(20) NOT NULL, -- rental, sale
    transaction_id INTEGER NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    reference_number VARCHAR(100),
    user_id INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);


-- =====================================================
-- SYSTEM CONFIGURATION & SETTINGS
-- =====================================================


CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- BACKUP HISTORY
-- =====================================================


CREATE TABLE backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_file VARCHAR(255) NOT NULL,
    backup_path VARCHAR(500),
    file_size INTEGER,
    backup_type VARCHAR(20) DEFAULT 'manual', -- manual, automatic
    user_id INTEGER,
    status VARCHAR(20) DEFAULT 'success',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);


-- =====================================================
-- ACTIVITY LOG (Audit Trail)
-- =====================================================


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
-- INDEXES untuk Optimasi Query
-- =====================================================


-- Index untuk items
CREATE INDEX idx_items_code ON items(code);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_active ON items(is_active);


-- Index untuk customers
CREATE INDEX idx_customers_code ON customers(code);
CREATE INDEX idx_customers_phone ON customers(phone);
-- Index for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);



-- Index untuk rental transactions
CREATE INDEX idx_rental_trans_code ON rental_transactions(transaction_code);
CREATE INDEX idx_rental_trans_customer ON rental_transactions(customer_id);
CREATE INDEX idx_rental_trans_date ON rental_transactions(rental_date);
CREATE INDEX idx_rental_trans_status ON rental_transactions(status);


-- Index untuk sales transactions
CREATE INDEX idx_sales_trans_code ON sales_transactions(transaction_code);
CREATE INDEX idx_sales_trans_customer ON sales_transactions(customer_id);
CREATE INDEX idx_sales_trans_date ON sales_transactions(sale_date);


-- Index untuk stock movements
CREATE INDEX idx_stock_item ON stock_movements(item_id);
CREATE INDEX idx_stock_date ON stock_movements(created_at);


-- Index untuk bookings
CREATE INDEX idx_booking_customer ON bookings(customer_id);
CREATE INDEX idx_booking_item ON bookings(item_id);
CREATE INDEX idx_booking_dates ON bookings(planned_start_date, planned_end_date);


-- =====================================================
-- TRIGGERS untuk Otomasi
-- =====================================================


-- Trigger untuk update timestamp pada items
CREATE TRIGGER update_items_timestamp 
AFTER UPDATE ON items
BEGIN
    UPDATE items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


-- Trigger untuk update timestamp pada customers
CREATE TRIGGER update_customers_timestamp 
AFTER UPDATE ON customers
BEGIN
    UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


-- Trigger untuk update timestamp pada rental_transactions
CREATE TRIGGER update_rental_timestamp 
AFTER UPDATE ON rental_transactions
BEGIN
    UPDATE rental_transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


-- =====================================================
-- VIEWS untuk Reporting
-- =====================================================


-- View untuk item dengan stok
CREATE VIEW v_items_with_stock AS
SELECT 
    i.id,
    i.code,
    i.name,
    c.name as category_name,
    i.stock_quantity,
    i.available_quantity,
    i.stock_quantity - i.available_quantity as rented_quantity,
    i.rental_price_per_day,
    i.sale_price,
    i.is_active
FROM items i
LEFT JOIN categories c ON i.category_id = c.id;


-- View untuk rental aktif
CREATE VIEW v_active_rentals AS
SELECT 
    rt.id,
    rt.transaction_code,
    c.name as customer_name,
    c.phone as customer_phone,
    rt.rental_date,
    rt.planned_return_date,
    rt.total_amount,
    rt.status,
    JULIANDAY('now') - JULIANDAY(rt.planned_return_date) as days_overdue
FROM rental_transactions rt
LEFT JOIN customers c ON rt.customer_id = c.id
WHERE rt.status = 'active';


-- View untuk laporan penjualan harian
CREATE VIEW v_daily_sales AS
SELECT 
    DATE(sale_date) as sale_date,
    COUNT(*) as total_transactions,
    SUM(total_amount) as total_sales,
    SUM(discount) as total_discount
FROM sales_transactions
GROUP BY DATE(sale_date);
