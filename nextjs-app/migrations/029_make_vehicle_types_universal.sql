-- Migration 029: Make vehicle types universal (not organization-specific)
-- Vehicle types like "Civic", "BMW X5" should be the same for all organizations

-- Drop existing RLS policies (all of them)
DROP POLICY IF EXISTS "vehicle_types_select" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_select_policy" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_select_all" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_insert" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_insert_policy" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_update" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_update_policy" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_delete" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_delete_policy" ON vehicle_types;
DROP POLICY IF EXISTS "service_role_bypass_rls_vehicle_types" ON vehicle_types;
DROP POLICY IF EXISTS "service_role_bypass_all_vehicle_types" ON vehicle_types;

-- Drop the foreign key constraint and organization_id column (with CASCADE)
ALTER TABLE vehicle_types DROP CONSTRAINT IF EXISTS vehicle_types_organization_id_fkey;
ALTER TABLE vehicle_types DROP COLUMN IF EXISTS organization_id CASCADE;

-- Add unique constraint on name (since types are now global)
ALTER TABLE vehicle_types ADD CONSTRAINT vehicle_types_name_unique UNIQUE (name);

-- Create new RLS policies for universal vehicle types
-- Everyone can view all vehicle types
CREATE POLICY "vehicle_types_select_all"
  ON vehicle_types
  FOR SELECT
  USING (true);

-- Only admin and manager can insert
CREATE POLICY "vehicle_types_insert_policy"
  ON vehicle_types
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
  );

-- Only admin and manager can update
CREATE POLICY "vehicle_types_update_policy"
  ON vehicle_types
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager', 'owner')
  );

-- Only admin and owner can delete
CREATE POLICY "vehicle_types_delete_policy"
  ON vehicle_types
  FOR DELETE
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'owner')
  );

-- Service role bypass
CREATE POLICY "service_role_bypass_rls_vehicle_types"
  ON vehicle_types
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE vehicle_types IS 'Universal vehicle types available to all organizations. Examples: Civic, BMW X5, Mercedes Sprinter.';
