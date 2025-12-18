-- Migration: Buat trigger buat auto-update updated_at timestamp
PRAGMA foreign_keys = ON;

-- Trigger untuk rental_transactions
CREATE TRIGGER IF NOT EXISTS update_rental_transactions_updated_at 
AFTER UPDATE ON rental_transactions
BEGIN
    UPDATE rental_transactions 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger untuk sales_transactions
CREATE TRIGGER IF NOT EXISTS update_sales_transactions_updated_at 
AFTER UPDATE ON sales_transactions
BEGIN
    UPDATE sales_transactions 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger untuk items
CREATE TRIGGER IF NOT EXISTS update_items_updated_at 
AFTER UPDATE ON items
BEGIN
    UPDATE items 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger untuk customers
CREATE TRIGGER IF NOT EXISTS update_customers_updated_at 
AFTER UPDATE ON customers
BEGIN
    UPDATE customers 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger untuk categories
CREATE TRIGGER IF NOT EXISTS update_categories_updated_at 
AFTER UPDATE ON categories
BEGIN
    UPDATE categories 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger untuk accessories
CREATE TRIGGER IF NOT EXISTS update_accessories_updated_at 
AFTER UPDATE ON accessories
BEGIN
    UPDATE accessories 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger untuk bundles
CREATE TRIGGER IF NOT EXISTS update_bundles_updated_at 
AFTER UPDATE ON bundles
BEGIN
    UPDATE bundles 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger untuk cashier_sessions
CREATE TRIGGER IF NOT EXISTS update_cashier_sessions_updated_at 
AFTER UPDATE ON cashier_sessions
BEGIN
    UPDATE cashier_sessions 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger untuk bookings
CREATE TRIGGER IF NOT EXISTS update_bookings_updated_at 
AFTER UPDATE ON bookings
BEGIN
    UPDATE bookings 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

