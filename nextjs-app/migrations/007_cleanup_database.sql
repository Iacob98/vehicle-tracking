-- Cleanup Database Script
-- Removes all data except admin user (admin@test.com) and their organization
-- Admin ID: 8cbf55b0-0afb-43b1-aa67-29037883507e
-- Organization ID: 550e8400-e29b-41d4-a716-446655440000

BEGIN;

-- Store admin's organization_id for reference
DO $$
DECLARE
    admin_org_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
    -- 1. Delete all vehicle-related data
    DELETE FROM vehicle_documents WHERE vehicle_id IN (
        SELECT id FROM vehicles WHERE organization_id != admin_org_id
    );

    DELETE FROM vehicle_assignments WHERE vehicle_id IN (
        SELECT id FROM vehicles WHERE organization_id != admin_org_id
    );

    DELETE FROM car_expenses WHERE vehicle_id IN (
        SELECT id FROM vehicles WHERE organization_id != admin_org_id
    );

    DELETE FROM vehicles WHERE organization_id != admin_org_id;

    -- 2. Delete all team-related data
    DELETE FROM team_members WHERE team_id IN (
        SELECT id FROM teams WHERE organization_id != admin_org_id
    );

    DELETE FROM expenses WHERE team_id IN (
        SELECT id FROM teams WHERE organization_id != admin_org_id
    );

    DELETE FROM vehicle_assignments WHERE team_id IN (
        SELECT id FROM teams WHERE organization_id != admin_org_id
    );

    DELETE FROM teams WHERE organization_id != admin_org_id;

    -- 3. Delete all expenses not related to admin's org
    DELETE FROM expenses WHERE organization_id != admin_org_id;

    -- 4. Delete user and team member documents from other orgs
    DELETE FROM user_documents WHERE user_id IN (
        SELECT id FROM users WHERE organization_id != admin_org_id
    );

    DELETE FROM team_member_documents WHERE team_member_id IN (
        SELECT id FROM team_members WHERE team_id IN (
            SELECT id FROM teams WHERE organization_id != admin_org_id
        )
    );

    -- 5. Delete all users from public.users except admin
    DELETE FROM users WHERE id != '8cbf55b0-0afb-43b1-aa67-29037883507e';

    -- 6. Delete all organizations except admin's
    DELETE FROM organizations WHERE id != admin_org_id;

    -- 7. Delete all auth.users except admin
    DELETE FROM auth.users WHERE id != '8cbf55b0-0afb-43b1-aa67-29037883507e';

    RAISE NOTICE 'Database cleanup completed successfully!';
    RAISE NOTICE 'Remaining: admin@test.com and organization 550e8400-e29b-41d4-a716-446655440000';
END $$;

COMMIT;

-- Verification queries
SELECT 'Users count' as check_type, COUNT(*) as count FROM auth.users;
SELECT 'Organizations count' as check_type, COUNT(*) as count FROM organizations;
SELECT 'Vehicles count' as check_type, COUNT(*) as count FROM vehicles;
SELECT 'Teams count' as check_type, COUNT(*) as count FROM teams;
SELECT 'Expenses count' as check_type, COUNT(*) as count FROM expenses;
