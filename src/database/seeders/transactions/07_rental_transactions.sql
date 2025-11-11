-- =====================================================
-- RIMS DATA SEEDER: Fresh Rental Transactions & Details
-- =====================================================

-- 1️⃣ Insert rental transactions
INSERT INTO rental_transactions (
    transaction_code,
    customer_id,
    user_id,
    rental_date,
    planned_return_date,
    actual_return_date,
    total_days,
    subtotal,
    deposit,
    late_fee,
    discount,
    total_amount,
    status,
    notes
)
VALUES
    ('RNT-2025-0001',
        (SELECT id FROM customers WHERE code = 'CUS-001'),
        (SELECT id FROM users WHERE username = 'admin'),
        '2025-10-15',
        '2025-10-18',
        '2025-10-18',
        3,
        450.00,
        150.00,
        0.00,
        50.00,
        550.00,
        'returned',
        'Full wedding set rental'
    ),
    ('RNT-2025-0002',
        (SELECT id FROM customers WHERE code = 'CUS-002'),
        (SELECT id FROM users WHERE username = 'staff'),
        '2025-10-20',
        '2025-10-22',
        NULL,
        2,
        220.00,
        100.00,
        0.00,
        0.00,
        320.00,
        'active',
        'Awaiting fitting schedule'
    );

-- 2️⃣ Insert rental transaction details
INSERT INTO rental_transaction_details (
    rental_transaction_id,
    item_id,
    quantity,
    rental_price,
    subtotal,
    is_returned,
    return_condition,
    notes
)
VALUES
    -- RNT-2025-0001
    ((SELECT id FROM rental_transactions WHERE transaction_code = 'RNT-2025-0001'),
        (SELECT id FROM items WHERE code = 'ITM-PER-001'),
        1, 220.00, 660.00, 1, 'good', 'Dry cleaned after use'
    ),
    ((SELECT id FROM rental_transactions WHERE transaction_code = 'RNT-2025-0001'),
        (SELECT id FROM items WHERE code = 'ITM-PER-002'),
        1, 160.00, 480.00, 1, 'good', 'Minor alterations completed'
    ),

    -- RNT-2025-0002
    ((SELECT id FROM rental_transactions WHERE transaction_code = 'RNT-2025-0002'),
        (SELECT id FROM items WHERE code = 'ITM-ACF-001'),
        1, 85.00, 170.00, 0, NULL, 'Deliver to hotel lobby on 20 Oct'
    );

-- 3️⃣ Insert payments for rental transactions
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
    -- Payment for RNT-2025-0001 (full payment)
    ('rental',
        (SELECT id FROM rental_transactions WHERE transaction_code = 'RNT-2025-0001'),
        '2025-10-15',
        550.00,
        'transfer',
        (SELECT id FROM users WHERE username = 'admin'),
        'Full payment via transfer'
    ),
    -- Payment for RNT-2025-0002 (partial payment)
    ('rental',
        (SELECT id FROM rental_transactions WHERE transaction_code = 'RNT-2025-0002'),
        '2025-10-20',
        150.00,
        'cash',
        (SELECT id FROM users WHERE username = 'staff'),
        'Partial payment, remaining balance pending'
    );
