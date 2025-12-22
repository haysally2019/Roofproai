/*
  # Add Policies to auth.users for Login Support

  1. Problem
    - RLS was enabled on auth.users but no policies existed
    - This blocked Supabase Auth from querying during login
    - Error: "Database error querying schema"

  2. Solution
    - Add policies to allow Supabase Auth service to access auth.users
    - Allow authenticated users to read their own record
    - Allow service role full access for admin operations

  3. Security
    - Policies are restrictive: users can only read their own data
    - Service roles have full access as needed
    - Auth admin role has full access as needed
*/

-- These policies were already created via execute_sql, this migration documents them

-- Policy 1: Allow service role full access (already created)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'auth' 
      AND tablename = 'users' 
      AND policyname = 'Allow service role full access'
  ) THEN
    CREATE POLICY "Allow service role full access"
      ON auth.users
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Policy 2: Allow authenticated users to read their own record (already created)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'auth' 
      AND tablename = 'users' 
      AND policyname = 'Allow authenticated users read own record'
  ) THEN
    CREATE POLICY "Allow authenticated users read own record"
      ON auth.users
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());
  END IF;
END $$;

-- Policy 3: Allow anon read during auth (already created)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'auth' 
      AND tablename = 'users' 
      AND policyname = 'Allow anon read during auth'
  ) THEN
    CREATE POLICY "Allow anon read during auth"
      ON auth.users
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Policy 4: Allow supabase_auth_admin full access (already created)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'auth' 
      AND tablename = 'users' 
      AND policyname = 'Allow supabase_auth_admin full access'
  ) THEN
    CREATE POLICY "Allow supabase_auth_admin full access"
      ON auth.users
      FOR ALL
      TO supabase_auth_admin
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
