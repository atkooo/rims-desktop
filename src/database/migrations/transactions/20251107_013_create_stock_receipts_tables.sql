-- Migration: Buat tabel stock_receipts
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stock_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_code VARCHAR(30) UNIQUE NOT NULL,
  receipt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_receipt_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_receipt_id INTEGER NOT NULL,
  item_id INTEGER,
  bundle_id INTEGER,
  accessory_id INTEGER,
  quantity INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_receipt_id) REFERENCES stock_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
  FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE SET NULL,
  FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE SET NULL,
  CHECK (
    (item_id IS NOT NULL AND bundle_id IS NULL AND accessory_id IS NULL)
    OR (bundle_id IS NOT NULL AND item_id IS NULL AND accessory_id IS NULL)
    OR (accessory_id IS NOT NULL AND item_id IS NULL AND bundle_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_stock_receipt_lines_receipt ON stock_receipt_lines(stock_receipt_id);

