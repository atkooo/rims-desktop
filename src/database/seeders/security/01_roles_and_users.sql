-- ============================================
-- Seeder: Roles & Users (SQLite Compatible)
-- ============================================

-- Insert roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('manager', 'Manager with moderate access'),
  ('staff', 'Staff with basic access'),
  ('kasir', 'Kasir with transaction access only');

-- Create default users
-- (passwords: Admin123!, Manager123!, Staff123!, Kasir123!)
INSERT INTO users (username, password_hash, full_name, email, role_id, is_active)
VALUES
  ('admin',
   'scrypt:6b3f61e43908895b776df95894318f8f:17e91691e4340bbd50dd7fc88d42d09649bdb1784e41c079b3c829eb7fccc150',
   'System Administrator',
   'admin@rims.com',
   (SELECT id FROM roles WHERE name = 'admin'),
   1
  ),
  ('manager',
   'scrypt:7c550d49c1659e843a93519f156d307a:f9df7d4616256750bb23a19b1fdb47210d777dd7fb0e7acacd6bea8f84f8559b',
   'Store Manager',
   'manager@rims.com',
   (SELECT id FROM roles WHERE name = 'manager'),
   1
  ),
  ('staff',
   'scrypt:6ec31e3af54f46f4c72d8fcadac58388:89573c7322d7c7ef02abde393d672b4a9e4eaf5d125a2a9d5349e62fa0c7f230',
   'Front Desk Staff',
   'staff@rims.com',
   (SELECT id FROM roles WHERE name = 'staff'),
   1
  ),
  ('kasir',
   'scrypt:f909b0045fc8a73bc88e97d6ff70bc6c:16594eeadb64b5a4d4077e13352e0cda5b0e1453d7355cfe5fdc47b9fbb8df30',
   'Kasir Toko',
   'kasir@rims.com',
   (SELECT id FROM roles WHERE name = 'kasir'),
   1
  );
