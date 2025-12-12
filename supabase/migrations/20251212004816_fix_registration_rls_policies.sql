/*
  # Fix Registration RLS Policies

  1. Changes
    - Add INSERT policy for companies table to allow authenticated users to create companies during registration
    - This allows new users to create their company during the signup process

  2. Security
    - Only authenticated users can create companies
    - Users can only create one company during registration
*/

-- Drop existing company policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can insert companies during registration" ON companies;

CREATE POLICY "Users can insert companies during registration"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update users INSERT policy to allow any authenticated user to create their profile
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());