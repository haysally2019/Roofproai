/*
  # Update Contract Templates for PDF-Based Form Fields

  1. Changes
    - Drop the old contract_templates table
    - Create new contract_templates table for PDF-based templates
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `name` (text) - Template name
      - `description` (text) - Template description
      - `pdf_url` (text) - URL to the PDF template file
      - `form_fields` (jsonb) - Array of form field definitions with positioning
      - `signature_fields` (jsonb) - Array of signature field definitions with positioning
      - `is_default` (boolean) - Whether this is the default template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - Keep the same RLS policies

  2. Form Fields Structure
    Each field in form_fields array:
    - field_id: unique identifier
    - field_type: 'text', 'date', 'number', 'checkbox'
    - label: field label
    - page: PDF page number
    - x: x position on page (percentage or pixels)
    - y: y position on page (percentage or pixels)
    - width: field width
    - height: field height
    - required: boolean
    
  3. Signature Fields Structure
    Each field in signature_fields array:
    - field_id: unique identifier
    - signer_role: 'client', 'contractor'
    - label: field label
    - page: PDF page number
    - x, y, width, height: positioning
*/

-- Drop old contract_templates table
DROP TABLE IF EXISTS contract_templates CASCADE;

-- Create new PDF-based contract templates table
CREATE TABLE IF NOT EXISTS contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  pdf_url text DEFAULT '',
  form_fields jsonb DEFAULT '[]'::jsonb,
  signature_fields jsonb DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

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