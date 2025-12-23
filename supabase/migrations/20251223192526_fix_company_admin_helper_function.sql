/*
  # Fix Company Admin Helper Function

  1. Changes
    - Update am_i_company_admin() to include 'Company Owner' role
    - This allows company owners to view their team members
  
  2. Security
    - Function remains secure with SECURITY DEFINER
    - Only checks authenticated user's own role
*/

-- Drop and recreate the function with Company Owner included
CREATE OR REPLACE FUNCTION public.am_i_company_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Return false immediately if not authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Use exception handler to catch any errors during auth flow
  BEGIN
    SELECT (role = ANY(ARRAY['Company Owner', 'Company Admin', 'Admin', 'Super Admin'])) INTO v_is_admin
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
$function$;
