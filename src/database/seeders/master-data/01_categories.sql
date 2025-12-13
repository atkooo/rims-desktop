-- ============================================
-- Seeder: Categories (SQLite Compatible)
-- ============================================

-- Reset categories so the new taxonomy always seeds clean
DELETE FROM categories;

-- Insert tenant-ready categories that match the requested taxonomy
INSERT INTO categories (name, description, is_active) VALUES
  (
    'Pakaian Adat',
    'Kostum tradisional dari berbagai daerah (Jawa, Bali, Kalimantan, Sumatera, Papua).',
    1
  ),
  (
    'Pakaian Pernikahan',
    'Baju pengantin, jas, kebaya, dan gaun untuk upacara pernikahan.',
    1
  ),
  (
    'Pakaian Acara / Formal',
    'Outfit resmi untuk wisuda, pesta, ulang tahun, dan acara formal lainnya.',
    1
  ),
  (
    'Pakaian Anak-anak',
    'Kostum dan pakaian ukuran anak untuk tema pesta atau sekolah.',
    1
  ),
  (
    'Pakaian Casual / Modern',
    'Fashion harian atau photoshoot, seperti dress kekinian dan batik modern.',
    1
  ),
  (
    'Peralatan Pendukung',
    'Perlengkapan non-pakaian yang dibutuhkan untuk rental (box, gantungan, cover, tas).',
    1
  ),
  (
    'Dekorasi / Properti',
    'Item tambahan untuk event seperti background, tirai, ornamen, dan bunga.',
    1
  );
