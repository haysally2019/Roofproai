/*
  # Fix Infinite Recursion in Users Table RLS Policies

  ## Problem
  The RLS policies on the users table were querying the users table itself,
  creating infinite recursion when trying to load user data.

  ## Solution
  1. Create a SECURITY DEFINER function to get current user's company_id
     that bypasses RLS
  2. Replace all recursive policies with ones using this function
  
  ## Changes
  - Drop existing problematic policies
  - Create helper function for getting user's company_id
  - Recreate policies using the helper function
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "View own company users" ON users;
DROP POLICY IF EXISTS "Company owners can delete team members" ON users;

-- Create a security definer function to get current user's company_id
-- This bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$;

-- Create a security definer function to check if current user is admin
CREATE OR REPLACE FUNCTION am_i_company_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Recreate policies using the helper functions
CREATE POLICY "View own company users"
  ON users FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "Company admins can delete team members"
  ON users FOR DELETE
  TO authenticated
  USING (
    am_i_company_admin() 
    AND company_id = get_my_company_id()
  );
