/*
  # Measurement Credits System

  1. New Tables
    - `measurement_credits`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `credits_remaining` (integer, default 0)
      - `total_credits_purchased` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `measurement_credit_transactions`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `user_id` (uuid, references users)
      - `transaction_type` (text: 'purchase' | 'deduction' | 'refund')
      - `amount` (integer)
      - `credits_before` (integer)
      - `credits_after` (integer)
      - `measurement_id` (uuid, nullable, references roof_measurements)
      - `stripe_payment_id` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
    
    - `measurement_credit_packages`
      - `id` (uuid, primary key)
      - `name` (text)
      - `credits` (integer)
      - `price_cents` (integer)
      - `is_active` (boolean, default true)
      - `sort_order` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Company admins can view their own credits
    - Only authenticated users can purchase credits
    - System tracks all credit transactions for audit
*/

-- Create measurement_credits table
CREATE TABLE IF NOT EXISTS measurement_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  credits_remaining integer NOT NULL DEFAULT 0,
  total_credits_purchased integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE measurement_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view own credits"
  ON measurement_credits
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can manage credits"
  ON measurement_credits
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create measurement_credit_transactions table
CREATE TABLE IF NOT EXISTS measurement_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'deduction', 'refund')),
  amount integer NOT NULL,
  credits_before integer NOT NULL,
  credits_after integer NOT NULL,
  measurement_id uuid REFERENCES roof_measurements(id) ON DELETE SET NULL,
  stripe_payment_id text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE measurement_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company transactions"
  ON measurement_credit_transactions
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create transactions"
  ON measurement_credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create measurement_credit_packages table
CREATE TABLE IF NOT EXISTS measurement_credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_cents integer NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE measurement_credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages"
  ON measurement_credit_packages
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Insert default credit packages
INSERT INTO measurement_credit_packages (name, credits, price_cents, sort_order) VALUES
  ('Starter Pack', 10, 4900, 1),
  ('Professional Pack', 25, 9900, 2),
  ('Business Pack', 50, 17900, 3),
  ('Enterprise Pack', 100, 29900, 4)
ON CONFLICT DO NOTHING;

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION deduct_measurement_credit(
  p_company_id uuid,
  p_user_id uuid,
  p_measurement_id uuid
) RETURNS boolean AS $$
DECLARE
  v_credits_before integer;
  v_credits_after integer;
BEGIN
  -- Get current credits
  SELECT credits_remaining INTO v_credits_before
  FROM measurement_credits
  WHERE company_id = p_company_id
  FOR UPDATE;

  -- Check if company has credits record
  IF v_credits_before IS NULL THEN
    -- Create credits record with 0 credits
    INSERT INTO measurement_credits (company_id, credits_remaining, total_credits_purchased)
    VALUES (p_company_id, 0, 0);
    v_credits_before := 0;
  END IF;

  -- Check if enough credits
  IF v_credits_before < 1 THEN
    RETURN false;
  END IF;

  -- Deduct credit
  v_credits_after := v_credits_before - 1;
  
  UPDATE measurement_credits
  SET credits_remaining = v_credits_after,
      updated_at = now()
  WHERE company_id = p_company_id;

  -- Log transaction
  INSERT INTO measurement_credit_transactions (
    company_id,
    user_id,
    transaction_type,
    amount,
    credits_before,
    credits_after,
    measurement_id
  ) VALUES (
    p_company_id,
    p_user_id,
    'deduction',
    1,
    v_credits_before,
    v_credits_after,
    p_measurement_id
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add credits
CREATE OR REPLACE FUNCTION add_measurement_credits(
  p_company_id uuid,
  p_user_id uuid,
  p_credits integer,
  p_stripe_payment_id text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_credits_before integer;
  v_credits_after integer;
BEGIN
  -- Get current credits or initialize
  SELECT credits_remaining INTO v_credits_before
  FROM measurement_credits
  WHERE company_id = p_company_id
  FOR UPDATE;

  IF v_credits_before IS NULL THEN
    INSERT INTO measurement_credits (company_id, credits_remaining, total_credits_purchased)
    VALUES (p_company_id, p_credits, p_credits)
    RETURNING credits_remaining INTO v_credits_after;
    v_credits_before := 0;
  ELSE
    v_credits_after := v_credits_before + p_credits;
    UPDATE measurement_credits
    SET credits_remaining = v_credits_after,
        total_credits_purchased = total_credits_purchased + p_credits,
        updated_at = now()
    WHERE company_id = p_company_id;
  END IF;

  -- Log transaction
  INSERT INTO measurement_credit_transactions (
    company_id,
    user_id,
    transaction_type,
    amount,
    credits_before,
    credits_after,
    stripe_payment_id
  ) VALUES (
    p_company_id,
    p_user_id,
    'purchase',
    p_credits,
    v_credits_before,
    v_credits_after,
    p_stripe_payment_id
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_measurement_credits_company ON measurement_credits(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_company ON measurement_credit_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON measurement_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON measurement_credit_packages(is_active, sort_order);
