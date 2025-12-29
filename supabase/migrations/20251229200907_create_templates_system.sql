/*
  # Create Templates System for Contracts and Proposals

  1. New Tables
    - `contract_templates`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `name` (text) - Template name
      - `description` (text) - Template description
      - `type` (text) - Contract type
      - `scope_of_work` (jsonb) - Array of scope items
      - `materials` (jsonb) - Array of materials
      - `terms` (jsonb) - Array of terms
      - `payment_schedule_template` (jsonb) - Template for payment milestones
      - `warranty_text` (text) - Default warranty text
      - `is_default` (boolean) - Whether this is the default template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `proposal_templates`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `name` (text) - Template name
      - `description` (text) - Template description
      - `project_description` (text) - Default project description
      - `scope_of_work` (jsonb) - Array of scope items
      - `terms` (jsonb) - Array of terms
      - `timeline` (text) - Default timeline
      - `warranty` (text) - Default warranty
      - `good_option` (jsonb) - Good tier option template
      - `better_option` (jsonb) - Better tier option template
      - `best_option` (jsonb) - Best tier option template
      - `is_default` (boolean) - Whether this is the default template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `insurance_damage_reports`
      - `id` (uuid, primary key)
      - `proposal_id` (uuid, foreign key to proposals)
      - `company_id` (uuid, foreign key to companies)
      - `lead_id` (uuid, foreign key to leads)
      - `inspection_date` (date)
      - `inspector_name` (text)
      - `weather_event_date` (date)
      - `weather_event_type` (text) - Hail, Wind, etc.
      - `damaged_areas` (jsonb) - Array of damaged area descriptions
      - `damage_photos` (jsonb) - Array of photo URLs
      - `estimated_damage` (numeric)
      - `insurance_carrier` (text)
      - `claim_number` (text)
      - `adjuster_name` (text)
      - `adjuster_contact` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for company members to manage their templates
    - Add policies for company members to access damage reports
*/

-- Contract Templates Table
CREATE TABLE IF NOT EXISTS contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  type text NOT NULL CHECK (type IN ('Residential Roofing', 'Commercial Roofing', 'Insurance Claim', 'Warranty Work', 'Repair')),
  scope_of_work jsonb DEFAULT '[]'::jsonb,
  materials jsonb DEFAULT '[]'::jsonb,
  terms jsonb DEFAULT '[]'::jsonb,
  payment_schedule_template jsonb DEFAULT '[]'::jsonb,
  warranty_text text DEFAULT '',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- Proposal Templates Table
CREATE TABLE IF NOT EXISTS proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  project_description text DEFAULT '',
  scope_of_work jsonb DEFAULT '[]'::jsonb,
  terms jsonb DEFAULT '[]'::jsonb,
  timeline text DEFAULT '',
  warranty text DEFAULT '',
  good_option jsonb DEFAULT '{}'::jsonb,
  better_option jsonb DEFAULT '{}'::jsonb,
  best_option jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;

-- Insurance Damage Reports Table
CREATE TABLE IF NOT EXISTS insurance_damage_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  inspection_date date DEFAULT CURRENT_DATE,
  inspector_name text DEFAULT '',
  weather_event_date date,
  weather_event_type text DEFAULT '',
  damaged_areas jsonb DEFAULT '[]'::jsonb,
  damage_photos jsonb DEFAULT '[]'::jsonb,
  estimated_damage numeric DEFAULT 0,
  insurance_carrier text DEFAULT '',
  claim_number text DEFAULT '',
  adjuster_name text DEFAULT '',
  adjuster_contact text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insurance_damage_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Contract Templates
CREATE POLICY "Users can view company contract templates"
  ON contract_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = contract_templates.company_id
    )
  );

CREATE POLICY "Users can insert company contract templates"
  ON contract_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = contract_templates.company_id
    )
  );

CREATE POLICY "Users can update company contract templates"
  ON contract_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = contract_templates.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = contract_templates.company_id
    )
  );

CREATE POLICY "Users can delete company contract templates"
  ON contract_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = contract_templates.company_id
    )
  );

-- RLS Policies for Proposal Templates
CREATE POLICY "Users can view company proposal templates"
  ON proposal_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = proposal_templates.company_id
    )
  );

CREATE POLICY "Users can insert company proposal templates"
  ON proposal_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = proposal_templates.company_id
    )
  );

CREATE POLICY "Users can update company proposal templates"
  ON proposal_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = proposal_templates.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = proposal_templates.company_id
    )
  );

CREATE POLICY "Users can delete company proposal templates"
  ON proposal_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = proposal_templates.company_id
    )
  );

-- RLS Policies for Insurance Damage Reports
CREATE POLICY "Users can view company damage reports"
  ON insurance_damage_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = insurance_damage_reports.company_id
    )
  );

CREATE POLICY "Users can insert company damage reports"
  ON insurance_damage_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = insurance_damage_reports.company_id
    )
  );

CREATE POLICY "Users can update company damage reports"
  ON insurance_damage_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = insurance_damage_reports.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = insurance_damage_reports.company_id
    )
  );

CREATE POLICY "Users can delete company damage reports"
  ON insurance_damage_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = insurance_damage_reports.company_id
    )
  );