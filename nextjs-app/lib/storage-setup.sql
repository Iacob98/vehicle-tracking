-- Supabase Storage Setup for Fleet Management
-- Create storage buckets for vehicles, documents, and other uploads

-- 1. Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('vehicles', 'vehicles', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]),
  ('documents', 'documents', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']::text[]),
  ('expenses', 'expenses', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']::text[]),
  ('penalties', 'penalties', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies for vehicles bucket
CREATE POLICY "Allow authenticated users to upload vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicles');

CREATE POLICY "Allow public to view vehicle photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicles');

CREATE POLICY "Allow authenticated users to update their org's vehicle photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicles');

CREATE POLICY "Allow authenticated users to delete their org's vehicle photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicles');

-- 3. RLS Policies for documents bucket
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow public to view documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to update their org's documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to delete their org's documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- 4. RLS Policies for expenses bucket
CREATE POLICY "Allow authenticated users to upload expense receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expenses');

CREATE POLICY "Allow public to view expense receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'expenses');

CREATE POLICY "Allow authenticated users to update their org's expense receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'expenses');

CREATE POLICY "Allow authenticated users to delete their org's expense receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'expenses');

-- 5. RLS Policies for penalties bucket
CREATE POLICY "Allow authenticated users to upload penalty photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'penalties');

CREATE POLICY "Allow public to view penalty photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'penalties');

CREATE POLICY "Allow authenticated users to update their org's penalty photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'penalties');

CREATE POLICY "Allow authenticated users to delete their org's penalty photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'penalties');
