/*
  # Add 3D Model Support to Roof Measurements

  ## Overview
  Extends the roof_measurements table to support 3D models from Google Solar API.
  Adds columns to track 3D model availability, data storage, and quality metrics.

  ## Changes

  ### New Columns in `roof_measurements`
  - `has_3d_model` (boolean) - Flag indicating if 3D model data is available
  - `solar_api_data` (jsonb) - Raw Solar API response for reference
  - `dsm_url` (text) - Digital Surface Model GeoTIFF URL
  - `imagery_url` (text) - Aerial imagery URL from Solar API
  - `model_quality_score` (text) - Quality rating from Solar API (HIGH, MEDIUM, LOW)
  - `solar_panel_capacity_watts` (numeric) - Solar potential capacity
  - `cache_expires_at` (timestamptz) - When cached 3D data expires
  - `measurement_type` (text) - Manual, Solar3D, or Hybrid measurement
  - `credits_used` (integer) - Credits consumed for this measurement

  ## Indexes
  - Index on `has_3d_model` for filtering 3D measurements
  - Index on `cache_expires_at` for cleanup operations
  - Index on `measurement_type` for analytics

  ## Notes
  - All new columns are nullable for backward compatibility
  - Default measurement_type is 'Manual' for existing records
  - Cache expires after 30 days by default
*/

-- Add 3D model support columns to roof_measurements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roof_measurements' AND column_name = 'has_3d_model'
  ) THEN
    ALTER TABLE roof_measurements ADD COLUMN has_3d_model boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roof_measurements' AND column_name = 'solar_api_data'
  ) THEN
    ALTER TABLE roof_measurements ADD COLUMN solar_api_data jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roof_measurements' AND column_name = 'dsm_url'
  ) THEN
    ALTER TABLE roof_measurements ADD COLUMN dsm_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roof_measurements' AND column_name = 'imagery_url'
  ) THEN
    ALTER TABLE roof_measurements ADD COLUMN imagery_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roof_measurements' AND column_name = 'model_quality_score'
  ) THEN
    ALTER TABLE roof_measurements ADD COLUMN model_quality_score text CHECK (model_quality_score IN ('HIGH', 'MEDIUM', 'LOW', NULL));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roof_measurements' AND column_name = 'solar_panel_capacity_watts'
  ) THEN
    ALTER TABLE roof_measurements ADD COLUMN solar_panel_capacity_watts numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roof_measurements' AND column_name = 'cache_expires_at'
  ) THEN
    ALTER TABLE roof_measurements ADD COLUMN cache_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roof_measurements' AND column_name = 'measurement_type'
  ) THEN
    ALTER TABLE roof_measurements ADD COLUMN measurement_type text DEFAULT 'Manual' CHECK (measurement_type IN ('Manual', 'Solar3D', 'Hybrid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roof_measurements' AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE roof_measurements ADD COLUMN credits_used integer DEFAULT 1;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roof_measurements_has_3d_model ON roof_measurements(has_3d_model) WHERE has_3d_model = true;
CREATE INDEX IF NOT EXISTS idx_roof_measurements_cache_expires ON roof_measurements(cache_expires_at);
CREATE INDEX IF NOT EXISTS idx_roof_measurements_type ON roof_measurements(measurement_type);

-- Update existing measurements to have default values
UPDATE roof_measurements
SET
  has_3d_model = false,
  measurement_type = 'Manual',
  credits_used = 1
WHERE has_3d_model IS NULL;
