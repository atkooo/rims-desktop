-- Migration: Create validation triggers for bundle_details
-- Ensures that either item_id or accessory_id must be set (but not both null)
PRAGMA foreign_keys = ON;

CREATE TRIGGER IF NOT EXISTS validate_bundle_detail_item_or_accessory
BEFORE INSERT ON bundle_details
BEGIN
    SELECT CASE
        WHEN (NEW.item_id IS NULL AND NEW.accessory_id IS NULL) THEN
            RAISE(ABORT, 'Either item_id or accessory_id must be provided')
        WHEN (NEW.item_id IS NOT NULL AND NEW.accessory_id IS NOT NULL) THEN
            RAISE(ABORT, 'Only one of item_id or accessory_id can be provided')
    END;
END;

CREATE TRIGGER IF NOT EXISTS validate_bundle_detail_item_or_accessory_update
BEFORE UPDATE ON bundle_details
BEGIN
    SELECT CASE
        WHEN (NEW.item_id IS NULL AND NEW.accessory_id IS NULL) THEN
            RAISE(ABORT, 'Either item_id or accessory_id must be provided')
        WHEN (NEW.item_id IS NOT NULL AND NEW.accessory_id IS NOT NULL) THEN
            RAISE(ABORT, 'Only one of item_id or accessory_id can be provided')
    END;
END;

