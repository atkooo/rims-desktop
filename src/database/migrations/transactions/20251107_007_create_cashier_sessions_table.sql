-- Migration: Buat tabel cashier_sessions
PRAGMA foreign_keys = ON;

CREATE TABLE cashier_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_code VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    opening_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closing_date DATETIME,
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(15,2),
    expected_balance DECIMAL(15,2),
    actual_balance DECIMAL(15,2),
    difference DECIMAL(15,2),
    status VARCHAR(20) CHECK (status IN ('open','closed')) DEFAULT 'open',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_cashier_sessions_user_id ON cashier_sessions(user_id);
CREATE INDEX idx_cashier_sessions_status ON cashier_sessions(status);
CREATE INDEX idx_cashier_sessions_opening_date ON cashier_sessions(opening_date);

