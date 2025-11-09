-- ============================================
-- Seeder: Items (SQLite Compatible)
-- ============================================

-- Insert default items
INSERT INTO items (
  code,
  name,
  category_id,
  description,
  purchase_price,
  rental_price_per_day,
  sale_price,
  price,
  stock_quantity,
  available_quantity,
  min_stock_alert,
  image_path,
  is_available_for_rent,
  is_available_for_sale,
  is_active,
  type,
  status,
  size_id
)
VALUES
  ('ITM-001', 'Elegant Wedding Dress',
    (SELECT id FROM categories WHERE name = 'Dresses'),
    'Lace wedding gown with cathedral train',
    800.00, 85.00, 1450.00, 1450.00, 5, 4, 1, NULL, 1, 1, 1, 'RENTAL', 'AVAILABLE',
    (SELECT id FROM item_sizes WHERE code = 'SIZE-M')
  ),
  ('ITM-002', 'Classic Black Suit',
    (SELECT id FROM categories WHERE name = 'Suits'),
    'Tailored slim-fit tuxedo set',
    600.00, 65.00, 1200.00, 1200.00, 6, 5, 1, NULL, 1, 1, 1, 'RENTAL', 'AVAILABLE',
    (SELECT id FROM item_sizes WHERE code = 'SIZE-L')
  ),
  ('ITM-003', 'Traditional Kebaya Set',
    (SELECT id FROM categories WHERE name = 'Traditional'),
    'Handmade kebaya with batik sarong',
    550.00, 110.00, 1300.00, 1300.00, 3, 2, 1, NULL, 1, 1, 1, 'RENTAL', 'AVAILABLE',
    (SELECT id FROM item_sizes WHERE code = 'SIZE-M')
  ),
  ('ITM-004', 'Kids Party Dress',
    (SELECT id FROM categories WHERE name = 'Kids'),
    'Pastel flower girl dress',
    200.00, 40.00, 360.00, 360.00, 8, 7, 2, NULL, 1, 1, 1, 'RENTAL', 'AVAILABLE',
    (SELECT id FROM item_sizes WHERE code = 'SIZE-KIDS')
  ),
  ('ITM-005', 'Ruby Evening Gown',
    (SELECT id FROM categories WHERE name = 'Dresses'),
    'Mermaid-cut sequined gown',
    650.00, 90.00, 1350.00, 1350.00, 4, 3, 1, NULL, 1, 1, 1, 'RENTAL', 'AVAILABLE',
    (SELECT id FROM item_sizes WHERE code = 'SIZE-L')
  ),
  ('ITM-006', 'Velvet Dinner Jacket',
    (SELECT id FROM categories WHERE name = 'Suits'),
    'Deep navy velvet jacket for formal dinners',
    450.00, 55.00, 950.00, 950.00, 5, 4, 1, NULL, 1, 1, 1, 'RENTAL', 'AVAILABLE',
    (SELECT id FROM item_sizes WHERE code = 'SIZE-M')
  );
