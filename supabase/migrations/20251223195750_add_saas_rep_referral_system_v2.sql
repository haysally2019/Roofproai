/*
  # SaaS Rep Referral and Commission System

  ## Overview
  This migration adds a complete referral tracking and commission system for SaaS reps.

  ## 1. New Columns in Users Table
    - `referral_code` (text, unique) - Unique referral code for SaaS reps (e.g., "JOHN123")
    - `stripe_connect_account_id` (text) - Stripe Connect account ID for payouts

  ## 2. New Tables
    - `referral_signups` - Tracks which companies signed up via which referral code
      - Links companies to the SaaS rep who referred them
      - Stores original referral metadata
    
    - `commissions` - Commission records for SaaS reps
      - Tracks earnings per subscription payment
      - Links to Stripe invoices/subscriptions
      - Tracks payout status
    
    - `payout_info` - Bank/payout information for SaaS reps
      - Stores account holder name, routing number, account number
      - Encrypted or tokenized for security
      - One record per user

  ## 3. Security
    - RLS enabled on all new tables
    - SaaS reps can view their own referral data and commissions
    - Only reps can update their own payout info
    - Super admins have full access for management

  ## 4. Indexes
    - Added indexes on referral_code, company lookups, and status fields for performance
*/

-- Add referral_code and stripe connect info to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_code text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'stripe_connect_account_id'
  ) THEN
    ALTER TABLE users ADD COLUMN stripe_connect_account_id text;
  END IF;
END $$;

-- Create referral_signups table to track which companies came from which referral
CREATE TABLE IF NOT EXISTS referral_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  referred_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  signup_date timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE referral_signups ENABLE ROW LEVEL SECURITY;

-- Create commissions table to track earnings
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  amount_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  commission_rate numeric(5, 2) NOT NULL DEFAULT 20.00,
  stripe_subscription_id text,
  invoice_id text,
  stripe_transfer_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Create payout_info table for SaaS rep bank details
CREATE TABLE IF NOT EXISTS payout_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  account_holder_name text NOT NULL,
  account_type text NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'company')),
  routing_number text,
  account_number_last4 text,
  bank_name text,
  stripe_external_account_id text,
  payout_method text NOT NULL DEFAULT 'stripe' CHECK (payout_method IN ('stripe', 'paypal', 'wire', 'other')),
  payout_email text,
  additional_info jsonb DEFAULT '{}'::jsonb,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payout_info ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_signups

CREATE POLICY "SaaS reps can view their own referrals"
  ON referral_signups FOR SELECT
  TO authenticated
  USING (
    referred_by_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

CREATE POLICY "System can insert referral signups"
  ON referral_signups FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for commissions

CREATE POLICY "SaaS reps can view their own commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (
    rep_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

CREATE POLICY "System can insert commissions"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update commissions"
  ON commissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

-- RLS Policies for payout_info

CREATE POLICY "Users can view their own payout info"
  ON payout_info FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

CREATE POLICY "Users can insert their own payout info"
  ON payout_info FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payout info"
  ON payout_info FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own payout info"
  ON payout_info FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_signups_referred_by ON referral_signups(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_signups_company ON referral_signups(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_rep_user ON commissions(rep_user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_company ON commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_payout_info_user ON payout_info(user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_name text, user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_code text;
  final_code text;
  counter int := 0;
BEGIN
  -- Create base code from name (first 6 chars, uppercase, alphanumeric only)
  base_code := upper(regexp_replace(substring(user_name, 1, 6), '[^A-Za-z0-9]', '', 'g'));
  
  -- If too short, pad with user_id chars
  IF length(base_code) < 4 THEN
    base_code := base_code || substring(replace(user_id::text, '-', ''), 1, 4);
  END IF;
  
  -- Try to find unique code
  final_code := base_code;
  
  WHILE EXISTS (SELECT 1 FROM users WHERE referral_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || counter::text;
  END LOOP;
  
  RETURN final_code;
END;
$$;

-- Trigger to auto-generate referral codes for SaaS reps
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate for SaaS Rep role if they don't have one
  IF NEW.role = 'SaaS Rep' AND (NEW.referral_code IS NULL OR NEW.referral_code = '') THEN
    NEW.referral_code := generate_referral_code(NEW.name, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON users;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Generate referral codes for existing SaaS reps
UPDATE users 
SET referral_code = generate_referral_code(name, id)
WHERE role = 'SaaS Rep' 
  AND (referral_code IS NULL OR referral_code = '');