/*
  # Create Roof Edges System for Detailed Labeling

  ## Overview
  This migration creates a comprehensive roof edge tracking system that allows users
  to label individual roof edges (ridge, hip, valley, eave, rake, penetration) with
  auto-detection capabilities and confidence scoring.

  ## New Tables

  ### `roof_edges`
  Stores individual roof edges with their types and geometric data
  - `id` (uuid, primary key)
  - `measurement_id` (uuid, references roof_measurements)
  - `edge_type` (text) - Ridge, Hip, Valley, Eave, Rake, Penetration, or Unlabeled
  - `geometry` (jsonb) - Array of {lat, lng} points defining the edge
  - `length_ft` (numeric) - Length of the edge in feet
  - `auto_detected` (boolean) - Was this edge type auto-detected
  - `confidence_score` (numeric) - Auto-detection confidence 0-100
  - `detection_reason` (text) - Explanation of why this type was suggested
  - `user_modified` (boolean) - Has user manually changed this edge
  - `angle_to_north` (numeric) - Angle of edge relative to north (0-360)
  - `connects_to` (jsonb) - Array of edge IDs this edge connects to
  - `elevation_rank` (integer) - Relative elevation (1=highest, used for ridge detection)
  - `display_order` (integer) - Order for UI display
  - `notes` (text) - User notes about this edge
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `edge_labeling_history`
  Tracks changes to edge labels for undo/redo functionality
  - `id` (uuid, primary key)
  - `measurement_id` (uuid, references roof_measurements)
  - `edge_id` (uuid, references roof_edges)
  - `action_type` (text) - Created, Updated, Deleted, AutoDetected
  - `previous_type` (text) - Edge type before change
  - `new_type` (text) - Edge type after change
  - `user_id` (uuid, references users)
  - `timestamp` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access edges for their company's measurements
  - Super Admins can view all edges
  - Policies for select, insert, update, delete based on company membership

  ## Indexes
  - Index on measurement_id for fast measurement-scoped queries
  - Index on edge_type for filtering by type
  - Index on auto_detected for filtering auto-detected edges
  - Index on confidence_score for sorting suggestions
*/

-- Roof edges table
CREATE TABLE IF NOT EXISTS roof_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid NOT NULL REFERENCES roof_measurements(id) ON DELETE CASCADE,
  edge_type text NOT NULL DEFAULT 'Unlabeled' CHECK (edge_type IN ('Ridge', 'Hip', 'Valley', 'Eave', 'Rake', 'Penetration', 'Unlabeled')),
  geometry jsonb NOT NULL,
  length_ft numeric(10, 2) NOT NULL DEFAULT 0,
  auto_detected boolean DEFAULT false,
  confidence_score numeric(5, 2) DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  detection_reason text,
  user_modified boolean DEFAULT false,
  angle_to_north numeric(5, 2) CHECK (angle_to_north >= 0 AND angle_to_north < 360),
  connects_to jsonb DEFAULT '[]'::jsonb,
  elevation_rank integer,
  display_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roof_edges ENABLE ROW LEVEL SECURITY;

-- Edge labeling history table
CREATE TABLE IF NOT EXISTS edge_labeling_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid NOT NULL REFERENCES roof_measurements(id) ON DELETE CASCADE,
  edge_id uuid REFERENCES roof_edges(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('Created', 'Updated', 'Deleted', 'AutoDetected')),
  previous_type text CHECK (previous_type IN ('Ridge', 'Hip', 'Valley', 'Eave', 'Rake', 'Penetration', 'Unlabeled')),
  new_type text CHECK (new_type IN ('Ridge', 'Hip', 'Valley', 'Eave', 'Rake', 'Penetration', 'Unlabeled')),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE edge_labeling_history ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_roof_edges_measurement_id ON roof_edges(measurement_id);
CREATE INDEX IF NOT EXISTS idx_roof_edges_type ON roof_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_roof_edges_auto_detected ON roof_edges(auto_detected) WHERE auto_detected = true;
CREATE INDEX IF NOT EXISTS idx_roof_edges_confidence ON roof_edges(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_edge_history_measurement_id ON edge_labeling_history(measurement_id);
CREATE INDEX IF NOT EXISTS idx_edge_history_edge_id ON edge_labeling_history(edge_id);
CREATE INDEX IF NOT EXISTS idx_edge_history_timestamp ON edge_labeling_history(timestamp DESC);

-- Updated at trigger for roof_edges
CREATE OR REPLACE FUNCTION update_roof_edges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_roof_edges_updated_at
  BEFORE UPDATE ON roof_edges
  FOR EACH ROW
  EXECUTE FUNCTION update_roof_edges_updated_at();

-- RLS Policies for roof_edges table

-- Policy: Users can view edges for their company's measurements
CREATE POLICY "Users can view edges for their company"
  ON roof_edges
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

-- Policy: Super Admins can view all edges
CREATE POLICY "Super Admins can view all edges"
  ON roof_edges
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Super Admin'
    )
  );

-- Policy: Company members can create edges
CREATE POLICY "Company members can create edges"
  ON roof_edges
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

-- Policy: Company members can update edges
CREATE POLICY "Company members can update edges"
  ON roof_edges
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

-- Policy: Company members can delete edges
CREATE POLICY "Company members can delete edges"
  ON roof_edges
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

-- RLS Policies for edge_labeling_history table

-- Policy: Users can view history for their company's measurements
CREATE POLICY "Users can view edge history for their company"
  ON edge_labeling_history
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

-- Policy: Super Admins can view all history
CREATE POLICY "Super Admins can view all edge history"
  ON edge_labeling_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Super Admin'
    )
  );

-- Policy: Company members can create history entries
CREATE POLICY "Company members can create edge history"
  ON edge_labeling_history
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
