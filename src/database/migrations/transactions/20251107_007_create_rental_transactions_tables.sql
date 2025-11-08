-- Migration: Create rental transactions tables
PRAGMA foreign_keys = ON;

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