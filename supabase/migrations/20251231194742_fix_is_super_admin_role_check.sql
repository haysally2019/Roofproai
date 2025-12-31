/*
  # Fix is_super_admin() Function Role Check

  1. Problem
    - The is_super_admin() function checks for role = 'super_admin'
    - But the actual role value in the database is 'Super Admin' (with space and capitals)
    - This causes super admins to not be able to see applicants

  2. Solution
    - Update the function to check for 'Super Admin' instead
    - This will allow users with the Super Admin role to view and manage applications

  3. Security
    - No security changes, just fixing the role value check
*/

-- Update the is_super_admin function to check for the correct role value
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'Super Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
