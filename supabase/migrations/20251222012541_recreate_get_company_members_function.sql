/*
  # Recreate get_company_members Function with Correct Columns

  1. Changes
    - Drop existing function
    - Recreate with actual columns from users table (no full_name)
*/

DROP FUNCTION IF EXISTS get_company_members();

CREATE FUNCTION get_company_members()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
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
    u.name,
    u.role,
    u.company_id,
    u.created_at
  FROM public.users u
  WHERE u.company_id = user_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_company_members() TO authenticated;
