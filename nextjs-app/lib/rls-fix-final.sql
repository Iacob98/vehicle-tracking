-- FINAL FIX: RLS Policies for vehicle_documents
-- Based on actual JWT structure with organization_id in user_metadata

-- 1. Enable RLS on vehicle_documents
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "Users can view documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can insert documents for their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can update documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can delete documents from their organization" ON vehicle_documents;

-- 3. Create working policies using auth.jwt()
CREATE POLICY "Users can view documents from their organization"
ON vehicle_documents FOR SELECT
TO authenticated
USING (
  organization_id::text = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )
);

CREATE POLICY "Users can insert documents for their organization"
ON vehicle_documents FOR INSERT
TO authenticated
WITH CHECK (
  organization_id::text = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )
);

CREATE POLICY "Users can update documents from their organization"
ON vehicle_documents FOR UPDATE
TO authenticated
USING (
  organization_id::text = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )
)
WITH CHECK (
  organization_id::text = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )
);

CREATE POLICY "Users can delete documents from their organization"
ON vehicle_documents FOR DELETE
TO authenticated
USING (
  organization_id::text = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )
);

-- 4. Verify policies were created
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
WHERE tablename = 'vehicle_documents';
