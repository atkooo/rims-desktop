-- Migration: Buat tabel users (disederhanakan - tanpa tabel roles)
PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'kasir')),
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pastikan instalasi lama yang belum punya kolom role dapat kolomnya sebelum indexing
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'kasir' NOT NULL CHECK (role IN ('admin', 'kasir'));

-- Buat index
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
