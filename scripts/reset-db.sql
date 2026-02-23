-- Reset loyalty_db database
-- Drops and recreates all tables EXCEPT admins table
-- Usage: psql -U postgres -h 172.31.16.1 -d loyalty_db -f scripts/reset-db.sql

BEGIN;

-- Disable foreign key constraints temporarily
ALTER TABLE IF EXISTS orders DISABLE TRIGGER ALL;

ALTER TABLE IF EXISTS products DISABLE TRIGGER ALL;

ALTER TABLE IF EXISTS merchants DISABLE TRIGGER ALL;

ALTER TABLE IF EXISTS users DISABLE TRIGGER ALL;

ALTER TABLE IF EXISTS rewards DISABLE TRIGGER ALL;

ALTER TABLE IF EXISTS transaction_log DISABLE TRIGGER ALL;

-- Truncate tables (keeps schema, removes data)
TRUNCATE TABLE IF EXISTS transaction_log CASCADE;

TRUNCATE TABLE IF EXISTS rewards CASCADE;

TRUNCATE TABLE IF EXISTS orders CASCADE;

TRUNCATE TABLE IF EXISTS products CASCADE;

TRUNCATE TABLE IF EXISTS merchants CASCADE;

TRUNCATE TABLE IF EXISTS users CASCADE;

-- Re-enable foreign key constraints
ALTER TABLE IF EXISTS orders ENABLE TRIGGER ALL;

ALTER TABLE IF EXISTS products ENABLE TRIGGER ALL;

ALTER TABLE IF EXISTS merchants ENABLE TRIGGER ALL;

ALTER TABLE IF EXISTS users ENABLE TRIGGER ALL;

ALTER TABLE IF EXISTS rewards ENABLE TRIGGER ALL;

ALTER TABLE IF EXISTS transaction_log ENABLE TRIGGER ALL;

-- Reset auto-increment sequences
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

ALTER SEQUENCE IF EXISTS merchants_id_seq RESTART WITH 1;

ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1;

ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1;

ALTER SEQUENCE IF EXISTS rewards_id_seq RESTART WITH 1;

ALTER SEQUENCE IF EXISTS transaction_log_id_seq RESTART WITH 1;

COMMIT;

-- Verify admins table is intact
SELECT COUNT(*) as admin_count FROM admins;