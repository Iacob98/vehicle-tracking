-- Fix RLS policies with proper UUID type casting

ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can insert documents for their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can update documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can delete documents from their organization" ON vehicle_documents;

-- Correct policies with UUID casting
CREATE POLICY "Users can view documents from their organization"
ON vehicle_documents FOR SELECT TO authenticated
USING (
  organization_id = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )::uuid
);

CREATE POLICY "Users can insert documents for their organization"
ON vehicle_documents FOR INSERT TO authenticated
WITH CHECK (
  organization_id = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )::uuid
);

CREATE POLICY "Users can update documents from their organization"
ON vehicle_documents FOR UPDATE TO authenticated
USING (
  organization_id = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )::uuid
)
WITH CHECK (
  organization_id = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )::uuid
);

CREATE POLICY "Users can delete documents from their organization"
ON vehicle_documents FOR DELETE TO authenticated
USING (
  organization_id = (
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'organization_id',
      auth.jwt() -> 'app_metadata' ->> 'organization_id'
    )
  )::uuid
);
