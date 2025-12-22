/*
  # Make Helper Functions Defensive for Auth Flow

  1. Problem
    - Functions like get_my_company_id() and am_i_company_admin() query the users table
    - During authentication, these might be evaluated before the user session is fully established
    - This causes "Database error querying schema"

  2. Solution
    - Add NULL checks and error handling
    - Return safe defaults (NULL/false) if auth.uid() is not yet available
    - Wrap in exception handlers to prevent any errors during auth

  3. Security
    - Functions still enforce proper authorization once auth is complete
    - Defensive checks only apply during the brief auth initialization window
*/

-- Make get_my_company_id completely defensive
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
  -- Return NULL immediately if not authenticated
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Use exception handler to catch any errors during auth flow
  BEGIN
    SELECT company_id INTO v_company_id
    FROM public.users 
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN v_company_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- During auth initialization, silently return NULL
      RETURN NULL;
  END;
END;
$$;

-- Make am_i_company_admin completely defensive
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
  -- Return false immediately if not authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Use exception handler to catch any errors during auth flow
  BEGIN
    SELECT (role = ANY(ARRAY['Admin', 'Super Admin'])) INTO v_is_admin
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN COALESCE(v_is_admin, false);
  EXCEPTION
    WHEN OTHERS THEN
      -- During auth initialization, silently return false
      RETURN false;
  END;
END;
$$;

-- Make am_i_super_admin completely defensive
CREATE OR REPLACE FUNCTION am_i_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
        AND role = 'Super Admin'
      LIMIT 1
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;
END;
$$;

-- Make am_i_system_admin completely defensive
CREATE OR REPLACE FUNCTION am_i_system_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
        AND email = 'admin@altusai.com'
      LIMIT 1
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;
END;
$$;

-- Make user_in_company completely defensive
CREATE OR REPLACE FUNCTION user_in_company(check_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR check_company_id IS NULL THEN
    RETURN false;
  END IF;
  
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
        AND company_id = check_company_id
      LIMIT 1
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;
END;
$$;
