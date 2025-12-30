/*
  # Create Sales Rep Applicants Table

  1. New Tables
    - `sales_rep_applicants`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `location` (text, optional)
      - `experience` (text, optional)
      - `linkedin` (text, optional)
      - `resume` (text, optional - URL to resume)
      - `cover_letter` (text, optional)
      - `status` (text, default 'New')
      - `notes` (text, optional)
      - `reviewed_by` (uuid, foreign key to users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sales_rep_applicants` table
    - Add policy for anonymous users to create applications
    - Add policy for super admins to view and update applications
*/

CREATE TABLE IF NOT EXISTS sales_rep_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  location text,
  experience text,
  linkedin text,
  resume text,
  cover_letter text,
  status text DEFAULT 'New' NOT NULL CHECK (status IN ('New', 'Reviewing', 'Interview', 'Approved', 'Rejected')),
  notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE sales_rep_applicants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create applications"
  ON sales_rep_applicants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins can view all applications"
  ON sales_rep_applicants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update applications"
  ON sales_rep_applicants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sales_rep_applicants_status ON sales_rep_applicants(status);
CREATE INDEX IF NOT EXISTS idx_sales_rep_applicants_email ON sales_rep_applicants(email);
CREATE INDEX IF NOT EXISTS idx_sales_rep_applicants_created_at ON sales_rep_applicants(created_at DESC);