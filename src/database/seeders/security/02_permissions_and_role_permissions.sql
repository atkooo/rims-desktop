-- ============================================
-- Seeder: Permissions & Role Permissions
-- ============================================

-- Insert Permissions
-- Dashboard
INSERT INTO permissions (name, slug, description, module) VALUES
('View Dashboard', 'dashboard.view', 'Akses untuk melihat dashboard', 'dashboard'),

-- Master Data Permissions
('View Categories', 'master.categories.view', 'Akses untuk melihat kategori', 'master'),
('Create Categories', 'master.categories.create', 'Akses untuk membuat kategori', 'master'),
('Update Categories', 'master.categories.update', 'Akses untuk mengubah kategori', 'master'),
('Delete Categories', 'master.categories.delete', 'Akses untuk menghapus kategori', 'master'),

('View Items', 'master.items.view', 'Akses untuk melihat item', 'master'),
('Create Items', 'master.items.create', 'Akses untuk membuat item', 'master'),
('Update Items', 'master.items.update', 'Akses untuk mengubah item', 'master'),
('Delete Items', 'master.items.delete', 'Akses untuk menghapus item', 'master'),
('Generate Barcode Labels', 'master.items.generate-barcode', 'Akses untuk generate label barcode', 'master'),

('View Item Sizes', 'master.item-sizes.view', 'Akses untuk melihat ukuran item', 'master'),
('Create Item Sizes', 'master.item-sizes.create', 'Akses untuk membuat ukuran item', 'master'),
('Update Item Sizes', 'master.item-sizes.update', 'Akses untuk mengubah ukuran item', 'master'),
('Delete Item Sizes', 'master.item-sizes.delete', 'Akses untuk menghapus ukuran item', 'master'),

('View Accessories', 'master.accessories.view', 'Akses untuk melihat aksesoris', 'master'),
('Create Accessories', 'master.accessories.create', 'Akses untuk membuat aksesoris', 'master'),
('Update Accessories', 'master.accessories.update', 'Akses untuk mengubah aksesoris', 'master'),
('Delete Accessories', 'master.accessories.delete', 'Akses untuk menghapus aksesoris', 'master'),

('View Bundles', 'master.bundles.view', 'Akses untuk melihat bundle', 'master'),
('Create Bundles', 'master.bundles.create', 'Akses untuk membuat bundle', 'master'),
('Update Bundles', 'master.bundles.update', 'Akses untuk mengubah bundle', 'master'),
('Delete Bundles', 'master.bundles.delete', 'Akses untuk menghapus bundle', 'master'),

('View Customers', 'master.customers.view', 'Akses untuk melihat pelanggan', 'master'),
('Create Customers', 'master.customers.create', 'Akses untuk membuat pelanggan', 'master'),
('Update Customers', 'master.customers.update', 'Akses untuk mengubah pelanggan', 'master'),
('Delete Customers', 'master.customers.delete', 'Akses untuk menghapus pelanggan', 'master'),

('View Discount Groups', 'master.discount-groups.view', 'Akses untuk melihat grup diskon', 'master'),
('Create Discount Groups', 'master.discount-groups.create', 'Akses untuk membuat grup diskon', 'master'),
('Update Discount Groups', 'master.discount-groups.update', 'Akses untuk mengubah grup diskon', 'master'),
('Delete Discount Groups', 'master.discount-groups.delete', 'Akses untuk menghapus grup diskon', 'master'),

-- Transaction Permissions
('View Rental Transactions', 'transactions.rentals.view', 'Akses untuk melihat transaksi rental', 'transactions'),
('Create Rental Transactions', 'transactions.rentals.create', 'Akses untuk membuat transaksi rental', 'transactions'),
('Update Rental Transactions', 'transactions.rentals.update', 'Akses untuk mengubah transaksi rental', 'transactions'),
('Delete Rental Transactions', 'transactions.rentals.delete', 'Akses untuk menghapus transaksi rental', 'transactions'),
('Process Rental Payment', 'transactions.rentals.payment', 'Akses untuk memproses pembayaran rental', 'transactions'),

('View Sales Transactions', 'transactions.sales.view', 'Akses untuk melihat transaksi penjualan', 'transactions'),
('Create Sales Transactions', 'transactions.sales.create', 'Akses untuk membuat transaksi penjualan', 'transactions'),
('Update Sales Transactions', 'transactions.sales.update', 'Akses untuk mengubah transaksi penjualan', 'transactions'),
('Delete Sales Transactions', 'transactions.sales.delete', 'Akses untuk menghapus transaksi penjualan', 'transactions'),
('Process Sales Payment', 'transactions.sales.payment', 'Akses untuk memproses pembayaran penjualan', 'transactions'),

('View Stock Movements', 'transactions.stock-movements.view', 'Akses untuk melihat pergerakan stok', 'transactions'),
('Create Stock Movements', 'transactions.stock-movements.create', 'Akses untuk membuat pergerakan stok', 'transactions'),
('Update Stock Movements', 'transactions.stock-movements.update', 'Akses untuk mengubah pergerakan stok', 'transactions'),
('Delete Stock Movements', 'transactions.stock-movements.delete', 'Akses untuk menghapus pergerakan stok', 'transactions'),

('Manage Cashier Sessions', 'transactions.cashier.manage', 'Akses untuk mengelola sesi kasir', 'transactions'),

-- Reports Permissions
('View Transaction Reports', 'reports.transactions.view', 'Akses untuk melihat laporan transaksi', 'reports'),
('View Stock Reports', 'reports.stock.view', 'Akses untuk melihat laporan stok', 'reports'),

-- Settings Permissions
('View Settings', 'settings.view', 'Akses untuk melihat pengaturan', 'settings'),
('Update Settings', 'settings.update', 'Akses untuk mengubah pengaturan', 'settings'),
('View Backup History', 'settings.backup.view', 'Akses untuk melihat riwayat backup', 'settings'),
('Manage Backup', 'settings.backup.manage', 'Akses untuk mengelola backup', 'settings'),
('View Activity Logs', 'settings.activity-logs.view', 'Akses untuk melihat log aktivitas', 'settings'),

-- User Management Permissions
('View Users', 'users.view', 'Akses untuk melihat user', 'users'),
('Create Users', 'users.create', 'Akses untuk membuat user', 'users'),
('Update Users', 'users.update', 'Akses untuk mengubah user', 'users'),
('Delete Users', 'users.delete', 'Akses untuk menghapus user', 'users'),

-- Role Management Permissions
('View Roles', 'roles.view', 'Akses untuk melihat role', 'roles'),
('Create Roles', 'roles.create', 'Akses untuk membuat role', 'roles'),
('Update Roles', 'roles.update', 'Akses untuk mengubah role', 'roles'),
('Delete Roles', 'roles.delete', 'Akses untuk menghapus role', 'roles'),
('Manage Role Permissions', 'roles.permissions.manage', 'Akses untuk mengelola permission role', 'roles');

-- Assign Permissions to Roles
-- ADMIN: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin';

-- MANAGER: Most permissions except user/role management and settings management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
AND p.slug NOT IN (
    'users.view', 'users.create', 'users.update', 'users.delete',
    'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'roles.permissions.manage',
    'settings.backup.manage',
    'master.categories.delete', 'master.items.delete', 'master.item-sizes.delete',
    'master.accessories.delete', 'master.bundles.delete', 'master.customers.delete',
    'master.discount-groups.delete',
    'transactions.rentals.delete', 'transactions.sales.delete',
    'transactions.stock-movements.delete'
);

-- STAFF: Basic permissions for transactions and viewing master data
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'staff'
AND p.slug IN (
    'dashboard.view',
    'master.categories.view', 'master.items.view', 'master.items.generate-barcode', 'master.item-sizes.view',
    'master.accessories.view', 'master.bundles.view', 'master.customers.view',
    'master.discount-groups.view',
    'transactions.rentals.view', 'transactions.rentals.create', 'transactions.rentals.update',
    'transactions.rentals.payment',
    'transactions.sales.view', 'transactions.sales.create', 'transactions.sales.update',
    'transactions.sales.payment',
    'transactions.stock-movements.view', 'transactions.cashier.manage',
    'settings.view', 'settings.backup.view', 'settings.activity-logs.view'
);

-- KASIR: Limited permissions for transactions only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'kasir'
AND p.slug IN (
    'dashboard.view',
    'master.items.view', 'master.accessories.view', 'master.bundles.view',
    'master.customers.view', 'master.discount-groups.view',
    'transactions.rentals.view', 'transactions.rentals.create', 'transactions.rentals.update',
    'transactions.rentals.payment',
    'transactions.sales.view', 'transactions.sales.create', 'transactions.sales.update',
    'transactions.sales.payment',
    'transactions.cashier.manage'
);

-- TAX: Role management permissions (if role exists)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'tax'
AND p.slug IN (
    'roles.view', 'roles.create', 'roles.update', 'roles.delete', 'roles.permissions.manage'
);

