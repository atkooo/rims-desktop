-- Migration: Buat tabel accessories
PRAGMA foreign_keys = ON;

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
    discount_group_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (discount_group_id) REFERENCES discount_groups(id) ON DELETE SET NULL
);

-- Buat index untuk discount_group_id
CREATE INDEX IF NOT EXISTS idx_accessories_discount_group ON accessories(discount_group_id);

