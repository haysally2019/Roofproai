/*
  # Fix Sales Rep Applicants RLS Policy

  1. Changes
    - Drop existing INSERT policy for sales_rep_applicants
    - Create new permissive INSERT policy that allows public submissions
    - Ensure anonymous users can submit applications without authentication

  2. Security
    - Allow anyone (anon and authenticated) to create applications
    - Maintain strict SELECT/UPDATE policies for super admins only
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Anyone can create applications" ON sales_rep_applicants;

-- Create a new permissive INSERT policy
CREATE POLICY "Allow public application submissions"
  ON sales_rep_applicants
  FOR INSERT
  WITH CHECK (true);
