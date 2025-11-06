-- Migration: Fix fuel_limits RLS policies for consistency
-- Description: Update fuel_limits policies to use is_super_admin() helper function
--              instead of direct JWT checks, for consistency with other tables
-- Date: 2025-01-06

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view fuel limits" ON fuel_limits;
DROP POLICY IF EXISTS "Admin and manager can create fuel limits" ON fuel_limits;
DROP POLICY IF EXISTS "Admin and manager can update fuel limits" ON fuel_limits;
DROP POLICY IF EXISTS "Admin can delete fuel limits" ON fuel_limits;
DROP POLICY IF EXISTS service_role_bypass_fuel_limits ON fuel_limits;

-- ============================================================================
-- CREATE NEW POLICIES WITH SUPER ADMIN SUPPORT
-- ============================================================================

-- SELECT: All authenticated users can view fuel limits of their organization
-- Super admin can view all
CREATE POLICY fuel_limits_select ON fuel_limits
FOR SELECT TO authenticated
USING (
  is_super_admin()
  OR
  (organization_id = get_user_organization_id())
);

-- INSERT: Admin and manager can create fuel limits for their organization
-- Super admin can create for any organization
CREATE POLICY fuel_limits_insert ON fuel_limits
FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

-- UPDATE: Admin and manager can update fuel limits of their organization
-- Super admin can update any
CREATE POLICY fuel_limits_update ON fuel_limits
FOR UPDATE TO authenticated
USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
)
WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

-- DELETE: Only admin can delete fuel limits of their organization
-- Super admin can delete any
CREATE POLICY fuel_limits_delete ON fuel_limits
FOR DELETE TO authenticated
USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- Service role bypass (for system operations)
CREATE POLICY service_role_bypass_fuel_limits ON fuel_limits
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'fuel_limits';

  IF policy_count != 5 THEN
    RAISE EXCEPTION 'Expected 5 fuel_limits policies, found %', policy_count;
  END IF;

  RAISE NOTICE 'Fuel limits RLS policies updated successfully: % policies', policy_count;
END $$;
