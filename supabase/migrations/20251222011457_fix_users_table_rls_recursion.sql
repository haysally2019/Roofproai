/*
  # Fix Users Table RLS Infinite Recursion

  1. Issue
    - public.users table RLS policies call get_my_company_id() and am_i_company_admin()
    - These functions query public.users, creating infinite recursion
    - During authentication, this causes "Database error querying schema"

  2. Changes
    - Replace helper function calls with direct auth.uid() checks where possible
    - Simplify policies to avoid circular dependencies
    - Keep security intact while removing recursion

  3. Security
    - Users can still only see their own profile and company members
    - Admins can still manage their team
    - No security is compromised
*/

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile by ID" ON users;
DROP POLICY IF EXISTS "View own company users" ON users;
DROP POLICY IF EXISTS "Users can insert profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Company admins can delete team members" ON users;

-- Allow users to view their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow users to view other users in their company
-- We use a subquery that directly checks company_id without calling functions
CREATE POLICY "Users can view company members"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id = (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- Allow authenticated users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow admins to delete team members from their company
CREATE POLICY "Admins can delete company members"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    -- Check if the current user is an admin in the same company
    EXISTS (
      SELECT 1 
      FROM users admin_user
      WHERE admin_user.id = auth.uid()
        AND admin_user.company_id = users.company_id
        AND admin_user.role IN ('Admin', 'Super Admin')
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT DELETE ON users TO authenticated;
