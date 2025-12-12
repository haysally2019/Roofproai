/*
  # Add company update policy

  1. Security Changes
    - Add UPDATE policy for companies table
    - Allow company owners to update their own company settings

  2. Notes
    - Users can only update companies they belong to
    - This enables the onboarding flow to complete successfully
*/

CREATE POLICY "Company owners can update their company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = companies.id
      AND users.role = 'Company Owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = companies.id
      AND users.role = 'Company Owner'
    )
  );