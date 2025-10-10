-- Migration 012: Fix PostgREST Schema Cache
-- Date: 2025-10-10
-- Purpose: Force PostgREST to reload schema after maintenances table cleanup

BEGIN;

-- ============================================================================
-- Force PostgREST schema reload
-- ============================================================================

-- PostgREST listens to NOTIFY on the 'pgrst' channel
-- This should force it to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Verification: Test insert into maintenances with correct schema
-- ============================================================================

DO $$
DECLARE
  test_org_id uuid := '550e8400-e29b-41d4-a716-446655440000'::uuid;
  test_vehicle_id uuid;
  test_maintenance_id uuid;
BEGIN
  -- Find any vehicle for testing
  SELECT id INTO test_vehicle_id
  FROM vehicles
  WHERE organization_id = test_org_id
  LIMIT 1;

  IF test_vehicle_id IS NOT NULL THEN
    -- Try to insert a test maintenance record (will be rolled back)
    INSERT INTO maintenances (
      organization_id,
      vehicle_id,
      date,
      type,
      description
    ) VALUES (
      test_org_id,
      test_vehicle_id,
      CURRENT_DATE,
      'inspection',
      'Test maintenance - will be rolled back'
    )
    RETURNING id INTO test_maintenance_id;

    RAISE NOTICE 'Test insert successful! Maintenance ID: %', test_maintenance_id;

    -- This will be rolled back by ROLLBACK at the end
  ELSE
    RAISE NOTICE 'No test vehicle found for org %, skipping test insert', test_org_id;
  END IF;
END $$;

-- ============================================================================
-- Show current maintenances table structure
-- ============================================================================

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'maintenances'
ORDER BY ordinal_position;

ROLLBACK; -- Rollback the test transaction

-- Now commit for real with just the NOTIFY
BEGIN;
NOTIFY pgrst, 'reload schema';
COMMIT;
