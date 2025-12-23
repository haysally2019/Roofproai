/*
  # Fix Subscription Tier User Limits

  1. Changes
    - Update default max_users from 3 to 5 (Starter tier default)
    - Update existing companies with correct max_users based on their tier
    - Set proper tier and max_users for all tiers:
      - Starter: 5 users
      - Professional: 15 users  
      - Enterprise: 999 users (unlimited)

  2. Security
    - No RLS changes needed, only data fixes
*/

-- Update default max_users for new companies
ALTER TABLE companies 
  ALTER COLUMN max_users SET DEFAULT 5;

-- Update existing companies to have correct max_users based on their tier
UPDATE companies 
SET max_users = 5 
WHERE tier = 'Starter' OR tier = 'starter';

UPDATE companies 
SET max_users = 15 
WHERE tier = 'Professional' OR tier = 'professional';

UPDATE companies 
SET max_users = 999 
WHERE tier = 'Enterprise' OR tier = 'enterprise';

-- Ensure tier values are properly capitalized
UPDATE companies 
SET tier = 'Starter' 
WHERE LOWER(tier) = 'starter';

UPDATE companies 
SET tier = 'Professional' 
WHERE LOWER(tier) = 'professional';

UPDATE companies 
SET tier = 'Enterprise' 
WHERE LOWER(tier) = 'enterprise';
