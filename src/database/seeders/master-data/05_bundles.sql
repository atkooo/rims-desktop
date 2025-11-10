-- =====================================================
-- RIMS DATA SEEDER: Fresh Bundles & Bundle Details
-- =====================================================

-- 1️⃣ Insert new bundles
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
    is_active
)
VALUES
    ('BND-001', 'Paket Pernikahan Rental',
        'Gaun pengantin, jas, dan pelengkap untuk sesi rental pernikahan',
        'rental', 0.00, 280.00, 2, 2, NULL, 1
    ),
    ('BND-002', 'Paket Gala Formal',
        'Gown dan tuxedo untuk gala atau pesta resmi dengan aksesoris pendukung',
        'sale', 2400.00, 0.00, 3, 3, NULL, 1
    );

-- 2️⃣ Insert related bundle details
INSERT INTO bundle_details (
    bundle_id,
    item_id,
    accessory_id,
    quantity,
    notes
)
VALUES
    -- BND-001 : Classic Wedding Rental
    ((SELECT id FROM bundles WHERE code = 'BND-001'),
        (SELECT id FROM items WHERE code = 'ITM-PER-001'),
        NULL, 1, 'Gaun pengantin putih'
    ),
    ((SELECT id FROM bundles WHERE code = 'BND-001'),
        (SELECT id FROM items WHERE code = 'ITM-PER-002'),
        NULL, 1, 'Set jas pengantin modern'
    ),
    ((SELECT id FROM bundles WHERE code = 'BND-001'),
        (SELECT id FROM items WHERE code = 'ITM-ACC-001'),
        NULL, 1, 'Mahkota kristal emas'
    ),

    -- BND-002 : Paket Gala Formal
    ((SELECT id FROM bundles WHERE code = 'BND-002'),
        (SELECT id FROM items WHERE code = 'ITM-ACF-001'),
        NULL, 1, 'Evening gown ruby'
    ),
    ((SELECT id FROM bundles WHERE code = 'BND-002'),
        (SELECT id FROM items WHERE code = 'ITM-ACF-002'),
        NULL, 1, 'Tuxedo midnight'
    ),
    ((SELECT id FROM bundles WHERE code = 'BND-002'),
        NULL,
        (SELECT id FROM accessories WHERE code = 'ACC-003'),
        1, 'Clutch bag'
    );
