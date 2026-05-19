-- ═══════════════════════════════════════════════════════════════
-- 🔍 CHECK IF POLICIES ARE WORKING
-- Run this to verify RLS policies
-- ═══════════════════════════════════════════════════════════════

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename IN ('drivers', 'vehicles')
ORDER BY tablename;

-- Expected output:
-- drivers   | true
-- vehicles  | true

-- ─────────────────────────────────────────────────────────────

-- 2. List all policies
SELECT 
  tablename,
  policyname,
  cmd as "Command",
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as "Using",
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as "With Check"
FROM pg_policies
WHERE tablename IN ('drivers', 'vehicles')
ORDER BY tablename, policyname;

-- Expected: 5 policies for drivers, 5 for vehicles

-- ─────────────────────────────────────────────────────────────

-- 3. Check unique constraint on vehicles
SELECT
  conname as "Constraint Name",
  contype as "Type"
FROM pg_constraint
WHERE conrelid = 'vehicles'::regclass
  AND conname = 'vehicles_driver_id_key';

-- Expected: vehicles_driver_id_key | u (unique)

-- ─────────────────────────────────────────────────────────────

-- 4. Test if you can insert as authenticated user
-- (This will fail if policies are not working)

-- First, check your current user
SELECT 
  auth.uid() as "Your User ID",
  auth.role() as "Your Role";

-- ═══════════════════════════════════════════════════════════════
-- If all checks pass but still getting error, 
-- then we need to use service role key approach
-- ═══════════════════════════════════════════════════════════════
