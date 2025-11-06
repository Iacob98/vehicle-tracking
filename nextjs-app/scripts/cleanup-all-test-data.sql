-- ============================================================================
-- FULL CLEANUP - Remove ALL test data, keep only super admin
-- ============================================================================

\echo '🧹 Starting FULL database cleanup...'

-- Delete ALL test/demo organizations
DELETE FROM organizations WHERE name LIKE '%TEST%' OR name IN ('kkk', 'sd');

\echo '✅ Deleted all test organizations'

-- Delete orphaned vehicles (where organization_id doesn't exist or is test data)
DELETE FROM vehicles WHERE name IN ('awd', 'задачи') OR license_plate IN ('dwa', 'sdf');

\echo '✅ Deleted orphaned test vehicles'

-- Delete test users (keep only super admin)
DELETE FROM users WHERE email NOT LIKE 'admin@test.com';

\echo '✅ Deleted test users (kept only super admin)'

-- Clean up auth.users (keep only super admin)
DELETE FROM auth.users WHERE email NOT LIKE 'admin@test.com';

\echo '✅ Cleaned up auth.users (kept only super admin)'

-- Verify cleanup
\echo ''
\echo '📊 Remaining data:'
SELECT 'Organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Auth Users', COUNT(*) FROM auth.users
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'Fuel Expenses', COUNT(*) FROM car_expenses WHERE category = 'fuel'
UNION ALL
SELECT 'Teams', COUNT(*) FROM teams
UNION ALL
SELECT 'Penalties', COUNT(*) FROM penalties;

\echo ''
\echo '✅ FULL cleanup completed! Only super admin remains.'
