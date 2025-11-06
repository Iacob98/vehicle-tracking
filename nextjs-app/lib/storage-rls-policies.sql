-- Storage RLS Policies for Fleet Management
-- These policies ensure users can only access files from their organization

-- First, drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to upload vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their org's vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their org's vehicle photos" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their org's documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their org's documents" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated users to upload expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their org's expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their org's expense receipts" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated users to upload penalty photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view penalty photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their org's penalty photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their org's penalty photos" ON storage.objects;

-- Create new organization-aware policies for vehicles bucket
CREATE POLICY "Users can upload to their org folder in vehicles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicles'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

CREATE POLICY "Anyone can view vehicle photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicles');

CREATE POLICY "Users can update their org files in vehicles"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicles'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

CREATE POLICY "Users can delete their org files in vehicles"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicles'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

-- Create new organization-aware policies for documents bucket
CREATE POLICY "Users can upload to their org folder in documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

CREATE POLICY "Anyone can view documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

CREATE POLICY "Users can update their org files in documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

CREATE POLICY "Users can delete their org files in documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

-- Create new organization-aware policies for expenses bucket
CREATE POLICY "Users can upload to their org folder in expenses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expenses'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

CREATE POLICY "Anyone can view expense receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'expenses');

CREATE POLICY "Users can update their org files in expenses"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'expenses'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

CREATE POLICY "Users can delete their org files in expenses"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'expenses'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

-- Create new organization-aware policies for penalties bucket
CREATE POLICY "Users can upload to their org folder in penalties"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'penalties'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

CREATE POLICY "Anyone can view penalty photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'penalties');

CREATE POLICY "Users can update their org files in penalties"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'penalties'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);

CREATE POLICY "Users can delete their org files in penalties"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'penalties'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'organization_id')::text
);
