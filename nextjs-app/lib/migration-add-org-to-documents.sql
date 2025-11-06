-- Migration: Add organization_id to vehicle_documents table
-- Date: 2025-10-04

-- Add organization_id column
ALTER TABLE vehicle_documents
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill organization_id from vehicles table for existing records
UPDATE vehicle_documents vd
SET organization_id = v.organization_id
FROM vehicles v
WHERE vd.vehicle_id = v.id
  AND vd.organization_id IS NULL;

-- Make organization_id NOT NULL after backfill
ALTER TABLE vehicle_documents
ALTER COLUMN organization_id SET NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_organization ON vehicle_documents(organization_id);

-- Comment for documentation
COMMENT ON COLUMN vehicle_documents.organization_id IS 'Organization ID for multi-tenancy and RLS';
