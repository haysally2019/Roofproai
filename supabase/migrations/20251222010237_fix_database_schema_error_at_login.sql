/*
  # Fix Database Schema Error at Login

  1. Issue
    - Users experiencing "Database error querying schema" at sign in
    - Need to ensure all helper functions have proper grants and configuration

  2. Changes
    - Update get_my_company_id() with explicit search_path
    - Update am_i_company_admin() with explicit search_path and fix role check
    - Grant execute permissions to authenticated users
    - Add comment to track this fix

  3. Security
    - Functions remain SECURITY DEFINER to bypass RLS when needed
    - Still maintain proper access control through auth.uid() checks
*/

-- Update get_my_company_id with proper configuration
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_company_id() TO anon;

-- Update am_i_company_admin with proper configuration and fix role check
CREATE OR REPLACE FUNCTION am_i_company_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'Admin' OR role = 'Super Admin')
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION am_i_company_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION am_i_company_admin() TO anon;

COMMENT ON FUNCTION get_my_company_id IS 'Returns the company_id for the current authenticated user. SECURITY DEFINER allows it to bypass RLS.';
COMMENT ON FUNCTION am_i_company_admin IS 'Checks if the current user is an Admin or Super Admin. SECURITY DEFINER allows it to bypass RLS.';
