-- ============================================
-- Seeder: Discount Groups (SQLite Compatible)
-- ============================================

-- Reset discount groups so the new data always seeds clean
DELETE FROM discount_groups;

-- Insert default discount groups
INSERT INTO discount_groups (code, name, discount_percentage, discount_amount, description, is_active, created_at, updated_at) VALUES
('A', 'Diskon 5%', 5.00, 0.00, 'Diskon 5% untuk semua item', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('B', 'Diskon 10%', 10.00, 0.00, 'Diskon 10% untuk semua item', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('C', 'Diskon 15%', 15.00, 0.00, 'Diskon 15% untuk semua item', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('D', 'Diskon 20%', 20.00, 0.00, 'Diskon 20% untuk semua item', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('E', 'Diskon 25%', 25.00, 0.00, 'Diskon 25% untuk semua item', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('F', 'Diskon 30%', 30.00, 0.00, 'Diskon 30% untuk semua item', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('G', 'Diskon 50%', 50.00, 0.00, 'Diskon 50% untuk semua item', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('H', 'Member VIP', 10.00, 0.00, 'Diskon khusus untuk member VIP', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('I', 'Member Gold', 15.00, 0.00, 'Diskon khusus untuk member Gold', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('J', 'Member Platinum', 20.00, 0.00, 'Diskon khusus untuk member Platinum', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('K', 'Diskon Paket', 5.00, 0.00, 'Diskon khusus untuk pembelian paket', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('L', 'Diskon Bulanan', 10.00, 0.00, 'Diskon untuk sewa bulanan', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('M', 'Diskon Referral', 5.00, 0.00, 'Diskon untuk pelanggan referral', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('N', 'Diskon Event', 15.00, 0.00, 'Diskon khusus untuk event tertentu', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('O', 'Diskon Awal Tahun', 20.00, 0.00, 'Diskon promosi awal tahun', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

