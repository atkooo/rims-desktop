-- Migration: Add booking overlap prevention triggers
-- Priority: SEDANG - Prevent double booking
-- Date: 2025-01-17

PRAGMA foreign_keys = ON;

-- ============================================
-- Trigger untuk validasi overlap saat INSERT
-- ============================================
CREATE TRIGGER IF NOT EXISTS check_booking_overlap_insert
BEFORE INSERT ON bookings
WHEN NEW.status IN ('pending', 'confirmed')
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.item_id = NEW.item_id
            AND b.id != NEW.id
            AND b.status IN ('pending', 'confirmed')
            AND (
                (NEW.planned_start_date <= b.planned_end_date AND NEW.planned_end_date >= b.planned_start_date)
            )
        )
        THEN RAISE(ABORT, 'Booking overlap detected: Item already booked for this date range')
    END;
END;

-- ============================================
-- Trigger untuk validasi overlap saat UPDATE
-- ============================================
CREATE TRIGGER IF NOT EXISTS check_booking_overlap_update
BEFORE UPDATE ON bookings
WHEN NEW.status IN ('pending', 'confirmed')
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.item_id = NEW.item_id
            AND b.id != NEW.id
            AND b.status IN ('pending', 'confirmed')
            AND (
                (NEW.planned_start_date <= b.planned_end_date AND NEW.planned_end_date >= b.planned_start_date)
            )
        )
        THEN RAISE(ABORT, 'Booking overlap detected: Item already booked for this date range')
    END;
END;

