/*
  # Add function to get users with auth status

  1. New Functions
    - `get_users_with_auth_status()` - Returns users with their authentication status
      - Joins users table with auth.users to get confirmation status
      - Returns user_id, invited_at, confirmed_at for all users
  
  2. Security
    - Function is SECURITY DEFINER to allow querying auth.users
    - Only accessible to authenticated users
*/

-- Create function to get users with their auth status
CREATE OR REPLACE FUNCTION get_users_with_auth_status()
RETURNS TABLE (
  user_id uuid,
  invited_at timestamptz,
  confirmed_at timestamptz,
  email_confirmed_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    au.invited_at,
    au.confirmed_at,
    au.email_confirmed_at
  FROM users u
  LEFT JOIN auth.users au ON u.id = au.id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_users_with_auth_status() TO authenticated;
