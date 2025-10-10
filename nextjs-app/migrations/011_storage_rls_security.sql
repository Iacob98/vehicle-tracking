-- Migration 011: Storage RLS Security
-- Date: 2025-10-10
-- Purpose: Исправить критичные уязвимости Storage RLS политик

BEGIN;

-- ============================================================================
-- CRITICAL: Remove ALL existing insecure storage policies
-- ============================================================================

-- Remove all public read policies (MAJOR SECURITY ISSUE)
DROP POLICY IF EXISTS "Public can view documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view expenses bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view penalties bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view vehicles bucket" ON storage.objects;

-- Remove duplicate/insecure authenticated policies
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload expense files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload penalty files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vehicle files" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to expenses bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to penalties bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to vehicles bucket" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can delete from documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from expenses bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from penalties bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from vehicles bucket" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can update documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update expenses bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update penalties bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicles bucket" ON storage.objects;

DROP POLICY IF EXISTS "Users can view their organization's documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view expense files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view penalty files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view vehicle files" ON storage.objects;

DROP POLICY IF EXISTS "Users can delete their organization's documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete expense files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete penalty files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete vehicle files" ON storage.objects;

DROP POLICY IF EXISTS "Users can update their organization's documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update expense files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update penalty files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update vehicle files" ON storage.objects;

-- ============================================================================
-- SECURE Storage Policies with organization_id path validation
-- ============================================================================

/*
  File Path Structure: {organization_id}/{timestamp-random}.{ext}
  Examples:
  - 550e8400-e29b-41d4-a716-446655440000/1234567890-abc.jpg
  - 550e8400-e29b-41d4-a716-446655440000/1234567890-xyz.pdf

  Organization ID is extracted from first segment of path using:
  split_part(name, '/', 1)::uuid
*/

-- ============================================================================
-- 1. DOCUMENTS bucket policies
-- ============================================================================

CREATE POLICY "org_documents_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_documents_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_documents_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_documents_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

-- ============================================================================
-- 2. VEHICLES bucket policies (PUBLIC bucket for Next.js Image Optimization)
-- ============================================================================

-- INSERT: Only own org
CREATE POLICY "org_vehicles_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicles'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

-- SELECT: Public (for Next.js Image Optimization) but filtered by org
CREATE POLICY "org_vehicles_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vehicles'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

-- Public SELECT for Next.js Image Optimization (anon users for image rendering)
CREATE POLICY "public_vehicles_select"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'vehicles');

-- UPDATE/DELETE: Only own org
CREATE POLICY "org_vehicles_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vehicles'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  )
  WITH CHECK (
    bucket_id = 'vehicles'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_vehicles_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicles'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

-- ============================================================================
-- 3. EXPENSES bucket policies
-- ============================================================================

CREATE POLICY "org_expenses_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'expenses'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_expenses_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'expenses'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_expenses_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'expenses'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  )
  WITH CHECK (
    bucket_id = 'expenses'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_expenses_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'expenses'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

-- ============================================================================
-- 4. PENALTIES bucket policies
-- ============================================================================

CREATE POLICY "org_penalties_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'penalties'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_penalties_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'penalties'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_penalties_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'penalties'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  )
  WITH CHECK (
    bucket_id = 'penalties'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

CREATE POLICY "org_penalties_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'penalties'
    AND split_part(name, '/', 1)::uuid = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

-- ============================================================================
-- 5. Service role bypass (for backend operations)
-- ============================================================================

-- Keep existing service role bypass policy
-- "Service role can access all storage" already exists

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check 1: Count new policies (should be 17: 4*4 buckets + 1 public vehicles)
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'org_%';

-- Check 2: Verify no public policies except vehicles and service_role
SELECT policyname
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname NOT LIKE 'org_%'
  AND policyname NOT LIKE 'Service role%'
ORDER BY policyname;

-- Check 3: Test path parsing
SELECT split_part('550e8400-e29b-41d4-a716-446655440000/1234567890-abc.jpg', '/', 1)::uuid;
-- Expected: 550e8400-e29b-41d4-a716-446655440000

COMMIT;

-- ============================================================================
-- IMPORTANT: Update file upload code to use organization_id in path
-- ============================================================================

/*
  ✅ Backend code already implements organization_id in path!

  Current implementation (app/api/upload/route.ts):
  const fileName = `${organizationId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  This structure is compatible with our RLS policies which extract organization_id
  from the first path segment using: split_part(name, '/', 1)::uuid

  No code changes needed!
*/
