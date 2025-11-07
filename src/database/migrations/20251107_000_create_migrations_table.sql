-- Migration: Create migrations table
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration VARCHAR(255) NOT NULL,
    batch INTEGER NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);