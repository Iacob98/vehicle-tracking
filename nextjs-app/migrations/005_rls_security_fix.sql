-- ============================================================================
-- RLS Security Fix: Cross-Tenant Protection
-- ============================================================================
-- This migration adds missing WITH CHECK clauses to UPDATE policies
-- and cross-tenant FK validation to prevent data leakage
--
-- Date: 2025-10-10
-- Author: Claude (Migration Agent)
-- Priority: CRITICAL
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Fix UPDATE policies - Add WITH CHECK clauses
-- ============================================================================

-- Fix team_member_documents UPDATE policy
DROP POLICY IF EXISTS "Users can update team member documents in their organization" ON team_member_documents;
CREATE POLICY "Users can update team member documents in their organization"
ON team_member_documents
FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Fix user_documents UPDATE policy
DROP POLICY IF EXISTS "Users can update user documents in their organization" ON user_documents;
CREATE POLICY "Users can update user documents in their organization"
ON user_documents
FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Fix vehicle_assignments UPDATE policy
DROP POLICY IF EXISTS "Users can update vehicle assignments in their organization" ON vehicle_assignments;
CREATE POLICY "Users can update vehicle assignments in their organization"
ON vehicle_assignments
FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================================
-- PART 2: Add Cross-Tenant FK Validation to INSERT policies
-- ============================================================================

-- Fix vehicle_assignments INSERT - validate vehicle and team belong to same org
DROP POLICY IF EXISTS "Users can insert vehicle assignments in their organization" ON vehicle_assignments;
CREATE POLICY "Users can insert vehicle assignments in their organization"
ON vehicle_assignments
FOR INSERT
WITH CHECK (
  -- Check user's organization matches the assignment
  organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  AND
  -- Validate vehicle belongs to user's organization
  EXISTS (
    SELECT 1 FROM vehicles
    WHERE vehicles.id = vehicle_assignments.vehicle_id
    AND vehicles.organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
  AND
  -- Validate team belongs to user's organization
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = vehicle_assignments.team_id
    AND teams.organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Fix team_member_documents INSERT - validate team_member belongs to same org
DROP POLICY IF EXISTS "Users can insert team member documents in their organization" ON team_member_documents;
CREATE POLICY "Users can insert team member documents in their organization"
ON team_member_documents
FOR INSERT
WITH CHECK (
  -- Check user's organization matches
  organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  AND
  -- Validate team_member belongs to user's organization
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = team_member_documents.team_member_id
    AND team_members.organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Fix user_documents INSERT - validate user belongs to same org
DROP POLICY IF EXISTS "Users can insert user documents in their organization" ON user_documents;
CREATE POLICY "Users can insert user documents in their organization"
ON user_documents
FOR INSERT
WITH CHECK (
  -- Check user's organization matches
  organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  AND
  -- Validate user belongs to same organization
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_documents.user_id
    AND users.organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- ============================================================================
-- PART 3: Add Service Role Bypass Policies (for backend operations)
-- ============================================================================

-- Service role bypass for vehicles
CREATE POLICY "service_role_bypass_all_vehicles" ON vehicles
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for teams
CREATE POLICY "service_role_bypass_all_teams" ON teams
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for users
CREATE POLICY "service_role_bypass_all_users" ON users
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for penalties
CREATE POLICY "service_role_bypass_all_penalties" ON penalties
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for maintenances
CREATE POLICY "service_role_bypass_all_maintenances" ON maintenances
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for car_expenses
CREATE POLICY "service_role_bypass_all_car_expenses" ON car_expenses
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for expenses
CREATE POLICY "service_role_bypass_all_expenses" ON expenses
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for team_members
CREATE POLICY "service_role_bypass_all_team_members" ON team_members
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for vehicle_assignments
CREATE POLICY "service_role_bypass_all_vehicle_assignments" ON vehicle_assignments
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for vehicle_documents
CREATE POLICY "service_role_bypass_all_vehicle_documents" ON vehicle_documents
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for user_documents
CREATE POLICY "service_role_bypass_all_user_documents" ON user_documents
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for team_member_documents
CREATE POLICY "service_role_bypass_all_team_member_documents" ON team_member_documents
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for rental_contracts
CREATE POLICY "service_role_bypass_all_rental_contracts" ON rental_contracts
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Service role bypass for organizations
CREATE POLICY "service_role_bypass_all_organizations" ON organizations
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 4: Verification Queries (run manually to test)
-- ============================================================================

-- Test 1: Verify WITH CHECK on UPDATE policies
-- SELECT tablename, policyname, cmd, with_check IS NOT NULL as has_with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('vehicle_assignments', 'team_member_documents', 'user_documents')
-- AND cmd = 'UPDATE';
-- Expected: all should have has_with_check = true

-- Test 2: Try cross-tenant assignment (should FAIL)
-- SET ROLE authenticated;
-- SET request.jwt.claims.user_metadata TO '{"organization_id": "org-1"}';
-- INSERT INTO vehicle_assignments (vehicle_id, team_id, start_date, organization_id)
-- VALUES (
--   (SELECT id FROM vehicles WHERE organization_id = 'org-2' LIMIT 1),
--   (SELECT id FROM teams WHERE organization_id = 'org-1' LIMIT 1),
--   CURRENT_DATE,
--   'org-1'
-- );
-- Expected: ERROR - policy violation

-- Test 3: Verify service_role bypass works
-- SELECT COUNT(*) FROM pg_policies
-- WHERE schemaname = 'public'
-- AND policyname LIKE 'service_role_bypass%';
-- Expected: 14 policies (one per table)

COMMIT;

-- ============================================================================
-- Rollback script (if needed)
-- ============================================================================
-- To rollback, drop all service_role policies and restore original UPDATE policies
-- This should only be used in development/testing
--
-- BEGIN;
-- DROP POLICY IF EXISTS "service_role_bypass_all_vehicles" ON vehicles;
-- DROP POLICY IF EXISTS "service_role_bypass_all_teams" ON teams;
-- -- ... etc for all service_role policies
-- ROLLBACK;
