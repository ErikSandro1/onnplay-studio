-- OnnPlay Studio Database Schema
-- PostgreSQL/MySQL compatible

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  oauth_provider VARCHAR(50), -- 'google', 'github', null for email/password
  oauth_id VARCHAR(255),
  plan VARCHAR(20) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_stripe_customer (stripe_customer_id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  plan VARCHAR(20) NOT NULL, -- 'free', 'pro', 'enterprise'
  status VARCHAR(20) NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing'
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_stripe_subscription (stripe_subscription_id)
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  streaming_minutes INT DEFAULT 0,
  recording_minutes INT DEFAULT 0,
  ai_commands_count INT DEFAULT 0,
  storage_mb INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_month (user_id, month),
  INDEX idx_user_month (user_id, month)
);

-- Broadcasts table (histórico de transmissões)
CREATE TABLE IF NOT EXISTS broadcasts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  platform VARCHAR(50), -- 'youtube', 'facebook', 'twitch', 'rtmp'
  status VARCHAR(20) NOT NULL, -- 'live', 'ended', 'scheduled'
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_minutes INT,
  viewers_peak INT DEFAULT 0,
  quality VARCHAR(10), -- '720p', '1080p', '4K'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- Recordings table (gravações locais)
CREATE TABLE IF NOT EXISTS recordings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  broadcast_id VARCHAR(36),
  title VARCHAR(255) NOT NULL,
  file_url TEXT,
  file_size_mb DECIMAL(10,2),
  duration_minutes INT,
  quality VARCHAR(10), -- '720p', '1080p', '4K'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id)
);

-- Webhook events table (Stripe webhooks)
CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(36) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  payload JSON NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stripe_event (stripe_event_id),
  INDEX idx_processed (processed)
);

-- API keys table (para integrações futuras)
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);
