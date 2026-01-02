/*
  # Create Contracts Table

  ## Overview
  Creates the contracts table to store roofing contracts for leads.

  ## New Tables
  - `contracts`
    - `id` (uuid, primary key) - Unique identifier for the contract
    - `company_id` (uuid) - Reference to the company
    - `lead_id` (uuid) - Reference to the lead/client
    - `proposal_id` (uuid, nullable) - Optional reference to a proposal
    - `number` (text) - Contract number (e.g., CNT-2024-001)
    - `type` (text) - Type of contract (Residential Roofing, Commercial Roofing, Insurance Claim, Warranty Work, Repair)
    - `status` (text) - Contract status (Draft, Sent, Signed, Active, Completed, Cancelled)
    - `created_date` (timestamptz) - When contract was created
    - `sent_date` (timestamptz, nullable) - When contract was sent to client
    - `signed_date` (timestamptz, nullable) - When contract was signed
    - `start_date` (date, nullable) - Project start date
    - `completion_date` (date, nullable) - Project completion date
    - `project_description` (text) - Description of the project
    - `scope_of_work` (jsonb) - Array of work items
    - `materials` (jsonb) - Array of materials
    - `total_amount` (numeric) - Total contract value
    - `deposit_amount` (numeric) - Required deposit amount
    - `payment_schedule` (jsonb) - Array of payment milestones
    - `terms` (jsonb) - Array of terms and conditions
    - `warranty` (text) - Warranty information
    - `client_signature` (text, nullable) - Client signature data
    - `contractor_signature` (text, nullable) - Contractor signature data
    - `notes` (text, nullable) - Internal notes
    - `created_at` (timestamptz) - Record creation timestamp
    - `updated_at` (timestamptz) - Record update timestamp

  ## Security
  - Enable RLS on contracts table
  - Users can view contracts for their own company
  - Company owners/admins can create, update contracts
  - Super admins can view all contracts
*/

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES proposals(id) ON DELETE SET NULL,
  number text NOT NULL,
  type text NOT NULL DEFAULT 'Residential Roofing',
  status text NOT NULL DEFAULT 'Draft',
  created_date timestamptz NOT NULL DEFAULT now(),
  sent_date timestamptz,
  signed_date timestamptz,
  start_date date,
  completion_date date,
  project_description text NOT NULL DEFAULT '',
  scope_of_work jsonb NOT NULL DEFAULT '[]'::jsonb,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  deposit_amount numeric NOT NULL DEFAULT 0,
  payment_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  warranty text NOT NULL DEFAULT '',
  client_signature text,
  contractor_signature text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contracts_type_check CHECK (
    type IN ('Residential Roofing', 'Commercial Roofing', 'Insurance Claim', 'Warranty Work', 'Repair')
  ),
  CONSTRAINT contracts_status_check CHECK (
    status IN ('Draft', 'Sent', 'Signed', 'Active', 'Completed', 'Cancelled')
  )
);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Create policies for contracts
CREATE POLICY "Users can view contracts for their company"
  ON contracts
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all contracts"
  ON contracts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'Super Admin'
    )
  );

CREATE POLICY "Company owners and admins can create contracts"
  ON contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('Company Owner', 'Company Admin', 'Admin')
    )
  );

CREATE POLICY "Company owners and admins can update contracts"
  ON contracts
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('Company Owner', 'Company Admin', 'Admin')
    )
  );

CREATE POLICY "Company owners and admins can delete contracts"
  ON contracts
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('Company Owner', 'Company Admin', 'Admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_lead_id ON contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_date ON contracts(created_date DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();
