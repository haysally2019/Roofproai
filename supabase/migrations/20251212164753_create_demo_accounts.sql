/*
  # Create Demo Accounts
  
  1. Creates demo user accounts for testing
    - admin@roofpro.app (Super Admin)
    - john@apex.com (Company Owner)
  
  2. Creates demo companies
    - RoofPro (for admin)
    - Apex Roofing (for john)
  
  Note: These are created in the users table. The actual auth accounts 
  need to be created via Supabase Auth signup.
*/

-- Create demo companies
INSERT INTO companies (id, name, tier, status, setup_complete, address, phone)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'RoofPro', 'Enterprise', 'Active', true, '123 Admin St', '(555) 000-0001'),
  ('00000000-0000-0000-0000-000000000002', 'Apex Roofing', 'Professional', 'Active', true, '456 Roofing Ave', '(555) 000-0002')
ON CONFLICT (id) DO NOTHING;
