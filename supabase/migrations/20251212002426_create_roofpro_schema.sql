/*
  # RoofPro CRM Database Schema

  This migration creates the complete database schema for the RoofPro AI CRM application.

  1. New Tables
    - `companies` - Multi-tenant company accounts with subscription info
    - `users` - Application users linked to auth.users
    - `leads` - Main CRM leads/customers
    - `lead_documents` - Documents attached to leads
    - `lead_activities` - Activity history for leads
    - `estimates` - Estimates/quotes for leads
    - `estimate_items` - Line items within estimates
    - `calendar_events` - Calendar events and appointments
    - `tasks` - Task management
    - `invoices` - Customer invoices
    - `invoice_items` - Line items within invoices
    - `price_book_items` - Company price book
    - `notifications` - User notifications
    - `call_logs` - AI receptionist call logs
    - `automation_rules` - Workflow automation rules
    - `suppliers` - Material suppliers
    - `material_orders` - Material orders
    - `material_order_items` - Items within material orders

  2. Security
    - RLS enabled on all tables
    - Policies restrict access to company data based on user's company_id
    - Super admins have broader access where needed
*/

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier text NOT NULL DEFAULT 'Starter' CHECK (tier IN ('Starter', 'Professional', 'Enterprise')),
  user_count integer NOT NULL DEFAULT 0,
  max_users integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Active', 'Suspended', 'Pending')),
  renewal_date date,
  address text,
  phone text,
  logo_url text,
  setup_complete boolean NOT NULL DEFAULT false,
  agent_config jsonb,
  integrations jsonb DEFAULT '{"quickbooks": {"isConnected": false, "autoSync": false}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'Sales Rep' CHECK (role IN ('Super Admin', 'Software Sales Rep', 'Company Owner', 'Sales Rep')),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  avatar_initials text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  coordinates jsonb,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'New Lead' CHECK (status IN ('New Lead', 'Inspection', 'Claim Filed', 'Adjuster Mtg', 'Approved', 'Production', 'Supplementing', 'Closed')),
  project_type text NOT NULL DEFAULT 'Unknown' CHECK (project_type IN ('Insurance', 'Retail', 'Unknown')),
  source text CHECK (source IN ('Door Knocking', 'Referral', 'Web', 'Ads', 'Other')),
  notes text,
  estimated_value numeric(12, 2) DEFAULT 0,
  last_contact timestamptz,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  insurance_carrier text,
  policy_number text,
  claim_number text,
  adjuster_name text,
  adjuster_phone text,
  damage_date date,
  project_manager_id uuid REFERENCES users(id) ON DELETE SET NULL,
  production_date date,
  payment_status text DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partial', 'Paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Lead documents
CREATE TABLE IF NOT EXISTS lead_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Photo', 'PDF', 'Contract', 'Scope')),
  url text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_documents ENABLE ROW LEVEL SECURITY;

-- Lead activities (history)
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('Status Change', 'Note Added', 'Email Sent', 'File Uploaded', 'Info Updated', 'System')),
  description text NOT NULL,
  user_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Estimates
CREATE TABLE IF NOT EXISTS estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name text,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  tax numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  signature text,
  status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Signed', 'Sent')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

-- Estimate items
CREATE TABLE IF NOT EXISTS estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'ea',
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0
);

ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  type text NOT NULL DEFAULT 'Meeting' CHECK (type IN ('Meeting', 'Inspection', 'Install', 'Deadline')),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  status text NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'In Progress', 'Done')),
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  related_lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  lead_name text,
  number text NOT NULL,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue')),
  date_issued date NOT NULL DEFAULT CURRENT_DATE,
  date_due date NOT NULL,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  tax numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Price book items
CREATE TABLE IF NOT EXISTS price_book_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other' CHECK (category IN ('Material', 'Labor', 'Permit', 'Other')),
  unit text NOT NULL DEFAULT 'ea',
  price numeric(12, 2) NOT NULL DEFAULT 0,
  cost numeric(12, 2) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE price_book_items ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('alert', 'info', 'success')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Call logs (AI Receptionist)
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  caller_number text NOT NULL,
  caller_name text,
  duration text,
  status text NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Missed', 'Voicemail', 'Action Required')),
  transcript text,
  summary text,
  recording_url text,
  sentiment text DEFAULT 'Neutral' CHECK (sentiment IN ('Positive', 'Neutral', 'Angry')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  trigger_type text NOT NULL DEFAULT 'Status Change',
  trigger_value text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('Create Task', 'Send Email', 'Create Notification')),
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo text,
  color text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Material orders
CREATE TABLE IF NOT EXISTS material_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Ordered' CHECK (status IN ('Ordered', 'Delivered', 'Cancelled')),
  date_ordered date NOT NULL DEFAULT CURRENT_DATE,
  delivery_date date,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE material_orders ENABLE ROW LEVEL SECURITY;

-- Material order items
CREATE TABLE IF NOT EXISTS material_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES material_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'ea',
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0
);

ALTER TABLE material_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Companies: Users can view their own company
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

CREATE POLICY "Company admins can update own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  )
  WITH CHECK (
    id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  );

-- Users: Users can view users in their company
CREATE POLICY "Users can view company users"
  ON users FOR SELECT
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Super Admin')
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Leads: Company isolation
CREATE POLICY "Users can view company leads"
  ON leads FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert company leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update company leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete company leads"
  ON leads FOR DELETE
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Lead documents: Access through lead ownership
CREATE POLICY "Users can view lead documents"
  ON lead_documents FOR SELECT
  TO authenticated
  USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can insert lead documents"
  ON lead_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can delete lead documents"
  ON lead_documents FOR DELETE
  TO authenticated
  USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

-- Lead activities: Access through lead ownership
CREATE POLICY "Users can view lead activities"
  ON lead_activities FOR SELECT
  TO authenticated
  USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can insert lead activities"
  ON lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

-- Estimates: Access through lead ownership
CREATE POLICY "Users can view estimates"
  ON estimates FOR SELECT
  TO authenticated
  USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can insert estimates"
  ON estimates FOR INSERT
  TO authenticated
  WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can update estimates"
  ON estimates FOR UPDATE
  TO authenticated
  USING (
    lead_id IN (SELECT id FROM leads WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  )
  WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

-- Estimate items: Access through estimate ownership
CREATE POLICY "Users can view estimate items"
  ON estimate_items FOR SELECT
  TO authenticated
  USING (
    estimate_id IN (
      SELECT e.id FROM estimates e
      JOIN leads l ON e.lead_id = l.id
      WHERE l.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert estimate items"
  ON estimate_items FOR INSERT
  TO authenticated
  WITH CHECK (
    estimate_id IN (
      SELECT e.id FROM estimates e
      JOIN leads l ON e.lead_id = l.id
      WHERE l.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete estimate items"
  ON estimate_items FOR DELETE
  TO authenticated
  USING (
    estimate_id IN (
      SELECT e.id FROM estimates e
      JOIN leads l ON e.lead_id = l.id
      WHERE l.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- Calendar events: Company isolation
CREATE POLICY "Users can view company events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert company events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update company events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete company events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Tasks: Company isolation
CREATE POLICY "Users can view company tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert company tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update company tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete company tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Invoices: Company isolation
CREATE POLICY "Users can view company invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert company invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update company invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Invoice items: Access through invoice ownership
CREATE POLICY "Users can view invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can insert invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    invoice_id IN (SELECT id FROM invoices WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can delete invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

-- Price book items: Company isolation
CREATE POLICY "Users can view company price book"
  ON price_book_items FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can insert price book items"
  ON price_book_items FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  );

CREATE POLICY "Admins can update price book items"
  ON price_book_items FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  );

CREATE POLICY "Admins can delete price book items"
  ON price_book_items FOR DELETE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  );

-- Notifications: User isolation
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

-- Call logs: Company isolation
CREATE POLICY "Users can view company call logs"
  ON call_logs FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert company call logs"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Automation rules: Company isolation
CREATE POLICY "Users can view company automations"
  ON automation_rules FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can insert automations"
  ON automation_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  );

CREATE POLICY "Admins can update automations"
  ON automation_rules FOR UPDATE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  );

CREATE POLICY "Admins can delete automations"
  ON automation_rules FOR DELETE
  TO authenticated
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('Company Owner', 'Super Admin'))
  );

-- Suppliers: Company isolation
CREATE POLICY "Users can view company suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert company suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update company suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Material orders: Company isolation
CREATE POLICY "Users can view company orders"
  ON material_orders FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert company orders"
  ON material_orders FOR INSERT
  TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update company orders"
  ON material_orders FOR UPDATE
  TO authenticated
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Material order items: Access through order ownership
CREATE POLICY "Users can view order items"
  ON material_order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM material_orders WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can insert order items"
  ON material_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (SELECT id FROM material_orders WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calendar_events_company_id ON calendar_events(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);