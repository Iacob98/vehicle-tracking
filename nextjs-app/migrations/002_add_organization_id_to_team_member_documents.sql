-- Add organization_id to team_member_documents table for RLS
-- Migration: 002_add_organization_id_to_team_member_documents

-- Step 1: Add organization_id column (nullable first)
ALTER TABLE team_member_documents
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Step 2: Populate organization_id from team_members
UPDATE team_member_documents tmd
SET organization_id = tm.organization_id
FROM team_members tm
WHERE tmd.team_member_id = tm.id
AND tmd.organization_id IS NULL;

-- Step 3: Make it NOT NULL and add foreign key
ALTER TABLE team_member_documents
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE team_member_documents
ADD CONSTRAINT team_member_documents_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_team_member_documents_organization_id
ON team_member_documents(organization_id);

-- Step 5: Drop old RLS policies if they exist
DROP POLICY IF EXISTS "Users can manage team member documents in their organization" ON team_member_documents;
DROP POLICY IF EXISTS "Users can view team member documents in their organization" ON team_member_documents;

-- Step 6: Enable RLS
ALTER TABLE team_member_documents ENABLE ROW LEVEL SECURITY;

-- Step 7: Create new RLS policies
CREATE POLICY "Users can view team member documents in their organization"
ON team_member_documents
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert team member documents in their organization"
ON team_member_documents
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update team member documents in their organization"
ON team_member_documents
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete team member documents in their organization"
ON team_member_documents
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
