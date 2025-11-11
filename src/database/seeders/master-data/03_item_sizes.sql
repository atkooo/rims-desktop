-- ============================================
-- Seeder: Item Sizes (SQLite Compatible)
-- ============================================

-- Reset item sizes so the new data always seeds clean
DELETE FROM item_sizes;

-- Insert default item sizes
INSERT INTO item_sizes (code, name, description, notes, sort_order, is_active, created_at, updated_at) VALUES
('XS', 'Extra Small', 'Ukuran sangat kecil', 'Untuk ukuran yang sangat kecil', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('S', 'Small', 'Ukuran kecil', 'Untuk ukuran kecil', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('M', 'Medium', 'Ukuran sedang', 'Ukuran standar/medium', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('L', 'Large', 'Ukuran besar', 'Untuk ukuran besar', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('XL', 'Extra Large', 'Ukuran sangat besar', 'Untuk ukuran sangat besar', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('XXL', 'Double Extra Large', 'Ukuran ekstra besar', 'Untuk ukuran ekstra besar', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('XXXL', 'Triple Extra Large', 'Ukuran super besar', 'Untuk ukuran super besar', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('28', '28', 'Ukuran 28', 'Ukuran nomor 28', 8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('30', '30', 'Ukuran 30', 'Ukuran nomor 30', 9, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('32', '32', 'Ukuran 32', 'Ukuran nomor 32', 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('34', '34', 'Ukuran 34', 'Ukuran nomor 34', 11, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('36', '36', 'Ukuran 36', 'Ukuran nomor 36', 12, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('38', '38', 'Ukuran 38', 'Ukuran nomor 38', 13, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('40', '40', 'Ukuran 40', 'Ukuran nomor 40', 14, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('42', '42', 'Ukuran 42', 'Ukuran nomor 42', 15, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('44', '44', 'Ukuran 44', 'Ukuran nomor 44', 16, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('46', '46', 'Ukuran 46', 'Ukuran nomor 46', 17, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('48', '48', 'Ukuran 48', 'Ukuran nomor 48', 18, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('50', '50', 'Ukuran 50', 'Ukuran nomor 50', 19, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('52', '52', 'Ukuran 52', 'Ukuran nomor 52', 20, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('54', '54', 'Ukuran 54', 'Ukuran nomor 54', 21, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ONE-SIZE', 'One Size', 'Ukuran satu untuk semua', 'Ukuran universal yang cocok untuk semua', 22, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('FREE-SIZE', 'Free Size', 'Ukuran bebas', 'Ukuran bebas/fleksibel', 23, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

