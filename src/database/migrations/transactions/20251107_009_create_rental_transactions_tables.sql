-- Migration: Create rental transactions tables
PRAGMA foreign_keys = ON;

CREATE TABLE rental_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    booking_id INTEGER,
    cashier_session_id INTEGER,
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_session_id) REFERENCES cashier_sessions(id) ON DELETE SET NULL,
    CHECK (planned_return_date >= rental_date),
    CHECK (total_days > 0),
    CHECK (total_amount >= 0),
    CHECK (paid_amount >= 0),
    CHECK (deposit >= 0),
    CHECK (late_fee >= 0),
    CHECK (discount >= 0)
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
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
    CHECK (quantity > 0),
    CHECK (rental_price >= 0),
    CHECK (subtotal >= 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_rental_transactions_customer ON rental_transactions(customer_id);
CREATE INDEX idx_rental_transactions_user ON rental_transactions(user_id);
CREATE INDEX idx_rental_transactions_booking ON rental_transactions(booking_id);
CREATE INDEX idx_rental_transactions_cashier_session ON rental_transactions(cashier_session_id);
CREATE INDEX idx_rental_transactions_status ON rental_transactions(status);
CREATE INDEX idx_rental_transactions_date ON rental_transactions(rental_date);
CREATE INDEX idx_rental_transactions_return_date ON rental_transactions(planned_return_date);
CREATE INDEX idx_rental_transactions_payment_status ON rental_transactions(payment_status);

CREATE INDEX idx_rental_transaction_details_transaction ON rental_transaction_details(rental_transaction_id);
CREATE INDEX idx_rental_transaction_details_item ON rental_transaction_details(item_id);
CREATE INDEX idx_rental_transaction_details_returned ON rental_transaction_details(is_returned);

