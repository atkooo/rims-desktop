-- =====================================================
-- RIMS Desktop Seed Data
-- =====================================================

INSERT OR IGNORE INTO roles (id, name, description) VALUES
  (1, 'admin', 'Administrator penuh'),
  (2, 'manager', 'Pengelola operasional'),
  (3, 'staff', 'Staf operasional');

INSERT INTO users (username, password_hash, full_name, email, role_id, is_active)
VALUES ('admin', 'scrypt:041a3fb9df7baef8e822c306d0f354d2:411be0ee31d197aaac087d3c668eb98baec8f134ddcdc4553c6dc6cfaabed7af', 'Administrator RIMS', 'admin@rims.local', 1, 1)
ON CONFLICT(username) DO UPDATE SET
  password_hash=excluded.password_hash,
  full_name=excluded.full_name,
  email=excluded.email,
  role_id=excluded.role_id,
  is_active=excluded.is_active,
  updated_at=CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description)
VALUES
  ('company.name', 'RIMS Demo Studio', 'Nama perusahaan default'),
  ('company.phone', '+62 812-0000-0000', 'Kontak perusahaan'),
  ('rental.default_deposit', '200000', 'DP default untuk transaksi sewa');

INSERT OR IGNORE INTO categories (id, name, description)
VALUES
  (1, 'Pernikahan', 'Koleksi pakaian pernikahan'),
  (2, 'Adat', 'Kostum adat daerah Indonesia');

INSERT OR IGNORE INTO items (id, code, name, category_id, description, rental_price_per_day, sale_price, stock_quantity, available_quantity, is_available_for_rent, is_available_for_sale)
VALUES
  (1, 'ITM-001', 'Gaun Pengantin Putih', 1, 'Gaun pengantin klasik', 350000, 2500000, 5, 3, 1, 0),
  (2, 'ITM-002', 'Baju Adat Jawa', 2, 'Paket baju adat Jawa lengkap', 150000, 1200000, 8, 6, 1, 1);

INSERT OR IGNORE INTO accessories (id, code, name, description, rental_price_per_day, stock_quantity, available_quantity, is_available_for_rent)
VALUES
  (1, 'ACC-001', 'Konde Tradisional', 'Aksesori rambut tradisional', 50000, 10, 9, 1);

INSERT OR IGNORE INTO bundles (id, code, name, description, bundle_type, price, rental_price_per_day, stock_quantity, available_quantity, is_active)
VALUES
  (1, 'BDL-001', 'Paket Wedding Elegan', 'Gaun + aksesoris lengkap untuk pernikahan', 'rental', 0, 425000, 3, 2, 1);

INSERT OR IGNORE INTO bundle_details (id, bundle_id, item_id, accessory_id, quantity, notes)
VALUES
  (1, 1, 1, NULL, 1, 'Gaun utama'),
  (2, 1, NULL, 1, 1, 'Aksesori rambut');

INSERT OR IGNORE INTO customers (id, code, name, phone, email, address, total_transactions)
VALUES
  (1, 'CUS-001', 'Rani Kusuma', '+62 812-1234-5678', 'rani@example.com', 'Bandung', 3),
  (2, 'CUS-002', 'Doni Pratama', '+62 812-8765-4321', 'doni@example.com', 'Jakarta', 1);

INSERT OR IGNORE INTO rental_transactions (
  id,
  transaction_code,
  customer_id,
  user_id,
  rental_date,
  planned_return_date,
  total_days,
  subtotal,
  deposit,
  total_amount,
  payment_method,
  payment_status,
  status
) VALUES (
  1,
  'RENT-001',
  1,
  1,
  DATE('now','-5 day'),
  DATE('now','+2 day'),
  7,
  425000,
  200000,
  425000,
  'transfer',
  'paid',
  'active'
);

INSERT OR IGNORE INTO rental_transaction_details (
  id,
  rental_transaction_id,
  item_id,
  quantity,
  rental_price,
  subtotal,
  is_returned
) VALUES (1, 1, 1, 1, 350000, 350000, 0);

INSERT OR IGNORE INTO payments (
  id,
  transaction_type,
  transaction_id,
  payment_date,
  amount,
  payment_method,
  user_id,
  notes
) VALUES (
  1,
  'rental',
  1,
  DATETIME('now','-5 day'),
  425000,
  'transfer',
  1,
  'Pelunasan saat pengambilan barang'
);
