/*
  # Fix Commissions Table Schema for Webhook Integration

  ## Changes Made
  
  1. Schema Updates
    - Add `amount_cents` column (bigint) to store commission amounts in cents (matching Stripe's format)
    - Add `stripe_transfer_id` column (text, nullable) to track Stripe Connect transfers
    - Rename `stripe_invoice_id` to `invoice_id` for consistency
    - Keep `amount` column as decimal for backward compatibility (calculated as amount_cents/100)
    
  2. Data Migration
    - Convert any existing `amount` values to `amount_cents` (multiply by 100)
    
  3. Notes
    - This ensures webhook can properly insert commission records
    - SaaS reps can track their earnings accurately
    - Supports Stripe Connect payouts
*/

-- Add new columns
DO $$
BEGIN
  -- Add amount_cents column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'amount_cents'
  ) THEN
    ALTER TABLE commissions ADD COLUMN amount_cents bigint;
  END IF;

  -- Add stripe_transfer_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'stripe_transfer_id'
  ) THEN
    ALTER TABLE commissions ADD COLUMN stripe_transfer_id text;
  END IF;

  -- Rename stripe_invoice_id to invoice_id if stripe_invoice_id exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'stripe_invoice_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'invoice_id'
  ) THEN
    ALTER TABLE commissions RENAME COLUMN stripe_invoice_id TO invoice_id;
  END IF;
END $$;

-- Migrate existing data: convert amount to amount_cents
UPDATE commissions 
SET amount_cents = FLOOR(amount * 100)::bigint 
WHERE amount_cents IS NULL AND amount IS NOT NULL;

-- Make amount_cents NOT NULL with default 0
ALTER TABLE commissions ALTER COLUMN amount_cents SET DEFAULT 0;
ALTER TABLE commissions ALTER COLUMN amount_cents SET NOT NULL;