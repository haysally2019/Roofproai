/*
  # Allow Super Admins to view all users
  
  1. Changes
    - Add policy to allow Super Admins to view all users in the users table
    - This is needed so Super Admins can see SaaS Reps and other users in their dashboard
  
  2. Security
    - Policy uses am_i_super_admin() function to verify the user is a Super Admin
    - Only applies to SELECT operations
*/

-- Add policy for Super Admins to view all users
CREATE POLICY "Super Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (am_i_super_admin());
