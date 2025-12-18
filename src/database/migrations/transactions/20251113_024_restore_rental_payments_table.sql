-- Migration: Pastikan tabel rental_payments ada (fix buat instalasi lama)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rental_payments (
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

CREATE INDEX IF NOT EXISTS idx_rental_payments_transaction ON rental_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_rental_payments_user ON rental_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_payments_date ON rental_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_rental_payments_sync ON rental_payments(is_sync);
