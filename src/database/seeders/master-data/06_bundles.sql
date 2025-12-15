-- ============================================
-- Seeder: Bundles / Packages (SQLite Compatible)
-- ============================================

-- Clear existing bundles and dependent details so the new packages align
DELETE FROM bundle_details;
DELETE FROM bundles;

-- Insert bundled packages with stock tracking and discounts
INSERT INTO bundles (
  code,
  name,
  description,
  bundle_type,
  price,
  rental_price_per_day,
  stock_quantity,
  available_quantity,
  image_path,
  is_active,
  discount_group_id,
  created_at,
  updated_at
) VALUES
  (
    'BD-001',
    'Paket Adat Bali Lengkap',
    'Setelan baju adat Bali, syal batik, dan tas nasional untuk sesi foto tradisional.',
    'rental',
    1350000,
    138000,
    2,
    2,
    'images/bundles/paket-adat-bali.jpg',
    1,
    (SELECT id FROM discount_groups WHERE code = 'E'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'BD-002',
    'Paket Pengantin Jawa',
    'Kebaya pengantin lengkap dengan tiara dan gelang perak, sudah termasuk perhiasan.',
    'both',
    1650000,
    145000,
    2,
    2,
    'images/bundles/paket-pengantin-jawa.jpg',
    1,
    (SELECT id FROM discount_groups WHERE code = 'G'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'BD-003',
    'Paket Styling Modern',
    'Dress casual batik, peralatan pendukung, dan syal untuk sesi event gaya urban.',
    'both',
    850000,
    90000,
    3,
    3,
    'images/bundles/paket-styling-modern.jpg',
    1,
    (SELECT id FROM discount_groups WHERE code = 'H'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'BD-004',
    'Paket Anak & Properti',
    'Kostum anak, dekorasi meja, dan kipas anyaman untuk sesi pesta keluarga lengkap.',
    'rental',
    520000,
    62000,
    3,
    3,
    'images/bundles/paket-anak-properti.jpg',
    1,
    (SELECT id FROM discount_groups WHERE code = 'I'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'BD-005',
    'Paket Aksesori Elegan',
    'Kompilasi tiara, bros, dan kalung untuk tampilan ceremonial dengan aksen mewah.',
    'sale',
    650000,
    0,
    5,
    5,
    'images/bundles/paket-aksesori.jpg',
    1,
    (SELECT id FROM discount_groups WHERE code = 'J'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Bundle details associate each package with its items/accessories
INSERT INTO bundle_details (
  bundle_id,
  item_id,
  accessory_id,
  quantity
) VALUES
  (
    (SELECT id FROM bundles WHERE code = 'BD-001'),
    (SELECT id FROM items WHERE code = 'IT-002'),
    NULL,
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-001'),
    NULL,
    (SELECT id FROM accessories WHERE code = 'AC-002'),
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-001'),
    NULL,
    (SELECT id FROM accessories WHERE code = 'AC-004'),
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-002'),
    (SELECT id FROM items WHERE code = 'IT-001'),
    NULL,
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-002'),
    NULL,
    (SELECT id FROM accessories WHERE code = 'AC-001'),
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-002'),
    NULL,
    (SELECT id FROM accessories WHERE code = 'AC-003'),
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-003'),
    (SELECT id FROM items WHERE code = 'IT-005'),
    NULL,
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-003'),
    (SELECT id FROM items WHERE code = 'IT-007'),
    NULL,
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-003'),
    NULL,
    (SELECT id FROM accessories WHERE code = 'AC-002'),
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-004'),
    (SELECT id FROM items WHERE code = 'IT-004'),
    NULL,
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-004'),
    (SELECT id FROM items WHERE code = 'IT-009'),
    NULL,
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-004'),
    (SELECT id FROM items WHERE code = 'IT-010'),
    NULL,
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-004'),
    NULL,
    (SELECT id FROM accessories WHERE code = 'AC-005'),
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-005'),
    NULL,
    (SELECT id FROM accessories WHERE code = 'AC-001'),
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-005'),
    NULL,
    (SELECT id FROM accessories WHERE code = 'AC-003'),
    1
  ),
  (
    (SELECT id FROM bundles WHERE code = 'BD-005'),
    NULL,
    (SELECT id FROM accessories WHERE code = 'AC-007'),
    1
  );
