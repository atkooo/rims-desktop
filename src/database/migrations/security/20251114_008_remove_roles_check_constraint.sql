-- Migration: Remove CHECK constraint from roles table to allow custom roles
PRAGMA foreign_keys = OFF;

-- SQLite doesn't support ALTER TABLE to drop CHECK constraint directly
-- We need to recreate the table without the constraint

-- Step 1: Create new table without CHECK constraint
CREATE TABLE roles_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(20) UNIQUE NOT NULL,
    description VARCHAR(200)
);

-- Step 2: Copy data from old table
INSERT INTO roles_new (id, name, description)
SELECT id, name, description FROM roles;

-- Step 3: Drop old table
DROP TABLE roles;

-- Step 4: Rename new table to original name
ALTER TABLE roles_new RENAME TO roles;

-- Step 5: Re-enable foreign keys
PRAGMA foreign_keys = ON;

-- Note: The UNIQUE constraint on name will be preserved automatically
-- Foreign key constraints from users table will still work

