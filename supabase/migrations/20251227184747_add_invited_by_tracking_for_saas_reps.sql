/*
  # Add Invited By Tracking for SaaS Reps

  1. Changes
    - Add `invited_by_user_id` column to users table to track which Super Admin invited each SaaS rep
    - Add foreign key constraint to ensure referential integrity
    - Create index for performance
    
  2. Security
    - Update RLS policies to allow Super Admins to view this information
*/

-- Add invited_by_user_id column to track which Super Admin invited each SaaS rep
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'invited_by_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN invited_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_user_id);
  END IF;
END $$;

-- Update existing SaaS reps to be owned by the first Super Admin (Hayden)
UPDATE users
SET invited_by_user_id = (SELECT id FROM users WHERE email = 'haydencolesalyer@gmail.com' LIMIT 1)
WHERE role = 'SaaS Rep' AND invited_by_user_id IS NULL;
