-- TEMPORARY: Disable RLS for vehicle_documents to test functionality
-- This should be re-enabled with proper policies later!

-- Drop all policies
DROP POLICY IF EXISTS "Users can view documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can insert documents for their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can update documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can delete documents from their organization" ON vehicle_documents;

-- Disable RLS temporarily
ALTER TABLE vehicle_documents DISABLE ROW LEVEL SECURITY;

-- NOTE: This is INSECURE for production!
-- Re-enable RLS once proper policies are working:
-- ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
