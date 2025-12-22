/*
  # Fix Stripe Customers RLS Policy During Authentication

  1. Issue
    - stripe_customers table has RLS policy that calls auth.uid()
    - During authentication, auth.uid() isn't available yet
    - Foreign key constraint from stripe_customers to auth.users triggers RLS check
    - This causes "Database error querying schema" for some users

  2. Changes
    - Drop the existing RLS policy on stripe_customers
    - Recreate with a policy that doesn't fail during authentication
    - Allow service role to bypass for backend operations

  3. Security
    - Users can still only see their own customer records
    - Service role can manage all records for webhook processing
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;

-- Create new policy that allows authenticated users to see their own data
-- This policy will not be evaluated during the authentication process
CREATE POLICY "Users can view own stripe customer"
  ON stripe_customers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow service role to manage all customer records (for webhooks)
CREATE POLICY "Service role can manage all customers"
  ON stripe_customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON stripe_customers TO authenticated;
GRANT ALL ON stripe_customers TO service_role;
