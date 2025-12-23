/*
  # Fix Commissions Status Constraint
  
  ## Changes
  
  1. Drop the old status check constraint
  2. Add new status check constraint with correct values: 'pending', 'processing', 'paid', 'failed'
  
  This fixes the mismatch between the code and database constraint.
*/

-- Drop old constraint
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_status_check;

-- Add new constraint with correct values (lowercase)
ALTER TABLE commissions ADD CONSTRAINT commissions_status_check 
  CHECK (status IN ('pending', 'processing', 'paid', 'failed'));
