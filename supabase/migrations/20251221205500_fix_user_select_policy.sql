/*
  # Fix User Login RLS Policy

  1. Problem
    - Users getting "Error loading profile" on login because strict RLS policies 
      prevent them from reading their own 'users' record to check their role/company.
  
  2. Solution
    - Add a permissive policy that allows any authenticated user to SELECT 
      their own row in the 'users' table using their auth.uid().
*/

-- Ensure users can always read their own profile data
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());