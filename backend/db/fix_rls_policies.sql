-- ═══════════════════════════════════════════════════════════════
-- 🔒 FIX RLS POLICIES FOR DRIVER REGISTRATION
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. DROP EXISTING POLICIES (if any conflicts)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Drivers can view own record" ON drivers;
DROP POLICY IF EXISTS "Drivers can insert own record" ON drivers;
DROP POLICY IF EXISTS "Drivers can update own record" ON drivers;
DROP POLICY IF EXISTS "Admins can view all drivers" ON drivers;
DROP POLICY IF EXISTS "Admins can update all drivers" ON drivers;

DROP POLICY IF EXISTS "Drivers can view own vehicle" ON vehicles;
DROP POLICY IF EXISTS "Drivers can insert own vehicle" ON vehicles;
DROP POLICY IF EXISTS "Drivers can update own vehicle" ON vehicles;
DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;
DROP POLICY IF EXISTS "Admins can update all vehicles" ON vehicles;

-- ─────────────────────────────────────────────────────────────
-- 2. ENABLE RLS ON TABLES
-- ─────────────────────────────────────────────────────────────

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 3. DRIVERS TABLE POLICIES
-- ─────────────────────────────────────────────────────────────

-- Allow drivers to SELECT their own record
CREATE POLICY "Drivers can view own record"
ON drivers FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow drivers to INSERT their own record
CREATE POLICY "Drivers can insert own record"
ON drivers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow drivers to UPDATE their own record
CREATE POLICY "Drivers can update own record"
ON drivers FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins to SELECT all drivers
CREATE POLICY "Admins can view all drivers"
ON drivers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admins to UPDATE all drivers
CREATE POLICY "Admins can update all drivers"
ON drivers FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ─────────────────────────────────────────────────────────────
-- 4. VEHICLES TABLE POLICIES
-- ─────────────────────────────────────────────────────────────

-- Allow drivers to SELECT their own vehicles
CREATE POLICY "Drivers can view own vehicle"
ON vehicles FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- Allow drivers to INSERT their own vehicles
CREATE POLICY "Drivers can insert own vehicle"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = driver_id);

-- Allow drivers to UPDATE their own vehicles
CREATE POLICY "Drivers can update own vehicle"
ON vehicles FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id)
WITH CHECK (auth.uid() = driver_id);

-- Allow admins to SELECT all vehicles
CREATE POLICY "Admins can view all vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow admins to UPDATE all vehicles
CREATE POLICY "Admins can update all vehicles"
ON vehicles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ─────────────────────────────────────────────────────────────
-- 5. ADD UNIQUE CONSTRAINT ON VEHICLES (if not exists)
-- ─────────────────────────────────────────────────────────────

-- This allows upsert to work properly
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicles_driver_id_key'
  ) THEN
    ALTER TABLE vehicles ADD CONSTRAINT vehicles_driver_id_key UNIQUE (driver_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 6. VERIFY POLICIES
-- ─────────────────────────────────────────────────────────────

-- Check drivers policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('drivers', 'vehicles')
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════
-- ✅ DONE! Now test driver registration
-- ═══════════════════════════════════════════════════════════════

-- Test queries (run these to verify):
-- 1. As a driver, you should be able to:
--    - INSERT into drivers with your own id
--    - SELECT from drivers where id = your id
--    - UPDATE drivers where id = your id
--    - INSERT into vehicles with driver_id = your id
--    - SELECT from vehicles where driver_id = your id
--    - UPDATE vehicles where driver_id = your id

-- 2. As an admin, you should be able to:
--    - SELECT all drivers
--    - UPDATE any driver
--    - SELECT all vehicles
--    - UPDATE any vehicle
