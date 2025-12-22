/*
  # Fix Company Members Policy to Avoid Recursion

  1. Issue
    - "Users can view company members" policy has a subquery on users table
    - This can cause recursion when the policy is evaluated
    - Need to use SECURITY DEFINER function instead

  2. Changes
    - Update the company members policy to use get_my_company_id()
    - This function is SECURITY DEFINER and bypasses RLS, preventing recursion

  3. Security
    - Users can still only view members of their own company
    - The SECURITY DEFINER function ensures no recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view company members" ON users;

-- Recreate it using the SECURITY DEFINER function that bypasses RLS
CREATE POLICY "Users can view company members"
  ON users
  FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());
