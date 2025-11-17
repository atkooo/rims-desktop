-- Migration: Create items table
PRAGMA foreign_keys = ON;

CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER NOT NULL,
    size_id INTEGER,
    description TEXT,
    purchase_price DECIMAL(15,2) DEFAULT 0,
    rental_price_per_day DECIMAL(15,2) DEFAULT 0,
    sale_price DECIMAL(15,2) DEFAULT 0,
    price DECIMAL(15,2) DEFAULT 0,
    deposit DECIMAL(15,2) DEFAULT 0,
    type VARCHAR(50) DEFAULT 'RENTAL',
    status VARCHAR(20) DEFAULT 'AVAILABLE',
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
    FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (size_id) REFERENCES item_sizes(id) ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (discount_group_id) REFERENCES discount_groups(id) ON DELETE SET NULL
);

-- Create index for discount_group_id
CREATE INDEX IF NOT EXISTS idx_items_discount_group ON items(discount_group_id);

