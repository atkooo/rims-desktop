-- Migration: Add tax column to rental_transactions
PRAGMA foreign_keys = ON;

ALTER TABLE rental_transactions ADD COLUMN tax DECIMAL(15,2) DEFAULT 0;

