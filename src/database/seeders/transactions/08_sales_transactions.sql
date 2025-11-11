-- =====================================================
-- RIMS DATA SEEDER: Fresh Sales Transactions & Details
-- =====================================================

-- 1️⃣ Insert sales transactions
INSERT INTO sales_transactions (
    transaction_code,
    customer_id,
    user_id,
    sale_date,
    subtotal,
    discount,
    tax,
    total_amount,
    change_amount,
    notes
)
VALUES
    ('SLS-2025-0001',
        (SELECT id FROM customers WHERE code = 'CUS-001'),
        (SELECT id FROM users WHERE username = 'manager'),
        '2025-10-12',
        1670.00,
        0.00,
        150.00,
        1820.00,
        0.00,
        'Sold as part of gala upsell'
    ),
    ('SLS-2025-0002',
        (SELECT id FROM customers WHERE code = 'CUS-003'),
        (SELECT id FROM users WHERE username = 'staff'),
        '2025-10-25',
        420.00,
        0.00,
        42.00,
        462.00,
        8.00,
        'Kids dress purchase'
    ),
    ('SLS-2025-0003',
        (SELECT id FROM customers WHERE code = 'CUS-002'),
        (SELECT id FROM users WHERE username = 'manager'),
        '2025-10-30',
        3800.00,
        0.00,
        380.00,
        4180.00,
        0.00,
        'Penjualan paket bundling wedding'
    );

-- 2️⃣ Insert sales transaction details
INSERT INTO sales_transaction_details (
    sales_transaction_id,
    item_id,
    quantity,
    sale_price,
    subtotal
)
VALUES
    -- SLS-2025-0001
    ((SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0001'),
        (SELECT id FROM items WHERE code = 'ITM-NEW-001'),
        1, 1250.00, 1250.00
    ),
    ((SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0001'),
        (SELECT id FROM items WHERE code = 'ITM-ACC-001'),
        1, 420.00, 420.00
    ),

    -- SLS-2025-0002
    ((SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0002'),
        (SELECT id FROM items WHERE code = 'ITM-ANK-001'),
        1, 420.00, 420.00
    ),

    -- SLS-2025-0003 (Bundling package sale)
    ((SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0003'),
        (SELECT id FROM items WHERE code = 'ITM-BND-001'),
        1, 3800.00, 3800.00
    );

-- 3️⃣ Insert payments for sales transactions
INSERT INTO payments (
    transaction_type,
    transaction_id,
    payment_date,
    amount,
    payment_method,
    user_id,
    notes
)
VALUES
    -- Payment for SLS-2025-0001
    ('sale',
        (SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0001'),
        '2025-10-12',
        1820.00,
        'card',
        (SELECT id FROM users WHERE username = 'manager'),
        'Full payment via card'
    ),
    -- Payment for SLS-2025-0002
    ('sale',
        (SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0002'),
        '2025-10-25',
        470.00,
        'cash',
        (SELECT id FROM users WHERE username = 'staff'),
        'Full payment with change'
    ),
    -- Payment for SLS-2025-0003
    ('sale',
        (SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0003'),
        '2025-10-30',
        4180.00,
        'card',
        (SELECT id FROM users WHERE username = 'manager'),
        'Full payment via card'
    );
