/*
  # Enhance Software Leads Table for Better Conversion Tracking

  ## Overview
  This migration adds comprehensive conversion-focused fields to the existing software_leads table
  including priority scoring, activity tracking, follow-up management, and source attribution.

  ## Changes to software_leads table
  - Add priority field (Hot, Warm, Cold) for lead scoring
  - Add source field (Inbound, Outbound, Referral, Event, Partner, Other)
  - Add website and company_size fields for better qualification
  - Add estimated_value field for deal size tracking
  - Add scheduling fields: next_follow_up_date, demo_scheduled_date, trial_start_date, trial_end_date
  - Add last_contact_date for engagement tracking
  - Add activities JSONB field for activity timeline
  - Add tags array for categorization
  - Add lost_reason for closed-lost analysis
  - Add updated_at timestamp with auto-update trigger

  ## Security
  - Maintain existing RLS policies
  - Add policies for new fields

  ## Performance
  - Add indexes for filtering and sorting
*/

-- Add new columns to existing software_leads table
DO $$
BEGIN
  -- Add priority field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'priority'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN priority text NOT NULL DEFAULT 'Warm' CHECK (priority IN ('Hot', 'Warm', 'Cold'));
  END IF;

  -- Add source field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'source'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN source text NOT NULL DEFAULT 'Inbound' CHECK (source IN ('Inbound', 'Outbound', 'Referral', 'Event', 'Partner', 'Other'));
  END IF;

  -- Add website field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'website'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN website text;
  END IF;

  -- Add company_size field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'company_size'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN company_size text;
  END IF;

  -- Add estimated_value field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'estimated_value'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN estimated_value integer DEFAULT 0;
  END IF;

  -- Add next_follow_up_date field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'next_follow_up_date'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN next_follow_up_date timestamptz;
  END IF;

  -- Add demo_scheduled_date field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'demo_scheduled_date'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN demo_scheduled_date timestamptz;
  END IF;

  -- Add trial_start_date field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'trial_start_date'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN trial_start_date timestamptz;
  END IF;

  -- Add trial_end_date field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'trial_end_date'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN trial_end_date timestamptz;
  END IF;

  -- Add last_contact_date field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'last_contact_date'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN last_contact_date timestamptz;
  END IF;

  -- Add activities field (JSONB for activity tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'activities'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN activities jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add tags field (array for categorization)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'tags'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN tags text[] DEFAULT ARRAY[]::text[];
  END IF;

  -- Add lost_reason field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'lost_reason'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN lost_reason text;
  END IF;

  -- Add updated_at field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'software_leads' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE software_leads ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_software_leads_priority ON software_leads(priority);
CREATE INDEX IF NOT EXISTS idx_software_leads_source ON software_leads(source);
CREATE INDEX IF NOT EXISTS idx_software_leads_next_follow_up ON software_leads(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_software_leads_assigned_to ON software_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_software_leads_status ON software_leads(status);
CREATE INDEX IF NOT EXISTS idx_software_leads_created_at ON software_leads(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_software_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
DROP TRIGGER IF EXISTS software_leads_updated_at ON software_leads;
CREATE TRIGGER software_leads_updated_at
  BEFORE UPDATE ON software_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_software_leads_updated_at();

-- Ensure RLS policies exist (these might already exist, so we use CREATE IF NOT EXISTS pattern via DO blocks)
DO $$
BEGIN
  -- Drop old policies if they exist and recreate them
  DROP POLICY IF EXISTS "Super Admins can view all software leads" ON software_leads;
  DROP POLICY IF EXISTS "SaaS Reps can view all software leads" ON software_leads;
  DROP POLICY IF EXISTS "Super Admins can create software leads" ON software_leads;
  DROP POLICY IF EXISTS "SaaS Reps can create software leads" ON software_leads;
  DROP POLICY IF EXISTS "Super Admins can update all software leads" ON software_leads;
  DROP POLICY IF EXISTS "SaaS Reps can update assigned software leads" ON software_leads;
  DROP POLICY IF EXISTS "Super Admins can delete software leads" ON software_leads;

  -- Create policies
  CREATE POLICY "Super Admins can view all software leads"
    ON software_leads FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Super Admin'
      )
    );

  CREATE POLICY "SaaS Reps can view all software leads"
    ON software_leads FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'SaaS Rep'
      )
    );

  CREATE POLICY "Super Admins can create software leads"
    ON software_leads FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Super Admin'
      )
    );

  CREATE POLICY "SaaS Reps can create software leads"
    ON software_leads FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'SaaS Rep'
      )
    );

  CREATE POLICY "Super Admins can update all software leads"
    ON software_leads FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Super Admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Super Admin'
      )
    );

  CREATE POLICY "SaaS Reps can update assigned software leads"
    ON software_leads FOR UPDATE
    TO authenticated
    USING (
      assigned_to = auth.uid()
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'SaaS Rep'
      )
    )
    WITH CHECK (
      assigned_to = auth.uid()
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'SaaS Rep'
      )
    );

  CREATE POLICY "Super Admins can delete software leads"
    ON software_leads FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'Super Admin'
      )
    );
END $$;
