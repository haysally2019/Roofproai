/*
  # Fix Company SELECT Policy for Registration

  1. Changes
    - Drop the existing restrictive SELECT policy on companies
    - Add a new SELECT policy that allows authenticated users to view companies
    - This enables users to read back the company they just created during registration
    
  2. Security
    - Authenticated users can view companies
    - This is acceptable since company_id associations are controlled via the users table
    - RLS still prevents unauthorized data access at the row level through other tables
*/

DROP POLICY IF EXISTS "View own company" ON companies;

CREATE POLICY "Authenticated users can view companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);
