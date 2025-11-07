-- Seed roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access'),
  ('manager', 'Manage operations'),
  ('staff', 'Limited access')
ON CONFLICT DO NOTHING;

-- Admin default user (password: admin123)
-- password_hash uses sha256 for initial seed; app supports scrypt and sha256
INSERT INTO users (username, password_hash, full_name, email, role, is_active)
VALUES ('admin', 'sha256:240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrator', 'admin@example.com', 'admin', 1)
ON CONFLICT(username) DO NOTHING;

-- Default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('company_name', 'RIMS Store', 'Nama perusahaan'),
('currency', 'IDR', 'Mata uang'),
('tax_rate', '0', 'Persentase pajak (%)'),
('late_fee_per_day', '10000', 'Denda keterlambatan per hari'),
('receipt_footer', 'Terima kasih atas kepercayaan Anda', 'Footer nota'),
('auto_backup_enabled', '1', 'Aktifkan backup otomatis'),
('auto_backup_time', '23:00', 'Waktu backup otomatis');


-- Seed categories first
INSERT INTO categories (name, description) VALUES
('Baju Pengantin', 'Koleksi baju pengantin'),
('Baju Adat', 'Koleksi baju adat tradisional'),
('Aksesoris', 'Aksesoris pelengkap')
ON CONFLICT DO NOTHING;

-- Seed items
INSERT INTO items (code, name, category_id, description, purchase_price, rental_price_per_day, sale_price, stock_quantity, available_quantity)
VALUES
('BPW001', 'Baju Prewed Modern', 1, 'Baju prewedding style modern', 1500000, 300000, 2000000, 5, 5),
('BPW002', 'Baju Prewed Vintage', 1, 'Baju prewedding style vintage', 1800000, 350000, 2500000, 3, 3),
('BAD001', 'Baju Adat Jawa', 2, 'Baju adat Jawa lengkap', 2500000, 400000, 3500000, 4, 4),
('BAD002', 'Baju Adat Sunda', 2, 'Baju adat Sunda lengkap', 2300000, 380000, 3200000, 4, 4)
ON CONFLICT(code) DO NOTHING;

-- Seed accessories
INSERT INTO accessories (code, name, description, purchase_price, rental_price_per_day, sale_price, stock_quantity, available_quantity)
VALUES
('AKS001', 'Mahkota Pengantin', 'Mahkota pengantin modern', 500000, 100000, 800000, 5, 5),
('AKS002', 'Set Aksesoris Prewed', 'Set lengkap aksesoris prewedding', 800000, 150000, 1200000, 3, 3),
('AKS003', 'Kalung Adat', 'Kalung tradisional', 1000000, 200000, 1500000, 4, 4),
('AKS004', 'Set Aksesoris Adat', 'Set lengkap aksesoris adat', 1200000, 250000, 1800000, 4, 4)
ON CONFLICT(code) DO NOTHING;

-- Now seed the bundles
INSERT INTO bundles (code, name, description, bundle_type, price, rental_price_per_day, stock_quantity, available_quantity, image_path, is_active)
VALUES
('PKT001', 'Paket Prewed Silver', 'Paket sewa baju prewed + aksesoris', 'sewa', 2000000, 500000, 10, 7, NULL, 1),
('PKT002', 'Paket Bundling Adat', 'Paket penjualan baju adat + aksesoris', 'penjualan', 3500000, 0, 5, 5, NULL, 1)
ON CONFLICT(code) DO NOTHING;

-- Finally seed the bundle details
INSERT INTO bundle_details (bundle_id, item_id, accessory_id, quantity, notes)
SELECT 
    b.id AS bundle_id,
    i.id AS item_id,
    a.id AS accessory_id,
    1 AS quantity,
    CASE 
        WHEN b.code = 'PKT001' AND i.code = 'BPW001' THEN 'Baju Prewed + Mahkota'
        WHEN b.code = 'PKT001' AND i.code = 'BPW002' THEN 'Aksesoris Prewed'
        WHEN b.code = 'PKT002' AND i.code = 'BAD001' THEN 'Baju Adat + Kalung'
        WHEN b.code = 'PKT002' AND i.code = 'BAD002' THEN 'Aksesoris Adat'
    END AS notes
FROM bundles b
CROSS JOIN items i
CROSS JOIN accessories a
WHERE 
    (b.code = 'PKT001' AND i.code = 'BPW001' AND a.code = 'AKS001') OR
    (b.code = 'PKT001' AND i.code = 'BPW002' AND a.code = 'AKS002') OR
    (b.code = 'PKT002' AND i.code = 'BAD001' AND a.code = 'AKS003') OR
    (b.code = 'PKT002' AND i.code = 'BAD002' AND a.code = 'AKS004')
ON CONFLICT DO NOTHING;