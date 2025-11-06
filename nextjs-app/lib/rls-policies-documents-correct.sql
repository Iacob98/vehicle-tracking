-- RLS Policies for vehicle_documents table
-- Allow authenticated users to manage documents for vehicles in their organization
-- Uses auth.users().raw_user_meta_data->>'organization_id'

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can insert documents for their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can update documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can delete documents from their organization" ON vehicle_documents;

-- Create policies for vehicle_documents table using user_metadata
CREATE POLICY "Users can view documents from their organization"
ON vehicle_documents FOR SELECT
TO authenticated
USING (
  organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
);

CREATE POLICY "Users can insert documents for their organization"
ON vehicle_documents FOR INSERT
TO authenticated
WITH CHECK (
  organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
);

CREATE POLICY "Users can update documents from their organization"
ON vehicle_documents FOR UPDATE
TO authenticated
USING (
  organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
)
WITH CHECK (
  organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
);

CREATE POLICY "Users can delete documents from their organization"
ON vehicle_documents FOR DELETE
TO authenticated
USING (
  organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
);
