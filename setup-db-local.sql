-- NEMY Local Database Setup
-- Run this script to create local test database

CREATE DATABASE IF NOT EXISTS nemy_db_local;
USE nemy_db_local;

-- Grant permissions
GRANT ALL PRIVILEGES ON nemy_db_local.* TO 'root'@'localhost';
FLUSH PRIVILEGES;

-- Test connection
SELECT 'Database nemy_db_local created successfully' as status;