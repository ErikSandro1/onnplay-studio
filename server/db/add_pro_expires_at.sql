-- Add pro_expires_at column to users table for manual subscription management
ALTER TABLE users ADD COLUMN pro_expires_at TIMESTAMP NULL;
