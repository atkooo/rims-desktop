TRUNCATE TABLE accessories RESTART IDENTITY CASCADE;

INSERT INTO accessories (code, name, description, purchase_price, rental_price_per_day, sale_price, stock_quantity, available_quantity, min_stock_alert, image_path, is_available_for_rent, is_available_for_sale, is_active)
VALUES
('ACC-001', 'Silver Necklace', 'Elegant silver necklace', 10.00, 1.00, 25.00, 10, 10, 1, NULL, 1, 1, 1),
('ACC-002', 'Leather Belt', 'Brown leather belt', 8.00, 0.50, 15.00, 20, 20, 2, NULL, 1, 1, 1),
('ACC-003', 'Clutch Bag', 'Evening clutch bag', 20.00, 2.00, 45.00, 5, 5, 1, NULL, 1, 1, 1);
