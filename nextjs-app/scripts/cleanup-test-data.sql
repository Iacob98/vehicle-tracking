-- ============================================================================
-- CLEANUP TEST DATA - Remove all test data, keep only super admin
-- ============================================================================

\echo '🧹 Starting database cleanup...'

-- Delete test organizations and all related data (CASCADE will handle it)
DELETE FROM organizations WHERE name IN ('Test Company Alpha', 'Test Company Beta', 'Test Company');

\echo '✅ Deleted test organizations and all related data (vehicles, users, expenses, etc.)'

-- Delete any remaining test users (just in case)
DELETE FROM users WHERE email LIKE 'test%@example.com';

\echo '✅ Deleted test users'

-- Clean up auth.users (test accounts)
DELETE FROM auth.users WHERE email LIKE 'test%@example.com';

\echo '✅ Cleaned up auth.users'

-- Verify cleanup
\echo ''
\echo '📊 Remaining data:'
SELECT 'Organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'Fuel Expenses', COUNT(*) FROM car_expenses WHERE category = 'fuel'
UNION ALL
SELECT 'Teams', COUNT(*) FROM teams
UNION ALL
SELECT 'Penalties', COUNT(*) FROM penalties
UNION ALL
SELECT 'Documents', COUNT(*) FROM vehicle_documents;

\echo ''
\echo '✅ Database cleanup completed! Only super admin and existing data remain.'
