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
('BND-001', 'Classic Wedding Rental',
  'Wedding dress, suit, and essential accessories for 3-day rental',
  'rental', 0.00, 210.00, 2, 2, NULL, 1),
('BND-002', 'Evening Gala Couple',
  'Coordinated sale bundle for gala events',
  'sale', 2600.00, 0.00, 3, 3, NULL, 1)
ON CONFLICT(code) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  bundle_type = excluded.bundle_type,
  price = excluded.price,
  rental_price_per_day = excluded.rental_price_per_day,
  stock_quantity = excluded.stock_quantity,
  available_quantity = excluded.available_quantity,
  image_path = excluded.image_path,
  is_active = excluded.is_active,
  updated_at = CURRENT_TIMESTAMP;

DELETE FROM bundle_details
WHERE bundle_id IN (
  SELECT id FROM bundles WHERE code IN ('BND-001', 'BND-002')
);

INSERT INTO bundle_details (
  bundle_id,
  item_id,
  accessory_id,
  quantity,
  notes
)
VALUES
((SELECT id FROM bundles WHERE code = 'BND-001'),
  (SELECT id FROM items WHERE code = 'ITM-001'),
  NULL, 1, 'Bride gown'),
((SELECT id FROM bundles WHERE code = 'BND-001'),
  (SELECT id FROM items WHERE code = 'ITM-002'),
  NULL, 1, 'Groom suit'),
((SELECT id FROM bundles WHERE code = 'BND-001'),
  NULL,
  (SELECT id FROM accessories WHERE code = 'ACC-001'),
  1, 'Silver necklace'),
((SELECT id FROM bundles WHERE code = 'BND-002'),
  (SELECT id FROM items WHERE code = 'ITM-005'),
  NULL, 1, 'Evening gown'),
((SELECT id FROM bundles WHERE code = 'BND-002'),
  (SELECT id FROM items WHERE code = 'ITM-006'),
  NULL, 1, 'Dinner jacket'),
((SELECT id FROM bundles WHERE code = 'BND-002'),
  NULL,
  (SELECT id FROM accessories WHERE code = 'ACC-003'),
  1, 'Clutch bag');
