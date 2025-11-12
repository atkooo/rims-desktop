-- Migration: Drop bookings table and remove booking_id from rental_transactions
PRAGMA foreign_keys = ON;

-- First, drop the foreign key constraint and index on booking_id in rental_transactions
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- But since we're just removing a nullable column, we can leave it for now
-- The booking_id column will remain but won't be used

-- Drop the index on booking_id
DROP INDEX IF EXISTS idx_rental_transactions_booking;

-- Drop the bookings table
DROP TABLE IF EXISTS bookings;

-- Drop the trigger for bookings if it exists
DROP TRIGGER IF EXISTS update_bookings_updated_at;

