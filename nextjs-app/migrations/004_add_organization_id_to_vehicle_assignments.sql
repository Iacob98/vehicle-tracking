-- Migration: 004_add_organization_id_to_vehicle_assignments
-- Date: 2025-10-05
-- Status: ✅ APPLIED

-- Step 1: Add organization_id column (nullable first)
ALTER TABLE vehicle_assignments
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Step 2: Populate organization_id from vehicles
UPDATE vehicle_assignments va
SET organization_id = v.organization_id
FROM vehicles v
WHERE va.vehicle_id = v.id
AND va.organization_id IS NULL;

-- Step 3: Make it NOT NULL and add foreign key
ALTER TABLE vehicle_assignments
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE vehicle_assignments
ADD CONSTRAINT vehicle_assignments_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_organization_id
ON vehicle_assignments(organization_id);

-- Step 5: Enable RLS
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view vehicle assignments in their organization"
ON vehicle_assignments FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert vehicle assignments in their organization"
ON vehicle_assignments FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update vehicle assignments in their organization"
ON vehicle_assignments FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete vehicle assignments in their organization"
ON vehicle_assignments FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
