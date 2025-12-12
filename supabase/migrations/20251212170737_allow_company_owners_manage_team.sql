/*
  # Allow Company Owners to Manage Team Members

  1. Changes
    - Update users INSERT policy to allow Company Owners to add team members
    - Add users DELETE policy to allow Company Owners to remove team members
    - Maintains security by restricting operations to same company only

  2. Security
    - Company Owners can only add/remove users within their own company
    - Users cannot delete themselves
    - Super Admins retain their existing permissions
*/

-- Drop existing INSERT policy and recreate with Company Owner support
DROP POLICY IF EXISTS "Users can insert profiles" ON users;

CREATE POLICY "Users can insert profiles"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can create their own profile during registration
    id = auth.uid()
    OR
    -- Company Owners can create users within their own company
    (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('Super Admin', 'Company Owner')
        AND u.company_id = users.company_id
      )
    )
  );

-- Add DELETE policy for Company Owners to remove team members
CREATE POLICY "Company owners can delete team members"
  ON users FOR DELETE
  TO authenticated
  USING (
    -- Company Owners can delete users within their own company (but not themselves)
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('Super Admin', 'Company Owner')
      AND u.company_id = users.company_id
      AND users.id != auth.uid()
    )
  );
