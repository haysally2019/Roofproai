/*
  # Remove password_hash from users table

  1. Changes
    - Drop password_hash column from users table since authentication is handled by auth.users
    - Add updated_at column if missing
    
  2. Security
    - No security changes, passwords are managed by Supabase Auth
*/

-- Remove password_hash column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users DROP COLUMN password_hash;
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;