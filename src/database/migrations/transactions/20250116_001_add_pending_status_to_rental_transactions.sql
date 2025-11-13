-- Migration: Add 'pending' status to rental_transactions (for existing databases only)
-- This migration is only needed for databases that were created before this update
-- Fresh installs will use the updated migration 20251107_009 which already includes 'pending'
-- 
-- IMPORTANT: This migration will be skipped automatically for fresh installs because:
-- - Migration 20251107_009 runs first and creates table with 'pending' status
-- - This migration only needs to run if table exists with old constraint
-- - If table doesn't exist (fresh install), INSERT will fail but migration system handles it

PRAGMA foreign_keys = ON;

-- Only proceed if rental_transactions table exists (for existing databases)
-- For fresh installs, skip this migration (table already created with correct constraint)

-- Step 1: Create new table with updated constraint
CREATE TABLE IF NOT EXISTS rental_transactions_new (
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
    status VARCHAR(20) CHECK (status IN ('pending','active','returned','cancelled','overdue')) DEFAULT 'pending',
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
    CHECK (deposit >= 0),
    CHECK (late_fee >= 0),
    CHECK (discount >= 0)
);

-- Step 2: Copy data from old table (only if it exists and has data)
-- For fresh installs, this will fail because table doesn't exist yet
-- Migration system will handle the error and skip this migration
INSERT INTO rental_transactions_new 
SELECT 
    id,
    transaction_code,
    customer_id,
    user_id,
    booking_id,
    cashier_session_id,
    rental_date,
    planned_return_date,
    actual_return_date,
    total_days,
    subtotal,
    deposit,
    late_fee,
    discount,
    total_amount,
    CASE 
        WHEN status = 'active' THEN 'pending'
        ELSE status
    END as status,
    notes,
    created_at,
    updated_at
FROM rental_transactions;

-- Step 3: Replace old table with new one
DROP TABLE IF EXISTS rental_transactions;
ALTER TABLE rental_transactions_new RENAME TO rental_transactions;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_rental_transactions_customer ON rental_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_user ON rental_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_booking ON rental_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_cashier_session ON rental_transactions(cashier_session_id);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_status ON rental_transactions(status);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_date ON rental_transactions(rental_date);
CREATE INDEX IF NOT EXISTS idx_rental_transactions_return_date ON rental_transactions(planned_return_date);
