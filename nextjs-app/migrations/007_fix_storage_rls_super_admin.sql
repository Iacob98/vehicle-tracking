-- Migration: Fix Storage RLS policies for super admin
-- Description: Update storage bucket policies to allow super admin (owner/admin with NULL org_id)
--              to access all files across all organizations
-- Date: 2025-01-06

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

-- Expenses bucket
DROP POLICY IF EXISTS org_expenses_select ON storage.objects;
DROP POLICY IF EXISTS org_expenses_insert ON storage.objects;
DROP POLICY IF EXISTS org_expenses_update ON storage.objects;
DROP POLICY IF EXISTS org_expenses_delete ON storage.objects;

-- Vehicles bucket
DROP POLICY IF EXISTS org_vehicles_select ON storage.objects;
DROP POLICY IF EXISTS org_vehicles_insert ON storage.objects;
DROP POLICY IF EXISTS org_vehicles_update ON storage.objects;
DROP POLICY IF EXISTS org_vehicles_delete ON storage.objects;

-- Penalties bucket
DROP POLICY IF EXISTS org_penalties_select ON storage.objects;
DROP POLICY IF EXISTS org_penalties_insert ON storage.objects;
DROP POLICY IF EXISTS org_penalties_update ON storage.objects;
DROP POLICY IF EXISTS org_penalties_delete ON storage.objects;

-- Documents bucket
DROP POLICY IF EXISTS org_documents_select ON storage.objects;
DROP POLICY IF EXISTS org_documents_insert ON storage.objects;
DROP POLICY IF EXISTS org_documents_update ON storage.objects;
DROP POLICY IF EXISTS org_documents_delete ON storage.objects;

-- ============================================================================
-- CREATE NEW POLICIES WITH SUPER ADMIN SUPPORT
-- ============================================================================

-- Helper function to get organization_id from JWT
CREATE OR REPLACE FUNCTION get_jwt_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(
    ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text)::uuid,
    ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)::uuid
  );
$$;

-- ============================================================================
-- EXPENSES BUCKET POLICIES
-- ============================================================================

CREATE POLICY org_expenses_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'expenses'
  AND (
    -- Super admin can see all
    is_super_admin()
    OR
    -- Regular users can see only their org files
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_expenses_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'expenses'
  AND (
    -- Super admin can upload to any org folder
    is_super_admin()
    OR
    -- Regular users can upload only to their org folder
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_expenses_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'expenses'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
)
WITH CHECK (
  bucket_id = 'expenses'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_expenses_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'expenses'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

-- ============================================================================
-- VEHICLES BUCKET POLICIES
-- ============================================================================

CREATE POLICY org_vehicles_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicles'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_vehicles_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicles'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_vehicles_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'vehicles'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
)
WITH CHECK (
  bucket_id = 'vehicles'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_vehicles_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'vehicles'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

-- ============================================================================
-- PENALTIES BUCKET POLICIES
-- ============================================================================

CREATE POLICY org_penalties_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'penalties'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_penalties_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'penalties'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_penalties_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'penalties'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
)
WITH CHECK (
  bucket_id = 'penalties'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_penalties_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'penalties'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

-- ============================================================================
-- DOCUMENTS BUCKET POLICIES
-- ============================================================================

CREATE POLICY org_documents_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_documents_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_documents_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

CREATE POLICY org_documents_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    is_super_admin()
    OR
    (split_part(name, '/', 1))::uuid = get_jwt_organization_id()
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'org_%';

  IF policy_count < 16 THEN
    RAISE EXCEPTION 'Expected 16 storage policies, found %', policy_count;
  END IF;

  RAISE NOTICE 'Storage RLS policies updated successfully: % policies', policy_count;
END $$;
