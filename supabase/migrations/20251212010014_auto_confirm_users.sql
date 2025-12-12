/*
  # Auto-confirm new users on signup
  
  1. Changes
    - Create a trigger function to automatically confirm user emails on signup
    - This allows users to immediately access the application without email verification
    - Useful for development and internal tools
    
  2. Security
    - This bypasses email verification, so only use in trusted environments
    - For production, consider implementing proper email verification
*/

-- Create function to auto-confirm users
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm the email if it's not already confirmed
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert on auth.users
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
CREATE TRIGGER auto_confirm_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();