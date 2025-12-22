/*
  # Fix Auto Confirm User Trigger Timing

  1. Issue
    - The auto_confirm_user trigger is set to BEFORE INSERT
    - It tries to UPDATE auth.users during INSERT, causing circular dependency
    - This causes "Database error querying schema" at login

  2. Changes
    - Drop the existing BEFORE INSERT trigger
    - Recreate as AFTER INSERT trigger
    - This allows the INSERT to complete before UPDATE runs

  3. Security
    - Function remains SECURITY DEFINER to access auth.users
    - Still auto-confirms users as intended
*/

-- Drop the existing trigger
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;

-- Recreate the trigger as AFTER INSERT instead of BEFORE INSERT
CREATE TRIGGER auto_confirm_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();
