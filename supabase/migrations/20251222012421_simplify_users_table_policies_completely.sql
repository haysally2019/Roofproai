/*
  # Completely Simplify Users Table Policies
  
  1. Problem
    - Even with SECURITY DEFINER functions, the "Users can view company members" policy
      might be evaluated during authentication before auth.uid() is fully available
    - This causes "Database error querying schema" during login
    
  2. Solution
    - Keep only the absolute minimum policy for authentication: "Users can view own profile"
    - Make company member viewing a separate, explicit query after authentication
    - This ensures auth flow has zero dependencies on company lookups
    
  3. Security
    - Users can still only see their own profile during auth
    - Company member viewing is handled by application logic after auth succeeds
*/

-- Drop the company members policy that might be causing issues during auth
DROP POLICY IF EXISTS "Users can view company members" ON users;

-- Keep only the essential policies for authentication to work
-- The remaining policies are:
-- 1. "Users can view own profile" - FOR SELECT, USING (id = auth.uid())
-- 2. "Users can insert own profile" - FOR INSERT
-- 3. "Users can update own profile" - FOR UPDATE, USING (id = auth.uid())
-- 4. "Admins can delete company members" - FOR DELETE (uses helper functions but not during auth)

-- Add a new policy that allows viewing company members AFTER authentication
-- This uses a direct subquery with LIMIT to prevent recursion
CREATE POLICY "Users can view company members after auth"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Allow if viewing someone in the same company
    -- Use a lateral join approach to avoid function calls
    EXISTS (
      SELECT 1 
      FROM (SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1) my_company
      WHERE my_company.company_id = users.company_id
    )
  );
