/*
  # Create lead_activities table

  1. New Tables
    - `lead_activities`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to leads)
      - `type` (text) - Activity type
      - `description` (text) - Activity description
      - `user_id` (uuid) - User who created the activity
      - `created_at` (timestamptz) - When the activity occurred

  2. Security
    - Enable RLS on `lead_activities` table
    - Add policy for authenticated users to view activities for leads in their company
    - Add policy for authenticated users to insert activities for leads in their company
*/

-- Create lead_activities table
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('Status Change', 'Note Added', 'Email Sent', 'File Uploaded', 'Info Updated', 'System')),
  description text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Policy for viewing lead activities
CREATE POLICY "Users can view lead activities"
  ON lead_activities FOR SELECT
  TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM leads 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policy for inserting lead activities
CREATE POLICY "Users can insert lead activities"
  ON lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );
