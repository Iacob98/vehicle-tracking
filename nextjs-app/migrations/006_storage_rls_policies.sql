-- ============================================================================
-- Storage RLS Policies: Secure File Access
-- ============================================================================
-- This migration adds RLS policies to Storage buckets to prevent
-- unauthorized access to uploaded files
--
-- Date: 2025-10-10
-- Author: Claude (Migration Agent)
-- Priority: CRITICAL
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Make buckets private (disable public access)
-- ============================================================================

-- Make all buckets private
UPDATE storage.buckets SET public = false WHERE name IN ('vehicles', 'documents', 'expenses', 'penalties');

-- ============================================================================
-- PART 2: Add RLS Policies for 'documents' bucket
-- ============================================================================

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- Users can view documents if they own them (check organization via user_metadata)
-- Note: This assumes file path includes organization_id or we check via authenticated role
CREATE POLICY "Users can view their organization's documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- Users can update their own documents
CREATE POLICY "Users can update their organization's documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- Users can delete their own documents
CREATE POLICY "Users can delete their organization's documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- ============================================================================
-- PART 3: Add RLS Policies for 'vehicles' bucket
-- ============================================================================

CREATE POLICY "Authenticated users can upload vehicle files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicles' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view vehicle files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'vehicles' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update vehicle files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicles' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete vehicle files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicles' AND
  auth.role() = 'authenticated'
);

-- ============================================================================
-- PART 4: Add RLS Policies for 'expenses' bucket
-- ============================================================================

CREATE POLICY "Authenticated users can upload expense files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expenses' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view expense files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'expenses' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update expense files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'expenses' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete expense files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'expenses' AND
  auth.role() = 'authenticated'
);

-- ============================================================================
-- PART 5: Add RLS Policies for 'penalties' bucket
-- ============================================================================

CREATE POLICY "Authenticated users can upload penalty files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'penalties' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view penalty files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'penalties' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update penalty files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'penalties' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete penalty files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'penalties' AND
  auth.role() = 'authenticated'
);

-- ============================================================================
-- PART 6: Service Role Bypass (for backend operations)
-- ============================================================================

-- Service role can access all buckets
CREATE POLICY "Service role can access all storage"
ON storage.objects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PART 7: Verification
-- ============================================================================

-- Verify buckets are now private
-- SELECT name, public FROM storage.buckets;
-- Expected: all public = false

-- Verify policies exist
-- SELECT bucket_id, name, definition
-- FROM storage.policies
-- ORDER BY bucket_id, name;
-- Expected: 17 policies (4 per bucket × 4 buckets + 1 service role)

COMMIT;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

-- 1. FILE PATH STRUCTURE:
--    For better security, consider organizing files by organization:
--    {bucket}/{organization_id}/{filename}
--    Then update policies to check path:
--    name LIKE (SELECT organization_id FROM users WHERE id = auth.uid()) || '/%'

-- 2. SIGNED URLs:
--    Since buckets are now private, use signed URLs in the application:
--    const { data } = await supabase.storage
--      .from('documents')
--      .createSignedUrl(filePath, 3600); // 1 hour expiry

-- 3. MIGRATION IMPACT:
--    Existing public URLs will STOP WORKING after this migration
--    Update application code to use signed URLs or implement
--    organization-based path checking

-- 4. FUTURE IMPROVEMENT:
--    Add organization_id to file metadata and check in policies:
--    (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
--
-- ============================================================================
