-- ============================================
-- Seeder: Users (SQLite Compatible)
-- ============================================

-- Create default users
-- (passwords: Admin123!, Kasir123!)
INSERT INTO users (username, password_hash, full_name, email, role, is_active)
VALUES
  ('admin',
   'scrypt:6b3f61e43908895b776df95894318f8f:17e91691e4340bbd50dd7fc88d42d09649bdb1784e41c079b3c829eb7fccc150',
   'System Administrator',
   'admin@rims.com',
   'admin',
   1
  ),
  ('kasir',
   'scrypt:f909b0045fc8a73bc88e97d6ff70bc6c:16594eeadb64b5a4d4077e13352e0cda5b0e1453d7355cfe5fdc47b9fbb8df30',
   'Kasir Toko',
   'kasir@rims.com',
   'kasir',
   1
  );

