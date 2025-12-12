/*
  # Add complete RLS policies for all tables

  1. Security Changes
    - Add INSERT, UPDATE, DELETE policies for leads table
    - Add INSERT, UPDATE, DELETE policies for tasks table
    - Add INSERT, UPDATE, DELETE policies for events table
    - Add INSERT, UPDATE, DELETE policies for invoices table
    - Add INSERT, UPDATE, DELETE policies for automations table
    - Add INSERT, UPDATE, DELETE policies for material_orders table
    - Add UPDATE policy for users table
    - Add INSERT, UPDATE, DELETE policies for call_logs table
    - Add INSERT, UPDATE, DELETE policies for estimates table

  2. Notes
    - All policies require authenticated users
    - Users can only access data belonging to their company
    - This enables full CRUD operations throughout the application
*/

-- USERS: Add UPDATE policy
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- LEADS: Add full CRUD policies
CREATE POLICY "Users can insert leads for their company"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update leads for their company"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete leads for their company"
  ON leads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- TASKS: Add full CRUD policies
CREATE POLICY "Users can insert tasks for their company"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks for their company"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks for their company"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- EVENTS: Add full CRUD policies
CREATE POLICY "Users can insert events for their company"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update events for their company"
  ON events FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events for their company"
  ON events FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- INVOICES: Add full CRUD policies
CREATE POLICY "Users can insert invoices for their company"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices for their company"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete invoices for their company"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- AUTOMATIONS: Add full CRUD policies
CREATE POLICY "Users can insert automations for their company"
  ON automations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update automations for their company"
  ON automations FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete automations for their company"
  ON automations FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- MATERIAL_ORDERS: Add full CRUD policies
CREATE POLICY "Users can insert material orders for their company"
  ON material_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update material orders for their company"
  ON material_orders FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete material orders for their company"
  ON material_orders FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- CALL_LOGS: Add full CRUD policies
CREATE POLICY "Users can insert call logs for their company"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update call logs for their company"
  ON call_logs FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete call logs for their company"
  ON call_logs FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ESTIMATES: Add full CRUD policies
CREATE POLICY "Users can insert estimates for their company"
  ON estimates FOR INSERT
  TO authenticated
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update estimates for their company"
  ON estimates FOR UPDATE
  TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete estimates for their company"
  ON estimates FOR DELETE
  TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );