-- ============================================================================
-- SIMPLIFIED TEST DATA GENERATION SCRIPT v2
-- ============================================================================
-- Использует gen_random_uuid() и правильные названия полей из реальной схемы
-- ============================================================================

\echo '🚀 Starting test data generation (v2)...'
\echo ''

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================
\echo '📋 Creating organizations...'

DO $$
DECLARE
  org1_id uuid := gen_random_uuid();
  org2_id uuid := gen_random_uuid();
BEGIN
  -- Store IDs for later use
  CREATE TEMP TABLE IF NOT EXISTS temp_ids (
    key text PRIMARY KEY,
    value uuid
  );

  INSERT INTO temp_ids (key, value) VALUES ('org1', org1_id), ('org2', org2_id);

  INSERT INTO organizations (id, name) VALUES
  (org1_id, 'Test Company Alpha'),
  (org2_id, 'Test Company Beta');

  RAISE NOTICE 'Created 2 organizations';
END $$;

\echo ''

-- ============================================================================
-- VEHICLE TYPES (UNIVERSAL)
-- ============================================================================
\echo '🚗 Creating vehicle types...'

DO $$
DECLARE
  type1_id uuid := gen_random_uuid();
  type2_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO temp_ids (key, value) VALUES ('vtype1', type1_id), ('vtype2', type2_id);

  INSERT INTO vehicle_types (id, name, fuel_consumption_per_100km, tank_capacity) VALUES
  (type1_id, 'Honda Civic Test', 6.5, 50),
  (type2_id, 'Mercedes Sprinter Test', 9.8, 75);

  RAISE NOTICE 'Created 2 vehicle types';
END $$;

\echo ''

-- ============================================================================
-- USERS
-- ============================================================================
\echo '👥 Creating users...'

-- Примечание: Пользователи создаются в таблице public.users
-- Для полноценного входа нужно также создать записи в auth.users через Supabase Auth

DO $$
DECLARE
  org1_id uuid;
  org2_id uuid;
  admin1_id uuid := gen_random_uuid();
  admin2_id uuid := gen_random_uuid();
  drv1_1_id uuid := gen_random_uuid();
  drv1_2_id uuid := gen_random_uuid();
  drv2_1_id uuid := gen_random_uuid();
  drv2_2_id uuid := gen_random_uuid();
BEGIN
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';
  SELECT value INTO org2_id FROM temp_ids WHERE key = 'org2';

  INSERT INTO temp_ids (key, value) VALUES
    ('admin1', admin1_id), ('admin2', admin2_id),
    ('drv1_1', drv1_1_id), ('drv1_2', drv1_2_id),
    ('drv2_1', drv2_1_id), ('drv2_2', drv2_2_id);

  -- Alpha organization users
  INSERT INTO users (id, email, first_name, last_name, role, organization_id, phone, fuel_card_id) VALUES
  (admin1_id, 'testadmin.alpha@example.com', 'Admin', 'Alpha', 'admin', org1_id, '+49 123 1001', NULL),
  (drv1_1_id, 'testdriver1.alpha@example.com', 'Ivan', 'Petrov', 'driver', org1_id, '+49 123 1002', 'CARD-ALPHA-DRV1'),
  (drv1_2_id, 'testdriver2.alpha@example.com', 'Maria', 'Schmidt', 'driver', org1_id, '+49 123 1003', 'CARD-ALPHA-DRV2');

  -- Beta organization users
  INSERT INTO users (id, email, first_name, last_name, role, organization_id, phone, fuel_card_id) VALUES
  (admin2_id, 'testadmin.beta@example.com', 'Admin', 'Beta', 'admin', org2_id, '+49 123 2001', NULL),
  (drv2_1_id, 'testdriver1.beta@example.com', 'Hans', 'Müller', 'driver', org2_id, '+49 123 2002', 'CARD-BETA-DRV1'),
  (drv2_2_id, 'testdriver2.beta@example.com', 'Anna', 'Weber', 'driver', org2_id, '+49 123 2003', 'CARD-BETA-DRV2');

  RAISE NOTICE 'Created 6 users';
END $$;

\echo ''

-- ============================================================================
-- TEAMS
-- ============================================================================
\echo '👥 Creating teams...'

DO $$
DECLARE
  org1_id uuid;
  org2_id uuid;
  team1_1_id uuid := gen_random_uuid();
  team1_2_id uuid := gen_random_uuid();
  team2_1_id uuid := gen_random_uuid();
  drv1_1_id uuid;
  drv1_2_id uuid;
  drv2_1_id uuid;
BEGIN
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';
  SELECT value INTO org2_id FROM temp_ids WHERE key = 'org2';
  SELECT value INTO drv1_1_id FROM temp_ids WHERE key = 'drv1_1';
  SELECT value INTO drv1_2_id FROM temp_ids WHERE key = 'drv1_2';
  SELECT value INTO drv2_1_id FROM temp_ids WHERE key = 'drv2_1';

  INSERT INTO temp_ids (key, value) VALUES ('team1_1', team1_1_id), ('team1_2', team1_2_id), ('team2_1', team2_1_id);

  -- Create teams
  INSERT INTO teams (id, name, organization_id) VALUES
  (team1_1_id, 'Construction Team A', org1_id),
  (team1_2_id, 'Delivery Team A', org1_id),
  (team2_1_id, 'Construction Team B', org2_id);

  -- Add team members
  INSERT INTO team_members (team_id, member_id, organization_id) VALUES
  (team1_1_id, drv1_1_id, org1_id),
  (team1_2_id, drv1_2_id, org1_id),
  (team2_1_id, drv2_1_id, org2_id);

  RAISE NOTICE 'Created 3 teams with members';
END $$;

\echo ''

-- ============================================================================
-- VEHICLES
-- ============================================================================
\echo '🚙 Creating vehicles...'

DO $$
DECLARE
  org1_id uuid;
  org2_id uuid;
  vtype1_id uuid;
  vtype2_id uuid;
  veh1_1_id uuid := gen_random_uuid();
  veh1_2_id uuid := gen_random_uuid();
  veh1_3_id uuid := gen_random_uuid();
  veh1_4_id uuid := gen_random_uuid();
  veh2_1_id uuid := gen_random_uuid();
  veh2_2_id uuid := gen_random_uuid();
BEGIN
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';
  SELECT value INTO org2_id FROM temp_ids WHERE key = 'org2';
  SELECT value INTO vtype1_id FROM temp_ids WHERE key = 'vtype1';
  SELECT value INTO vtype2_id FROM temp_ids WHERE key = 'vtype2';

  INSERT INTO temp_ids (key, value) VALUES
    ('veh1_1', veh1_1_id), ('veh1_2', veh1_2_id),
    ('veh1_3', veh1_3_id), ('veh1_4', veh1_4_id),
    ('veh2_1', veh2_1_id), ('veh2_2', veh2_2_id);

  -- Alpha: 2 regular + 2 rental
  INSERT INTO vehicles (id, name, license_plate, vin, model, year, status,
                       is_rental, rental_start_date, rental_end_date, rental_monthly_price,
                       organization_id, vehicle_type_id) VALUES
  -- Regular
  (veh1_1_id, 'Test Civic Work 1', 'TEST-1234', '1HGTEST109186', 'Honda Civic 2020', 2020, 'active',
   false, NULL, NULL, NULL, org1_id, vtype1_id),
  (veh1_2_id, 'Test Sprinter Van 1', 'TEST-5678', 'WDTEST5500001', 'Mercedes Sprinter 2021', 2021, 'active',
   false, NULL, NULL, NULL, org1_id, vtype2_id),
  -- Rental (one expiring soon!)
  (veh1_3_id, 'Test Rental Civic 1', 'TEST-RN11', '1HGTEST109999', 'Honda Civic 2022', 2022, 'rented',
   true, '2025-01-01', (CURRENT_DATE + INTERVAL '14 days')::date, 450.00, org1_id, vtype1_id),
  (veh1_4_id, 'Test Rental Sprinter 1', 'TEST-RN22', 'WDTEST5599999', 'Mercedes Sprinter 2022', 2022, 'rented',
   true, '2024-12-01', '2025-02-28', 750.00, org1_id, vtype2_id),

  -- Beta: 2 regular
  (veh2_1_id, 'Test Civic Work 2', 'TEST-3456', '1HGTEST209186', 'Honda Civic 2020', 2020, 'active',
   false, NULL, NULL, NULL, org2_id, vtype1_id),
  (veh2_2_id, 'Test Sprinter Van 2', 'TEST-7890', 'WDTEST5600001', 'Mercedes Sprinter 2021', 2021, 'active',
   false, NULL, NULL, NULL, org2_id, vtype2_id);

  RAISE NOTICE 'Created 6 vehicles (4 Alpha: 2 regular + 2 rental, 2 Beta)';
END $$;

\echo ''

-- ============================================================================
-- VEHICLE ASSIGNMENTS
-- ============================================================================
\echo '🔗 Creating vehicle assignments...'

DO $$
DECLARE
  org1_id uuid;
  org2_id uuid;
  veh1_1_id uuid;
  veh1_2_id uuid;
  veh2_1_id uuid;
  team1_1_id uuid;
  team1_2_id uuid;
  team2_1_id uuid;
BEGIN
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';
  SELECT value INTO org2_id FROM temp_ids WHERE key = 'org2';
  SELECT value INTO veh1_1_id FROM temp_ids WHERE key = 'veh1_1';
  SELECT value INTO veh1_2_id FROM temp_ids WHERE key = 'veh1_2';
  SELECT value INTO veh2_1_id FROM temp_ids WHERE key = 'veh2_1';
  SELECT value INTO team1_1_id FROM temp_ids WHERE key = 'team1_1';
  SELECT value INTO team1_2_id FROM temp_ids WHERE key = 'team1_2';
  SELECT value INTO team2_1_id FROM temp_ids WHERE key = 'team2_1';

  INSERT INTO vehicle_assignments (vehicle_id, team_id, start_date, end_date, organization_id) VALUES
  (veh1_1_id, team1_1_id, '2025-01-01', NULL, org1_id),
  (veh1_2_id, team1_2_id, '2025-01-01', NULL, org1_id),
  (veh2_1_id, team2_1_id, '2025-01-01', NULL, org2_id);

  RAISE NOTICE 'Created 3 vehicle assignments';
END $$;

\echo ''

-- ============================================================================
-- FUEL LIMITS
-- ============================================================================
\echo '⛽ Creating fuel limits...'

DO $$
DECLARE
  org1_id uuid;
  org2_id uuid;
BEGIN
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';
  SELECT value INTO org2_id FROM temp_ids WHERE key = 'org2';

  INSERT INTO fuel_limits (organization_id, fuel_card_id, daily_limit, weekly_limit, monthly_limit) VALUES
  (org1_id, NULL, 100.00, 500.00, 2000.00),
  (org1_id, 'CARD-ALPHA-DRV1', 80.00, 400.00, 1500.00),
  (org2_id, NULL, 100.00, 500.00, 2000.00),
  (org2_id, 'CARD-BETA-DRV1', 80.00, 400.00, 1500.00);

  RAISE NOTICE 'Created 4 fuel limits';
END $$;

\echo ''

-- ============================================================================
-- CAR EXPENSES - FUEL (WITH ANOMALIES!)
-- ============================================================================
\echo '⛽ Creating fuel expenses with ANOMALIES...'

DO $$
DECLARE
  org1_id uuid;
  veh1_1_id uuid;
  veh1_2_id uuid;
  drv1_1_id uuid;
  drv1_2_id uuid;
BEGIN
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';
  SELECT value INTO veh1_1_id FROM temp_ids WHERE key = 'veh1_1';
  SELECT value INTO veh1_2_id FROM temp_ids WHERE key = 'veh1_2';
  SELECT value INTO drv1_1_id FROM temp_ids WHERE key = 'drv1_1';
  SELECT value INTO drv1_2_id FROM temp_ids WHERE key = 'drv1_2';

  -- Driver 1 (Ivan) - Civic (6.5 л/100км)
  -- Заправка 1: Базовая
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description,
                           created_by_user_id, fuel_card_id,
                           liters, price_per_liter, odometer_reading,
                           has_anomaly) VALUES
  (org1_id, veh1_1_id, 'fuel', 40.00, CURRENT_DATE - 5, 'Первая заправка - базовая',
   drv1_1_id, 'CARD-ALPHA-DRV1', 28.5, 1.40, 10000, false);

  -- Заправка 2: Нормальная (350км, 21л)
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description,
                           created_by_user_id, fuel_card_id,
                           liters, price_per_liter, odometer_reading,
                           previous_odometer_reading, distance_traveled,
                           expected_consumption, actual_consumption, consumption_difference,
                           has_anomaly) VALUES
  (org1_id, veh1_1_id, 'fuel', 30.00, CURRENT_DATE - 4, 'Вторая заправка - норма',
   drv1_1_id, 'CARD-ALPHA-DRV1', 21.0, 1.43, 10350,
   10000, 350, 22.75, 21.0, -1.75, false);

  -- Заправка 3: АНОМАЛИЯ! (400км, 50л вместо 26л)
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description,
                           created_by_user_id, fuel_card_id,
                           liters, price_per_liter, odometer_reading,
                           previous_odometer_reading, distance_traveled,
                           expected_consumption, actual_consumption, consumption_difference,
                           has_anomaly) VALUES
  (org1_id, veh1_1_id, 'fuel', 70.00, CURRENT_DATE - 3, '🚨 АНОМАЛИЯ - перерасход 92%',
   drv1_1_id, 'CARD-ALPHA-DRV1', 50.0, 1.40, 10750,
   10350, 400, 26.0, 50.0, 24.0, true);

  -- Заправка 4: Еще аномалия (400км, 42л)
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description,
                           created_by_user_id, fuel_card_id,
                           liters, price_per_liter, odometer_reading,
                           previous_odometer_reading, distance_traveled,
                           expected_consumption, actual_consumption, consumption_difference,
                           has_anomaly) VALUES
  (org1_id, veh1_1_id, 'fuel', 60.00, CURRENT_DATE - 2, '🚨 Вторая аномалия подряд',
   drv1_1_id, 'CARD-ALPHA-DRV1', 42.0, 1.43, 11150,
   10750, 400, 26.0, 42.0, 16.0, true);

  -- Driver 2 (Maria) - Sprinter - для теста лимитов
  -- Заправка 1 (70 EUR)
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description,
                           created_by_user_id, fuel_card_id,
                           liters, price_per_liter, odometer_reading, has_anomaly) VALUES
  (org1_id, veh1_2_id, 'fuel', 70.00, CURRENT_DATE, 'Утренняя заправка',
   drv1_2_id, 'CARD-ALPHA-DRV2', 50.0, 1.40, 5000, false);

  -- Заправка 2 (40 EUR) - ПРЕВЫШЕНИЕ ЛИМИТА 80 EUR!
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description,
                           created_by_user_id, fuel_card_id,
                           liters, price_per_liter, odometer_reading,
                           previous_odometer_reading, distance_traveled,
                           expected_consumption, actual_consumption, consumption_difference,
                           has_anomaly) VALUES
  (org1_id, veh1_2_id, 'fuel', 40.00, CURRENT_DATE, '⚠️ Превышен дневной лимит (110/80 EUR)',
   drv1_2_id, 'CARD-ALPHA-DRV2', 28.0, 1.43, 5350,
   5000, 350, 34.3, 28.0, -6.3, false);

  RAISE NOTICE 'Created 6 fuel expenses (2 ANOMALIES + 1 limit exceeded)';
END $$;

\echo ''

-- ============================================================================
-- CAR EXPENSES - OTHER CATEGORIES
-- ============================================================================
\echo '💰 Creating other car expenses...'

DO $$
DECLARE
  org1_id uuid;
  veh1_1_id uuid;
  veh1_2_id uuid;
  veh1_3_id uuid;
  veh1_4_id uuid;
BEGIN
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';
  SELECT value INTO veh1_1_id FROM temp_ids WHERE key = 'veh1_1';
  SELECT value INTO veh1_2_id FROM temp_ids WHERE key = 'veh1_2';
  SELECT value INTO veh1_3_id FROM temp_ids WHERE key = 'veh1_3';
  SELECT value INTO veh1_4_id FROM temp_ids WHERE key = 'veh1_4';

  -- Repairs
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description) VALUES
  (org1_id, veh1_1_id, 'repair', 350.00, CURRENT_DATE - 10, 'Замена тормозных колодок'),
  (org1_id, veh1_2_id, 'repair', 780.00, CURRENT_DATE - 9, 'Ремонт двигателя');

  -- Insurance
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description) VALUES
  (org1_id, veh1_1_id, 'insurance', 120.00, DATE_TRUNC('month', CURRENT_DATE), 'Страховка январь'),
  (org1_id, veh1_2_id, 'insurance', 180.00, DATE_TRUNC('month', CURRENT_DATE), 'Страховка Sprinter январь');

  -- Rental payments
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description) VALUES
  (org1_id, veh1_3_id, 'rental', 450.00, DATE_TRUNC('month', CURRENT_DATE), 'Аренда Civic январь'),
  (org1_id, veh1_4_id, 'rental', 750.00, DATE_TRUNC('month', CURRENT_DATE), 'Аренда Sprinter январь');

  -- Parking
  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description) VALUES
  (org1_id, veh1_1_id, 'parking', 15.00, CURRENT_DATE - 5, 'Парковка в центре'),
  (org1_id, veh1_2_id, 'parking', 20.00, CURRENT_DATE - 4, 'Парковка на стройке');

  RAISE NOTICE 'Created 8 car expenses (repairs, insurance, rental, parking)';
END $$;

\echo ''

-- ============================================================================
-- MAINTENANCES
-- ============================================================================
\echo '🔧 Creating maintenance records...'

DO $$
DECLARE
  org1_id uuid;
  veh1_1_id uuid;
  veh1_2_id uuid;
BEGIN
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';
  SELECT value INTO veh1_1_id FROM temp_ids WHERE key = 'veh1_1';
  SELECT value INTO veh1_2_id FROM temp_ids WHERE key = 'veh1_2';

  INSERT INTO maintenances (organization_id, vehicle_id, type, date, description) VALUES
  (org1_id, veh1_1_id, 'routine', CURRENT_DATE - 12, 'Плановое ТО 10000км'),
  (org1_id, veh1_2_id, 'inspection', CURRENT_DATE - 11, 'Техосмотр перед дальней поездкой');

  RAISE NOTICE 'Created 2 maintenance records';
END $$;

\echo ''

-- ============================================================================
-- PENALTIES
-- ============================================================================
\echo '🚧 Creating penalties...'

DO $$
DECLARE
  org1_id uuid;
  veh1_1_id uuid;
  veh1_2_id uuid;
  drv1_1_id uuid;
  drv1_2_id uuid;
BEGIN
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';
  SELECT value INTO veh1_1_id FROM temp_ids WHERE key = 'veh1_1';
  SELECT value INTO veh1_2_id FROM temp_ids WHERE key = 'veh1_2';
  SELECT value INTO drv1_1_id FROM temp_ids WHERE key = 'drv1_1';
  SELECT value INTO drv1_2_id FROM temp_ids WHERE key = 'drv1_2';

  -- Open penalties
  INSERT INTO penalties (organization_id, vehicle_id, user_id, amount, date, description, status) VALUES
  (org1_id, veh1_1_id, drv1_1_id, 50.00, CURRENT_DATE - 10, 'Превышение скорости 20км/ч', 'open'),
  (org1_id, veh1_2_id, drv1_2_id, 30.00, CURRENT_DATE - 8, 'Парковка в неположенном месте', 'open');

  -- Paid penalties
  INSERT INTO penalties (organization_id, vehicle_id, user_id, amount, date, description, status, paid_at) VALUES
  (org1_id, veh1_1_id, drv1_1_id, 25.00, CURRENT_DATE - 30, 'Проезд на красный', 'paid', CURRENT_DATE - 22),
  (org1_id, veh1_2_id, drv1_2_id, 40.00, CURRENT_DATE - 25, 'Превышение скорости', 'paid', CURRENT_DATE - 15);

  RAISE NOTICE 'Created 4 penalties (2 open + 2 paid)';
END $$;

\echo ''

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
\echo '📄 Creating documents...'

DO $$
DECLARE
  veh1_1_id uuid;
  veh1_2_id uuid;
  veh1_3_id uuid;
  drv1_1_id uuid;
  drv1_2_id uuid;
  org1_id uuid;
BEGIN
  SELECT value INTO veh1_1_id FROM temp_ids WHERE key = 'veh1_1';
  SELECT value INTO veh1_2_id FROM temp_ids WHERE key = 'veh1_2';
  SELECT value INTO veh1_3_id FROM temp_ids WHERE key = 'veh1_3';
  SELECT value INTO drv1_1_id FROM temp_ids WHERE key = 'drv1_1';
  SELECT value INTO drv1_2_id FROM temp_ids WHERE key = 'drv1_2';
  SELECT value INTO org1_id FROM temp_ids WHERE key = 'org1';

  -- Vehicle documents (истекающие!)
  INSERT INTO vehicle_documents (vehicle_id, document_type, title, date_issued, date_expiry, is_active, organization_id) VALUES
  (veh1_1_id, 'insurance', 'Insurance Policy', CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '19 days', true, org1_id),
  (veh1_1_id, 'registration', 'Registration Cert', CURRENT_DATE - INTERVAL '2 years', CURRENT_DATE - INTERVAL '4 days', true, org1_id), -- ПРОСРОЧЕН!
  (veh1_2_id, 'inspection', 'Tech Inspection', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', true, org1_id),
  (veh1_3_id, 'lease', 'Rental Agreement', '2025-01-01', CURRENT_DATE + INTERVAL '14 days', true, org1_id);

  -- User documents
  INSERT INTO user_documents (user_id, document_type, title, date_issued, date_expiry, organization_id) VALUES
  (drv1_1_id, 'driver_license', 'Driver License DL-123456', '2020-05-10', '2030-05-10', org1_id),
  (drv1_2_id, 'medical_certificate', 'Medical Certificate', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '11 months', org1_id);

  RAISE NOTICE 'Created 6 documents (4 vehicle + 2 user, 2 expiring)';
END $$;

\echo ''

-- ============================================================================
-- SUMMARY
-- ============================================================================
\echo '✅ TEST DATA GENERATION COMPLETED!'
\echo ''
\echo '📊 Summary:'
\echo '  ✅ 2 organizations'
\echo '  ✅ 2 vehicle types (universal)'
\echo '  ✅ 6 users'
\echo '  ✅ 3 teams with members'
\echo '  ✅ 6 vehicles (4 Alpha, 2 Beta)'
\echo '  ✅ 3 vehicle assignments'
\echo '  ✅ 4 fuel limits'
\echo '  ✅ 6 fuel expenses (2 ANOMALIES!)'
\echo '  ✅ 8 other expenses'
\echo '  ✅ 2 maintenances'
\echo '  ✅ 4 penalties'
\echo '  ✅ 6 documents'
\echo ''
\echo '🔥 Critical Tests Ready:'
\echo '  🚨 2 FUEL ANOMALIES ready to test!'
\echo '  ⚠️  1 FUEL LIMIT exceeded!'
\echo '  ⚠️  1 RENTAL expiring in 14 days!'
\echo '  ⚠️  2 DOCUMENTS expiring/expired!'
\echo ''
\echo '🎯 Access with emails: testadmin.alpha@example.com, testdriver1.alpha@example.com'
\echo '   Note: Passwords need to be set via Supabase Auth Dashboard'
\echo ''

-- Cleanup temp table
DROP TABLE IF EXISTS temp_ids;
