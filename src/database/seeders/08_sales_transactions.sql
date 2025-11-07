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
  'Sold as part of gala upsell'),
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
  'Kids dress purchase')
ON CONFLICT(transaction_code) DO UPDATE SET
  customer_id = excluded.customer_id,
  user_id = excluded.user_id,
  sale_date = excluded.sale_date,
  subtotal = excluded.subtotal,
  discount = excluded.discount,
  tax = excluded.tax,
  total_amount = excluded.total_amount,
  payment_method = excluded.payment_method,
  payment_status = excluded.payment_status,
  paid_amount = excluded.paid_amount,
  change_amount = excluded.change_amount,
  notes = excluded.notes,
  updated_at = CURRENT_TIMESTAMP;

DELETE FROM sales_transaction_details
WHERE sales_transaction_id IN (
  SELECT id FROM sales_transactions
  WHERE transaction_code IN ('SLS-2025-0001', 'SLS-2025-0002')
);

INSERT INTO sales_transaction_details (
  sales_transaction_id,
  item_id,
  quantity,
  sale_price,
  subtotal
)
VALUES
((SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0001'),
  (SELECT id FROM items WHERE code = 'ITM-005'),
  1, 1350.00, 1350.00),
((SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0001'),
  (SELECT id FROM items WHERE code = 'ITM-006'),
  1, 950.00, 950.00),
((SELECT id FROM sales_transactions WHERE transaction_code = 'SLS-2025-0002'),
  (SELECT id FROM items WHERE code = 'ITM-004'),
  1, 360.00, 360.00);
