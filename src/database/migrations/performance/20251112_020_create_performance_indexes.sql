-- Migration: Create performance indexes
-- This improves query performance for frequently accessed columns
PRAGMA foreign_keys = ON;

-- Stock Movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON stock_movements(user_id);

-- Items indexes
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_size ON items(size_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_code ON items(code);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_type, transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- Bundle Details indexes
CREATE INDEX IF NOT EXISTS idx_bundle_details_bundle ON bundle_details(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_details_item ON bundle_details(item_id);
CREATE INDEX IF NOT EXISTS idx_bundle_details_accessory ON bundle_details(accessory_id);

-- Activity Logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at);

-- Backup History indexes
CREATE INDEX IF NOT EXISTS idx_backup_history_user ON backup_history(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_date ON backup_history(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);

