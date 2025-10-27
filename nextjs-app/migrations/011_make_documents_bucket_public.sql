-- Migration 011: Make documents bucket public for viewing
-- Reason: Allow Next.js Image Optimization and public access to view documents

BEGIN;

-- Make documents bucket public
UPDATE storage.buckets
SET public = true
WHERE name = 'documents';

-- Drop old restrictive SELECT policy
DROP POLICY IF EXISTS org_documents_select ON storage.objects;

-- Create public SELECT policy for documents bucket
-- This allows anyone to view documents, but INSERT/UPDATE/DELETE are still protected
CREATE POLICY public_documents_select
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Verify
SELECT name, public FROM storage.buckets WHERE name = 'documents';

COMMIT;
