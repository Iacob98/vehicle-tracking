-- Simple Storage RLS Policies for Fleet Management
-- Allow authenticated users to upload files to their organization folder

-- First, drop all existing policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Simple policies that allow authenticated users to upload to their org folder
-- and allow public read access

-- Vehicles bucket policies
CREATE POLICY "Authenticated users can upload to vehicles bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicles');

CREATE POLICY "Public can view vehicles bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicles');

CREATE POLICY "Authenticated users can update vehicles bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicles');

CREATE POLICY "Authenticated users can delete from vehicles bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicles');

-- Documents bucket policies
CREATE POLICY "Authenticated users can upload to documents bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Public can view documents bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update documents bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete from documents bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Expenses bucket policies
CREATE POLICY "Authenticated users can upload to expenses bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expenses');

CREATE POLICY "Public can view expenses bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'expenses');

CREATE POLICY "Authenticated users can update expenses bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'expenses');

CREATE POLICY "Authenticated users can delete from expenses bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'expenses');

-- Penalties bucket policies
CREATE POLICY "Authenticated users can upload to penalties bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'penalties');

CREATE POLICY "Public can view penalties bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'penalties');

CREATE POLICY "Authenticated users can update penalties bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'penalties');

CREATE POLICY "Authenticated users can delete from penalties bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'penalties');
