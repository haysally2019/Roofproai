/*
  # Fix Super Admin user creation policy
  
  1. Changes
    - Fix the INSERT policy to correctly reference the new user's company_id
    - Previous version had u.company_id = u.company_id which was always true
    - Now correctly checks u.company_id = NEW.company_id
    
  2. Security
    - Only authenticated users can create user records
    - Regular users can only create their own profile (id = auth.uid())
    - Super Admins can create users for their own company only
    - Prevents cross-company user creation
*/

-- Drop existing INSERT policy and recreate with correct company_id reference
DROP POLICY IF EXISTS "Users can insert profiles" ON users;

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
        AND u.company_id = users.company_id
      )
    )
  );