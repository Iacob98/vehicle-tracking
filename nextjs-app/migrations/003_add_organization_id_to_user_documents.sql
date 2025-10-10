-- Migration: 003_add_organization_id_to_user_documents
-- Date: 2025-10-05
-- Status: ✅ APPLIED

-- Step 1: Add organization_id column (nullable first)
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Step 2: Populate organization_id from users
UPDATE user_documents ud
SET organization_id = u.organization_id
FROM users u
WHERE ud.user_id = u.id
AND ud.organization_id IS NULL;

-- Step 3: Make it NOT NULL and add foreign key
ALTER TABLE user_documents
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE user_documents
ADD CONSTRAINT user_documents_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_documents_organization_id
ON user_documents(organization_id);

-- Step 5: Enable RLS
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view user documents in their organization"
ON user_documents FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert user documents in their organization"
ON user_documents FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update user documents in their organization"
ON user_documents FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete user documents in their organization"
ON user_documents FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
