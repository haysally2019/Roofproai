/*
  # Fix Companies Table Recursive Policies

  ## Problem
  The companies table UPDATE policy was still querying the users table,
  causing potential recursion issues during data loading.

  ## Solution
  Replace the recursive company update policy with one using the helper function.

  ## Changes
  - Drop existing companies policies
  - Recreate them without recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view companies" ON companies;
DROP POLICY IF EXISTS "Company owners can update their company" ON companies;
DROP POLICY IF EXISTS "Users can insert companies during registration" ON companies;

-- Allow all authenticated users to view all companies
-- (Needed for super admins and to load company data)
CREATE POLICY "Users can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert companies during registration
CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow company admins to update their company using helper function
CREATE POLICY "Admins can update own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (id = get_my_company_id() AND am_i_company_admin())
  WITH CHECK (id = get_my_company_id() AND am_i_company_admin());
