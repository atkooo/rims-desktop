-- Migration: Create bookings table
PRAGMA foreign_keys = ON;

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
    estimated_price DECIMAL(15,2) DEFAULT 0,
    deposit DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('pending','confirmed','cancelled','fulfilled')) DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

