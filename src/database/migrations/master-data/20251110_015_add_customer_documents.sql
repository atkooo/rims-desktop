-- Migration: Add customer document fields
PRAGMA foreign_keys = ON;

ALTER TABLE customers
ADD COLUMN photo_path VARCHAR(255);

ALTER TABLE customers
ADD COLUMN id_card_image_path VARCHAR(255);

