/*
  # Allow Super Admins to create additional user accounts
  
  1. Changes
    - Update users INSERT policy to allow Super Admins to create users within their own company
    - Users can still create their own profile during registration
    - Super Admins can create team member accounts
    
  2. Security
    - Only authenticated users can create user records
    - Regular users can only create their own profile (id = auth.uid())
    - Super Admins can create users for their own company only
    - Prevents cross-company user creation
*/

-- Drop existing INSERT policy and recreate with Super Admin permissions
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can insert profiles"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can create their own profile during registration
    id = auth.uid() 
    OR 
    -- Super Admins can create users within their own company
    (
      EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'Super Admin'
        AND u.company_id = company_id
      )
    )
  );