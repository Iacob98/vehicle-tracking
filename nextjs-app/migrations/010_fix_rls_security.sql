-- Migration 010: Fix RLS Security Issues
-- Date: 2025-10-10
-- Purpose: Исправить критичные уязвимости RLS политик

BEGIN;

-- ============================================================================
-- CRITICAL FIX: vehicle_documents INSERT - Add FK validation
-- ============================================================================

-- Drop old insecure policy
DROP POLICY IF EXISTS "Users can insert documents for their organization" ON vehicle_documents;

-- Create new secure policy with vehicle FK validation
CREATE POLICY "Users can insert documents for their organization"
  ON vehicle_documents
  FOR INSERT
  WITH CHECK (
    -- Check organization_id matches user's org
    organization_id = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
    AND
    -- CRITICAL: Verify vehicle belongs to user's organization
    EXISTS (
      SELECT 1
      FROM vehicles
      WHERE vehicles.id = vehicle_documents.vehicle_id
        AND vehicles.organization_id = (
          COALESCE(
            ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
            ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
          )
        )::uuid
    )
  );

COMMENT ON POLICY "Users can insert documents for their organization" ON vehicle_documents IS
  'Allows users to insert vehicle documents only for vehicles in their organization. Includes FK validation to prevent cross-tenant attacks.';

-- ============================================================================
-- Add service_role bypass for archon_* tables (if needed for MCP operations)
-- ============================================================================

-- Note: archon_* tables are likely from MCP server, may not need bypass
-- Uncomment if backend operations fail:

/*
CREATE POLICY "service_role_bypass_archon_code_examples"
  ON archon_code_examples FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass_archon_crawled_pages"
  ON archon_crawled_pages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "service_role_bypass_archon_sources"
  ON archon_sources FOR ALL TO service_role
  USING (true) WITH CHECK (true);
*/

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check 1: Verify vehicle_documents INSERT policy now has FK check
SELECT
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'vehicle_documents'
  AND policyname = 'Users can insert documents for their organization';

-- Check 2: Count service_role bypass policies (should be 15 for our app tables)
SELECT COUNT(*) as bypass_count
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'service_role_bypass%'
  AND tablename NOT LIKE 'archon_%';

-- ============================================================================
-- Security Test Cases
-- ============================================================================

-- Test 1: Try to insert document for vehicle from another org (SHOULD FAIL)
-- Run as authenticated user from org_1:
-- INSERT INTO vehicle_documents (vehicle_id, organization_id, title, file_url)
-- VALUES (
--   (SELECT id FROM vehicles WHERE organization_id = 'org_2' LIMIT 1),
--   'org_1'::uuid,
--   'Malicious Document',
--   'http://example.com/test.pdf'
-- );
-- Expected: Policy violation error

-- Test 2: Try to insert document for own vehicle (SHOULD SUCCEED)
-- INSERT INTO vehicle_documents (vehicle_id, organization_id, title, file_url)
-- VALUES (
--   (SELECT id FROM vehicles WHERE organization_id = 'org_1' LIMIT 1),
--   'org_1'::uuid,
--   'Valid Document',
--   'http://example.com/test.pdf'
-- );
-- Expected: Success

COMMIT;

-- ============================================================================
-- Rollback Instructions
-- ============================================================================

-- To rollback this migration:
/*
BEGIN;

-- Restore old insecure policy
DROP POLICY IF EXISTS "Users can insert documents for their organization" ON vehicle_documents;

CREATE POLICY "Users can insert documents for their organization"
  ON vehicle_documents
  FOR INSERT
  WITH CHECK (
    organization_id = (
      COALESCE(
        ((auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text),
        ((auth.jwt() -> 'app_metadata'::text) ->> 'organization_id'::text)
      )
    )::uuid
  );

COMMIT;
*/
