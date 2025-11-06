-- Migration: Add driver_id and organization_id to vehicle_assignments table
-- Date: 2025-10-04

-- Add driver_id column to track which user (driver) is assigned to the vehicle
ALTER TABLE vehicle_assignments
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add organization_id for proper RLS and multi-tenancy
ALTER TABLE vehicle_assignments
ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_driver ON vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_organization ON vehicle_assignments(organization_id);

-- Comment for documentation
COMMENT ON COLUMN vehicle_assignments.driver_id IS 'Specific driver (user) assigned to drive this vehicle within the team';
COMMENT ON COLUMN vehicle_assignments.organization_id IS 'Organization ID for multi-tenancy and RLS';
