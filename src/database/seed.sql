-- Seeder untuk database RIMS
-- Contoh: user admin
-- Seeder untuk roles
INSERT INTO roles (id, name, description) VALUES (1, 'admin', 'Administrator');

-- Seeder untuk user admin
INSERT INTO users (username, password_hash, role_id, full_name, is_active)
VALUES ('admin', 'scrypt:af7d505091ea1245cdb786dacfddc922:2826b44e4850c9f2aae06259d87bb446df2f0da64257477b7a4f3c2696ad3367', 1, 'Administrator', 1);
-- Tambahkan data lain sesuai kebutuhan
