/*
  # Remove All Users Table Recursion - Final Fix

  1. Problem
    - The "Users can view company members after auth" policy has a subquery on users table
    - This creates recursion: policy checks users table → which triggers policy checks → which checks users table...
    - During authentication, this causes "Database error querying schema"

  2. Solution
    - REMOVE the company members viewing policy entirely from users table
    - Keep ONLY the direct "id = auth.uid()" policy for SELECT
    - Create a SECURITY DEFINER function to fetch company members (bypasses RLS)
    - App will use this function instead of direct queries

  3. Security
    - Users can only SELECT their own user record via RLS
    - Company member viewing is done through a secure function
    - No recursion possible
*/

-- Remove the problematic policy
DROP POLICY IF EXISTS "Users can view company members after auth" ON users;

-- Now users table has ONLY these policies:
-- 1. "Users can view own profile" - SELECT where id = auth.uid() (no recursion!)
-- 2. "Users can insert own profile" - INSERT
-- 3. "Users can update own profile" - UPDATE where id = auth.uid()
-- 4. "Admins can delete company members" - DELETE (uses helper functions)

-- Create a SECURITY DEFINER function to get company members
-- This bypasses RLS entirely, so no recursion
CREATE OR REPLACE FUNCTION get_company_members()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  company_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id uuid;
BEGIN
  -- Get the current user's company_id
  SELECT u.company_id INTO user_company_id
  FROM public.users u
  WHERE u.id = auth.uid();
  
  -- Return all users in the same company
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.company_id,
    u.created_at
  FROM public.users u
  WHERE u.company_id = user_company_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_company_members() TO authenticated;

-- Comment explaining the security model
COMMENT ON FUNCTION get_company_members() IS 
'Returns all users in the same company as the authenticated user. Uses SECURITY DEFINER to bypass RLS and prevent recursion during authentication.';
