-- ============================================
-- Seeder: Item Sizes (SQLite Compatible)
-- ============================================

-- Reset item sizes so the new data always seeds clean
DELETE FROM item_sizes;

-- Insert default item sizes
INSERT INTO item_sizes (code, name, description, notes, sort_order, is_active, created_at, updated_at) VALUES
('XS', 'XS', 'Ukuran sangat kecil', 'Untuk ukuran yang sangat kecil', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('S', 'S', 'Ukuran kecil', 'Untuk ukuran kecil', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('M', 'M', 'Ukuran sedang', 'Ukuran standar/medium', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('L', 'L', 'Ukuran besar', 'Untuk ukuran besar', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('XL', 'XL', 'Ukuran sangat besar', 'Untuk ukuran sangat besar', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('XXL', 'XXL', 'Ukuran ekstra besar', 'Untuk ukuran ekstra besar', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('XXXL', 'XXXL', 'Ukuran super besar', 'Untuk ukuran super besar', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('28', '28', 'Ukuran 28', 'Ukuran nomor 28', 8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('30', '30', 'Ukuran 30', 'Ukuran nomor 30', 9, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('32', '32', 'Ukuran 32', 'Ukuran nomor 32', 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('34', '34', 'Ukuran 34', 'Ukuran nomor 34', 11, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

