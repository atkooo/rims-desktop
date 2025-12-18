-- Migration: Buat tabel backup_history sama activity_logs
PRAGMA foreign_keys = ON;

CREATE TABLE backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_file VARCHAR(255) NOT NULL,
    backup_path VARCHAR(500) NOT NULL,
    file_size INTEGER DEFAULT 0,
    backup_type VARCHAR(20) CHECK (backup_type IN ('manual','auto')) DEFAULT 'manual',
    status VARCHAR(20) CHECK (status IN ('success','failed')) DEFAULT 'success',
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

