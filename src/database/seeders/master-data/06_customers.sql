-- =====================================================
-- RIMS DATA SEEDER: Fresh Customers
-- =====================================================

INSERT INTO customers (
    code,
    name,
    phone,
    email,
    address,
    id_card_number,
    notes,
    is_active
)
VALUES
    ('CUS-001', 'Nadia Pratama', '0812-000-111',
        'nadia.pratama@example.com',
        'Jl. Melati No. 12, Bandung',
        '3201011501900001',
        'Prefers weekend pickup schedule',
        1
    ),
    ('CUS-002', 'Bima Hadiwijaya', '0812-000-222',
        'bima.hadi@example.com',
        'Jl. Kenanga No. 5, Bandung',
        '3201020402880002',
        'Needs express fitting notifications',
        1
    ),
    ('CUS-003', 'Clara Sembiring', '0812-000-333',
        'clara.sembiring@example.com',
        'Jl. Anggrek No. 9, Bandung',
        '3201032304920003',
        'Often purchases kids collection',
        1
    );
