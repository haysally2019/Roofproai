/*
  # Allow Anonymous Users to Create Software Leads

  ## Overview
  This migration allows unauthenticated users to create records in the software_leads table.
  This is necessary for capturing lead information from the onboarding funnel before users
  complete authentication.

  ## Changes
  - Add policy to allow anonymous users to INSERT into software_leads
  - Anonymous users can only create leads, not read, update, or delete them
  - Existing authenticated user policies remain unchanged

  ## Security
  - Anonymous users can only insert data
  - All other operations (SELECT, UPDATE, DELETE) still require authentication
  - RLS remains enabled on the table
*/

-- Allow anonymous users to create software leads (for onboarding funnel)
CREATE POLICY "Allow anonymous users to create software leads"
  ON software_leads FOR INSERT
  TO anon
  WITH CHECK (true);
