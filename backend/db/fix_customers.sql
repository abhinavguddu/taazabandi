-- Fix missing customers entries
-- Run this in Supabase SQL Editor

-- Step 1: Check existing profiles
SELECT id, phone, role, name FROM profiles WHERE role = 'customer';

-- Step 2: Create customers entries for all customer profiles
INSERT INTO customers (id, loyalty_points, referral_code)
SELECT 
  id, 
  0 as loyalty_points,
  'TB' || SUBSTRING(uuid_generate_v4()::text, 1, 6) as referral_code
FROM profiles 
WHERE role = 'customer'
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify customers table
SELECT c.id, p.phone, p.name, c.loyalty_points, c.referral_code 
FROM customers c
JOIN profiles p ON c.id = p.id;
