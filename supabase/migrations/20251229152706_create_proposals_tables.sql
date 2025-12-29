/*
  # Create Proposals System

  ## Overview
  This migration creates a complete proposals system with Good/Better/Best pricing tiers.
  Proposals are generated from leads and can be sent to clients for review and acceptance.

  ## New Tables

  ### `proposals`
  Main proposals table storing proposal metadata and status
  - `id` (uuid, primary key)
  - `company_id` (uuid, references companies)
  - `lead_id` (uuid, references leads)
  - `number` (text, unique proposal number like "PROP-2024-001")
  - `title` (text, proposal title)
  - `status` (text, enum: Draft, Sent, Viewed, Accepted, Rejected)
  - `created_date` (timestamptz)
  - `sent_date` (timestamptz, nullable)
  - `viewed_date` (timestamptz, nullable)
  - `responded_date` (timestamptz, nullable)
  - `valid_until` (date, expiration date)
  - `project_type` (text, Insurance/Retail/Unknown)
  - `project_description` (text)
  - `scope_of_work` (jsonb array, list of work items)
  - `terms` (jsonb array, terms and conditions)
  - `timeline` (text, estimated project timeline)
  - `warranty` (text, warranty information)
  - `selected_option_id` (uuid, nullable, which option client selected)
  - `view_count` (integer, how many times viewed)
  - `last_viewed` (timestamptz, nullable)
  - `client_notes` (text, nullable, notes from client)
  - `contract_id` (uuid, nullable, if converted to contract)

  ### `proposal_options`
  Good/Better/Best pricing options within each proposal
  - `id` (uuid, primary key)
  - `proposal_id` (uuid, references proposals)
  - `tier` (text, enum: Good, Better, Best)
  - `name` (text, option name)
  - `description` (text, option description)
  - `materials` (jsonb array, list of materials)
  - `features` (jsonb array, list of features)
  - `warranty` (text, warranty for this option)
  - `timeline` (text, timeline for this option)
  - `price` (numeric, total price)
  - `savings` (numeric, nullable, savings amount)
  - `is_recommended` (boolean, whether this is the recommended option)
  - `display_order` (integer, ordering)

  ## Security
  - RLS enabled on all tables
  - Users can only access proposals for their company
  - Super Admins can view all proposals
  - Policies for select, insert, update based on company membership

  ## Indexes
  - Index on company_id for fast company-scoped queries
  - Index on lead_id for linking proposals to leads
  - Index on status for filtering
  - Index on proposal_id in proposal_options for fast joins
*/

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  number text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected')),
  created_date timestamptz NOT NULL DEFAULT now(),
  sent_date timestamptz,
  viewed_date timestamptz,
  responded_date timestamptz,
  valid_until date NOT NULL,
  project_type text NOT NULL DEFAULT 'Unknown' CHECK (project_type IN ('Insurance', 'Retail', 'Unknown')),
  project_description text NOT NULL,
  scope_of_work jsonb NOT NULL DEFAULT '[]'::jsonb,
  terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeline text NOT NULL,
  warranty text NOT NULL,
  selected_option_id uuid,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed timestamptz,
  client_notes text,
  contract_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Proposal options table (Good, Better, Best)
CREATE TABLE IF NOT EXISTS proposal_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('Good', 'Better', 'Best')),
  name text NOT NULL,
  description text NOT NULL,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  warranty text NOT NULL,
  timeline text NOT NULL,
  price numeric(12, 2) NOT NULL,
  savings numeric(12, 2),
  is_recommended boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposal_options ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_company_id ON proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_date ON proposals(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_options_proposal_id ON proposal_options(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_options_tier ON proposal_options(tier);

-- Updated at trigger for proposals
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposals_updated_at();

-- RLS Policies for proposals table

-- Policy: Users can view proposals for their company
CREATE POLICY "Users can view own company proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Super Admins can view all proposals
CREATE POLICY "Super Admins can view all proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Super Admin'
    )
  );

-- Policy: Company members can create proposals
CREATE POLICY "Company members can create proposals"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Company members can update their company's proposals
CREATE POLICY "Company members can update own company proposals"
  ON proposals
  FOR UPDATE
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

-- Policy: Company members can delete their company's proposals
CREATE POLICY "Company members can delete own company proposals"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies for proposal_options table

-- Policy: Users can view proposal options for their company's proposals
CREATE POLICY "Users can view proposal options for their company"
  ON proposal_options
  FOR SELECT
  TO authenticated
  USING (
    proposal_id IN (
      SELECT id FROM proposals 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Super Admins can view all proposal options
CREATE POLICY "Super Admins can view all proposal options"
  ON proposal_options
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Super Admin'
    )
  );

-- Policy: Company members can create proposal options
CREATE POLICY "Company members can create proposal options"
  ON proposal_options
  FOR INSERT
  TO authenticated
  WITH CHECK (
    proposal_id IN (
      SELECT id FROM proposals 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Company members can update proposal options
CREATE POLICY "Company members can update proposal options"
  ON proposal_options
  FOR UPDATE
  TO authenticated
  USING (
    proposal_id IN (
      SELECT id FROM proposals 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    proposal_id IN (
      SELECT id FROM proposals 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Company members can delete proposal options
CREATE POLICY "Company members can delete proposal options"
  ON proposal_options
  FOR DELETE
  TO authenticated
  USING (
    proposal_id IN (
      SELECT id FROM proposals 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );
