/*
  # Fix Sales Rep Applicants Super Admin Access

  1. Problem
    - Super admins cannot see sales rep applicants due to RLS policy checking the users table
    - This causes infinite recursion or fails to authorize properly

  2. Solution
    - Create a simple helper function that directly checks auth.uid() role
    - Update RLS policies to use this helper function
    - Ensure super admins can view and update all applications

  3. Security
    - Only authenticated super admins can view applications
    - Only authenticated super admins can update applications
    - Public (anonymous) users can insert applications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can view all applications" ON sales_rep_applicants;
DROP POLICY IF EXISTS "Super admins can update applications" ON sales_rep_applicants;

-- Create helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policies using the helper function
CREATE POLICY "Super admins can view all applications"
  ON sales_rep_applicants
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update applications"
  ON sales_rep_applicants
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
