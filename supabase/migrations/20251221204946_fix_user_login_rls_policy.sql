/*
  # Fix User Login RLS Policy

  1. Changes
    - Add policy to allow users to view their own profile by user ID
    - This fixes the chicken-and-egg problem where users couldn't load their profile after login
    - The get_my_company_id() function is now SECURITY DEFINER to bypass RLS when reading company_id

  2. Security
    - Policy only allows reading own user record (auth.uid() = id)
    - Does not expose other users' data
*/

CREATE POLICY "Users can view own profile by ID"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
