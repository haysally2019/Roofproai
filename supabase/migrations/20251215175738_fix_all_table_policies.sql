/*
  # Fix All RLS Policies to Remove Recursion

  ## Problem
  All table policies were querying the users table, causing infinite recursion.

  ## Solution
  Replace all recursive policy checks with the helper function get_my_company_id()
  that safely retrieves the current user's company_id without recursion.

  ## Changes
  - Drop all existing policies that query the users table
  - Recreate them using get_my_company_id() helper function
  - Add SELECT policies for all tables
*/

-- Drop all existing policies for all tables
DROP POLICY IF EXISTS "Users can view company leads" ON leads;
DROP POLICY IF EXISTS "Users can delete leads for their company" ON leads;
DROP POLICY IF EXISTS "Users can insert leads for their company" ON leads;
DROP POLICY IF EXISTS "Users can update leads for their company" ON leads;

DROP POLICY IF EXISTS "Users can delete tasks for their company" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks for their company" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks for their company" ON tasks;

DROP POLICY IF EXISTS "Users can delete estimates for their company" ON estimates;
DROP POLICY IF EXISTS "Users can insert estimates for their company" ON estimates;
DROP POLICY IF EXISTS "Users can update estimates for their company" ON estimates;

DROP POLICY IF EXISTS "Users can delete invoices for their company" ON invoices;
DROP POLICY IF EXISTS "Users can insert invoices for their company" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices for their company" ON invoices;

DROP POLICY IF EXISTS "Users can delete automations for their company" ON automations;
DROP POLICY IF EXISTS "Users can insert automations for their company" ON automations;
DROP POLICY IF EXISTS "Users can update automations for their company" ON automations;

-- LEADS table policies
CREATE POLICY "Users can view company leads"
  ON leads FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can delete company leads"
  ON leads FOR DELETE
  TO authenticated
  USING (company_id = get_my_company_id());

-- TASKS table policies
CREATE POLICY "Users can view company tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can delete company tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (company_id = get_my_company_id());

-- ESTIMATES table policies
CREATE POLICY "Users can view company estimates"
  ON estimates FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company estimates"
  ON estimates FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company estimates"
  ON estimates FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can delete company estimates"
  ON estimates FOR DELETE
  TO authenticated
  USING (company_id = get_my_company_id());

-- INVOICES table policies
CREATE POLICY "Users can view company invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can delete company invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (company_id = get_my_company_id());

-- AUTOMATIONS table policies
CREATE POLICY "Users can view company automations"
  ON automations FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company automations"
  ON automations FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company automations"
  ON automations FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can delete company automations"
  ON automations FOR DELETE
  TO authenticated
  USING (company_id = get_my_company_id());

-- EVENTS table policies
CREATE POLICY "Users can view company events"
  ON events FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company events"
  ON events FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can delete company events"
  ON events FOR DELETE
  TO authenticated
  USING (company_id = get_my_company_id());

-- MATERIAL_ORDERS table policies
CREATE POLICY "Users can view company material orders"
  ON material_orders FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company material orders"
  ON material_orders FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company material orders"
  ON material_orders FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can delete company material orders"
  ON material_orders FOR DELETE
  TO authenticated
  USING (company_id = get_my_company_id());

-- CALL_LOGS table policies
CREATE POLICY "Users can view company call logs"
  ON call_logs FOR SELECT
  TO authenticated
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert company call logs"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update company call logs"
  ON call_logs FOR UPDATE
  TO authenticated
  USING (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can delete company call logs"
  ON call_logs FOR DELETE
  TO authenticated
  USING (company_id = get_my_company_id());

-- SOFTWARE_LEADS table policies (no company_id, uses assigned_to)
CREATE POLICY "Users can view all software leads"
  ON software_leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert software leads"
  ON software_leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update software leads"
  ON software_leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete software leads"
  ON software_leads FOR DELETE
  TO authenticated
  USING (true);
