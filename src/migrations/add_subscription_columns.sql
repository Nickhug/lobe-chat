-- Migration: Add subscription tiers and extra allocations to users table
-- Run this manually against your database

-- Add the subscription columns
ALTER TABLE users
ADD COLUMN subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free',
ADD COLUMN xtra_token INTEGER NOT NULL DEFAULT 0,
ADD COLUMN xtra_tool INTEGER NOT NULL DEFAULT 0;

-- Update all existing users to be on the free tier
UPDATE users SET subscription_tier = 'free';

-- Create an index on subscription_tier for faster lookups
CREATE INDEX idx_users_subscription ON users(subscription_tier);

-- Sample query to update a specific user to a different tier
-- UPDATE users 
-- SET subscription_tier = 'basic', xtra_token = 5000, xtra_tool = 20
-- WHERE id = 'auth0|67e7554a89e732b986334d98';

-- Sample query to update all users from one provider to a specific tier
-- UPDATE users
-- SET subscription_tier = 'pro'
-- WHERE id LIKE 'auth0|%';

-- Create a view for getting subscription information quickly
CREATE OR REPLACE VIEW user_subscriptions AS
SELECT 
  id as user_id, 
  subscription_tier, 
  xtra_token, 
  xtra_tool,
  created_at,
  updated_at
FROM users;

-- Grant permissions if necessary (adjust as needed for your setup)
-- GRANT SELECT ON user_subscriptions TO web_user; 