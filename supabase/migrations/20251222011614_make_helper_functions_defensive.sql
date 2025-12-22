/*
  # Make Helper Functions Defensive for Authentication

  1. Issue
    - During authentication, auth.uid() might not be available yet
    - Functions should handle NULL auth.uid() gracefully
    - This prevents "Database error querying schema" during login

  2. Changes
    - Update get_my_company_id() to return NULL instead of failing when auth.uid() is NULL
    - Update am_i_company_admin() to return false instead of failing when auth.uid() is NULL
    - Both functions now handle the authentication flow gracefully

  3. Security
    - Functions remain SECURITY DEFINER to bypass RLS
    - Security is maintained - NULL/false are safe defaults
*/

-- Update get_my_company_id to handle NULL auth.uid()
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Return NULL if not authenticated yet
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the company_id for the authenticated user
  SELECT company_id INTO v_company_id
  FROM public.users 
  WHERE id = auth.uid();
  
  RETURN v_company_id;
END;
$$;

-- Update am_i_company_admin to handle NULL auth.uid()
CREATE OR REPLACE FUNCTION am_i_company_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Return false if not authenticated yet
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is an admin
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'Super Admin')
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, false);
END;
$$;

-- Ensure proper grants
GRANT EXECUTE ON FUNCTION get_my_company_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION am_i_company_admin() TO authenticated, anon;
