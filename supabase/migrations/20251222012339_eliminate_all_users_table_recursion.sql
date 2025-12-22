/*
  # Eliminate All Users Table Recursion Issues

  1. Problem
    - Multiple policies across different tables have EXISTS subqueries that query public.users
    - The users table DELETE policy queries users FROM WITHIN the users table policy
    - During authentication, these recursive queries cause "Database error querying schema"
    
  2. Solution
    - Create helper functions with SECURITY DEFINER that bypass RLS
    - Replace all EXISTS subqueries on users table with function calls
    - This breaks the recursion chain
    
  3. Security
    - All helper functions use SECURITY DEFINER to safely bypass RLS
    - Functions are read-only and only return boolean/uuid values
    - No security is compromised
*/

-- Helper function to check if current user is in a specific company (no recursion)
CREATE OR REPLACE FUNCTION user_in_company(check_company_id uuid)
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
  
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND company_id = check_company_id
  );
END;
$$;

-- Helper function to check if current user is Super Admin (no recursion)
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
  
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role = 'Super Admin'
  );
END;
$$;

-- Helper function to check if user is admin@altusai.com (no recursion)
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
  
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND email = 'admin@altusai.com'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION user_in_company(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION am_i_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION am_i_system_admin() TO authenticated, anon;

-- Now update all problematic policies

-- Fix call_logs policies
DROP POLICY IF EXISTS "Users can delete call logs for their company" ON call_logs;
DROP POLICY IF EXISTS "Users can update call logs for their company" ON call_logs;

CREATE POLICY "Users can delete call logs for their company"
  ON call_logs FOR DELETE
  TO authenticated
  USING (user_in_company(company_id));

CREATE POLICY "Users can update call logs for their company"
  ON call_logs FOR UPDATE
  TO authenticated
  USING (user_in_company(company_id))
  WITH CHECK (user_in_company(company_id));

-- Fix commissions policies
DROP POLICY IF EXISTS "Super Admins can view all commissions" ON commissions;

CREATE POLICY "Super Admins can view all commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (am_i_super_admin());

-- Fix events policies
DROP POLICY IF EXISTS "Users can delete events for their company" ON events;
DROP POLICY IF EXISTS "Users can update events for their company" ON events;

CREATE POLICY "Users can delete events for their company"
  ON events FOR DELETE
  TO authenticated
  USING (user_in_company(company_id));

CREATE POLICY "Users can update events for their company"
  ON events FOR UPDATE
  TO authenticated
  USING (user_in_company(company_id))
  WITH CHECK (user_in_company(company_id));

-- Fix material_orders policies
DROP POLICY IF EXISTS "Users can delete material orders for their company" ON material_orders;
DROP POLICY IF EXISTS "Users can update material orders for their company" ON material_orders;

CREATE POLICY "Users can delete material orders for their company"
  ON material_orders FOR DELETE
  TO authenticated
  USING (user_in_company(company_id));

CREATE POLICY "Users can update material orders for their company"
  ON material_orders FOR UPDATE
  TO authenticated
  USING (user_in_company(company_id))
  WITH CHECK (user_in_company(company_id));

-- Fix software_leads policy
DROP POLICY IF EXISTS "Admin Access Only" ON software_leads;

CREATE POLICY "Admin Access Only"
  ON software_leads FOR ALL
  TO authenticated
  USING (am_i_system_admin())
  WITH CHECK (am_i_system_admin());

-- Fix the CRITICAL users table DELETE policy (this was causing the main recursion!)
DROP POLICY IF EXISTS "Admins can delete company members" ON users;

CREATE POLICY "Admins can delete company members"
  ON users FOR DELETE
  TO authenticated
  USING (
    -- User being deleted must be in same company as current user
    company_id = get_my_company_id()
    -- Current user must be an admin
    AND am_i_company_admin()
  );
