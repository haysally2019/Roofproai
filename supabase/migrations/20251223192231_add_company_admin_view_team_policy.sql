/*
  # Allow Company Admins to View Team Members

  1. Changes
    - Add SELECT policy for company admins/owners to view users in their company
  
  2. Security
    - Company admins can only view users within their own company
    - Uses existing helper function get_my_company_id() and am_i_company_admin()
*/

-- Drop policy if it exists and recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Company admins can view team members" ON users;
END $$;

-- Add policy for company admins to view their team members
CREATE POLICY "Company admins can view team members"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_my_company_id() 
    AND am_i_company_admin()
  );
