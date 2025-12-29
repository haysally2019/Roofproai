/*
  # Create Roof Measurements System

  ## Overview
  This migration creates a comprehensive roof measurement system for DIY satellite-based measurements.
  Integrates with Vexcel and Bing imagery to allow roofing companies to measure roofs remotely.

  ## New Tables

  ### `roof_measurements`
  Main measurements table storing all roof measurement data
  - `id` (uuid, primary key)
  - `company_id` (uuid, references companies)
  - `lead_id` (uuid, nullable, references leads)
  - `address` (text, property address)
  - `latitude` (numeric, property latitude)
  - `longitude` (numeric, property longitude)
  - `imagery_source` (text, Vexcel/Bing/Google)
  - `imagery_date` (date, when imagery was captured)
  - `total_area_sqft` (numeric, total roof area)
  - `pitch` (text, roof pitch like "6/12")
  - `pitch_degrees` (numeric, pitch in degrees)
  - `segments` (jsonb array, individual roof segments)
  - `ridge_length` (numeric, linear feet)
  - `hip_length` (numeric, linear feet)
  - `valley_length` (numeric, linear feet)
  - `rake_length` (numeric, linear feet)
  - `eave_length` (numeric, linear feet)
  - `perimeter` (numeric, total perimeter)
  - `waste_factor` (numeric, default 10%)
  - `measurement_date` (timestamptz, when measured)
  - `measured_by` (uuid, user who measured)
  - `status` (text, Draft/Completed/Approved)
  - `notes` (text, additional notes)
  - `report_url` (text, generated PDF report)

  ### `measurement_segments`
  Individual roof segments/facets within a measurement
  - `id` (uuid, primary key)
  - `measurement_id` (uuid, references roof_measurements)
  - `name` (text, segment name like "Front Left")
  - `area_sqft` (numeric, segment area)
  - `pitch` (text, segment pitch)
  - `pitch_degrees` (numeric)
  - `geometry` (jsonb, polygon coordinates)
  - `material_type` (text, shingle/metal/tile/flat)
  - `condition` (text, good/fair/poor)
  - `notes` (text)
  - `display_order` (integer)

  ## Security
  - RLS enabled on all tables
  - Users can only access measurements for their company
  - Super Admins can view all measurements
  - Policies for select, insert, update, delete based on company membership

  ## Indexes
  - Index on company_id for fast company-scoped queries
  - Index on lead_id for linking measurements to leads
  - Index on address for search
  - Index on measurement_id in segments for fast joins
*/

-- Roof measurements table
CREATE TABLE IF NOT EXISTS roof_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  address text NOT NULL,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  imagery_source text DEFAULT 'Bing' CHECK (imagery_source IN ('Vexcel', 'Bing', 'Google', 'Nearmap')),
  imagery_date date,
  total_area_sqft numeric(10, 2) DEFAULT 0,
  pitch text,
  pitch_degrees numeric(5, 2),
  segments jsonb DEFAULT '[]'::jsonb,
  ridge_length numeric(10, 2) DEFAULT 0,
  hip_length numeric(10, 2) DEFAULT 0,
  valley_length numeric(10, 2) DEFAULT 0,
  rake_length numeric(10, 2) DEFAULT 0,
  eave_length numeric(10, 2) DEFAULT 0,
  perimeter numeric(10, 2) DEFAULT 0,
  waste_factor numeric(5, 2) DEFAULT 10,
  measurement_date timestamptz NOT NULL DEFAULT now(),
  measured_by uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed', 'Approved')),
  notes text,
  report_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roof_measurements ENABLE ROW LEVEL SECURITY;

-- Measurement segments table
CREATE TABLE IF NOT EXISTS measurement_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid NOT NULL REFERENCES roof_measurements(id) ON DELETE CASCADE,
  name text NOT NULL,
  area_sqft numeric(10, 2) NOT NULL DEFAULT 0,
  pitch text,
  pitch_degrees numeric(5, 2),
  geometry jsonb NOT NULL,
  material_type text CHECK (material_type IN ('Shingle', 'Metal', 'Tile', 'Flat', 'Other')),
  condition text CHECK (condition IN ('Good', 'Fair', 'Poor', 'Unknown')),
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE measurement_segments ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_roof_measurements_company_id ON roof_measurements(company_id);
CREATE INDEX IF NOT EXISTS idx_roof_measurements_lead_id ON roof_measurements(lead_id);
CREATE INDEX IF NOT EXISTS idx_roof_measurements_address ON roof_measurements(address);
CREATE INDEX IF NOT EXISTS idx_roof_measurements_status ON roof_measurements(status);
CREATE INDEX IF NOT EXISTS idx_roof_measurements_created_at ON roof_measurements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurement_segments_measurement_id ON measurement_segments(measurement_id);

-- Updated at trigger for roof_measurements
CREATE OR REPLACE FUNCTION update_roof_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_roof_measurements_updated_at
  BEFORE UPDATE ON roof_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_roof_measurements_updated_at();

-- RLS Policies for roof_measurements table

-- Policy: Users can view measurements for their company
CREATE POLICY "Users can view own company measurements"
  ON roof_measurements
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Super Admins can view all measurements
CREATE POLICY "Super Admins can view all measurements"
  ON roof_measurements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Super Admin'
    )
  );

-- Policy: Company members can create measurements
CREATE POLICY "Company members can create measurements"
  ON roof_measurements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Company members can update their company's measurements
CREATE POLICY "Company members can update own company measurements"
  ON roof_measurements
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

-- Policy: Company members can delete their company's measurements
CREATE POLICY "Company members can delete own company measurements"
  ON roof_measurements
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies for measurement_segments table

-- Policy: Users can view segments for their company's measurements
CREATE POLICY "Users can view segments for their company"
  ON measurement_segments
  FOR SELECT
  TO authenticated
  USING (
    measurement_id IN (
      SELECT id FROM roof_measurements 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Super Admins can view all segments
CREATE POLICY "Super Admins can view all segments"
  ON measurement_segments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Super Admin'
    )
  );

-- Policy: Company members can create segments
CREATE POLICY "Company members can create segments"
  ON measurement_segments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    measurement_id IN (
      SELECT id FROM roof_measurements 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Company members can update segments
CREATE POLICY "Company members can update segments"
  ON measurement_segments
  FOR UPDATE
  TO authenticated
  USING (
    measurement_id IN (
      SELECT id FROM roof_measurements 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    measurement_id IN (
      SELECT id FROM roof_measurements 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Company members can delete segments
CREATE POLICY "Company members can delete segments"
  ON measurement_segments
  FOR DELETE
  TO authenticated
  USING (
    measurement_id IN (
      SELECT id FROM roof_measurements 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );
