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
    payment_method,
    payment_status,
    paid_amount,
    change_amount,
    notes
)
VALUES
    ('SLS-2025-0001',
        (SELECT id FROM customers WHERE code = 'CUS-001'),
        (SELECT id FROM users WHERE username = 'manager'),
        '2025-10-12',
        2300.00,
        100.00,
        120.00,
        2320.00,
        'card',
        'paid',
        2320.00,
        0.00,
        'Sold as part of gala upsell'
    ),
    ('SLS-2025-0002',
        (SELECT id FROM customers WHERE code = 'CUS-003'),
        (SELECT id FROM users WHERE username = 'staff'),
        '2025-10-25',
        360.00,
        0.00,
        36.00,
        396.00,
        'cash',
        'paid',
        400.00,
        4.00,
        'Kids dress purchase'
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
        (SELECT id FROM items WHERE code = 'ITM-005'),
        1, 1350.00, 1350.00
    ),
    ((SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0001'),
        (SELECT id FROM items WHERE code = 'ITM-006'),
        1, 950.00, 950.00
    ),

    -- SLS-2025-0002
    ((SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0002'),
        (SELECT id FROM items WHERE code = 'ITM-004'),
        1, 360.00, 360.00
    );
