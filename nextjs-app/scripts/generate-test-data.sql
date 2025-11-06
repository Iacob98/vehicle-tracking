-- ============================================================================
-- COMPREHENSIVE TEST DATA GENERATION SCRIPT
-- ============================================================================
-- Purpose: Create complete test data for all system modules
-- Usage: psql -h HOST -U USER -d DATABASE -f generate-test-data.sql
-- ============================================================================

-- ВАЖНО: Этот скрипт создает тестовые данные для проверки всей системы
-- Включает: организации, пользователей, автомобили, расходы, аномалии и т.д.

\echo '🚀 Starting comprehensive test data generation...'
\echo ''

-- ============================================================================
-- PHASE 1: ORGANIZATIONS
-- ============================================================================
\echo '📋 Phase 1: Creating test organizations...'

INSERT INTO organizations (id, name, description, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Test Company Alpha', 'Тестовая организация для проверки системы', NOW()),
('22222222-2222-2222-2222-222222222222', 'Test Company Beta', 'Вторая тестовая организация для проверки RLS', NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 2 organizations'
\echo ''

-- ============================================================================
-- PHASE 2: VEHICLE TYPES (UNIVERSAL - NO ORG_ID!)
-- ============================================================================
\echo '🚗 Phase 2: Creating universal vehicle types...'

INSERT INTO vehicle_types (id, name, brand, model, fuel_consumption_per_100km, tank_capacity, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Honda Civic', 'Honda', 'Civic', 6.5, 50, NOW()),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mercedes Sprinter Van', 'Mercedes-Benz', 'Sprinter', 9.8, 75, NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 2 universal vehicle types'
\echo ''

-- ============================================================================
-- PHASE 3: USERS
-- ============================================================================
\echo '👥 Phase 3: Creating test users...'

-- Пользователи для Test Company Alpha
-- ВАЖНО: Пароли будут установлены через Supabase Auth отдельно
-- Здесь создаем только записи в таблице users

-- Owner/Super Admin (organization_id = NULL для доступа ко всем org)
INSERT INTO users (id, email, first_name, last_name, role, organization_id, created_at) VALUES
('owner111-1111-1111-1111-111111111111', 'owner@test.com', 'Super', 'Admin', 'owner', NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- Alpha organization users
INSERT INTO users (id, email, first_name, last_name, role, organization_id, phone, created_at) VALUES
('admin111-1111-1111-1111-111111111111', 'admin.alpha@test.com', 'Admin', 'Alpha', 'admin', '11111111-1111-1111-1111-111111111111', '+49 123 1000001', NOW()),
('mngr1111-1111-1111-1111-111111111111', 'manager.alpha@test.com', 'Manager', 'Alpha', 'manager', '11111111-1111-1111-1111-111111111111', '+49 123 1000002', NOW()),
('drvr1111-1111-1111-1111-111111111111', 'driver1.alpha@test.com', 'Ivan', 'Petrov', 'driver', '11111111-1111-1111-1111-111111111111', '+49 123 1000003', NOW()),
('drvr2111-1111-1111-1111-111111111111', 'driver2.alpha@test.com', 'Maria', 'Schmidt', 'driver', '11111111-1111-1111-1111-111111111111', '+49 123 1000004', NOW())
ON CONFLICT (id) DO NOTHING;

-- Beta organization users
INSERT INTO users (id, email, first_name, last_name, role, organization_id, phone, created_at) VALUES
('admin222-2222-2222-2222-222222222222', 'admin.beta@test.com', 'Admin', 'Beta', 'admin', '22222222-2222-2222-2222-222222222222', '+49 123 2000001', NOW()),
('mngr2222-2222-2222-2222-222222222222', 'manager.beta@test.com', 'Manager', 'Beta', 'manager', '22222222-2222-2222-2222-222222222222', '+49 123 2000002', NOW()),
('drvr1222-2222-2222-2222-222222222222', 'driver1.beta@test.com', 'Hans', 'Müller', 'driver', '22222222-2222-2222-2222-222222222222', '+49 123 2000003', NOW()),
('drvr2222-2222-2222-2222-222222222222', 'driver2.beta@test.com', 'Anna', 'Weber', 'driver', '22222222-2222-2222-2222-222222222222', '+49 123 2000004', NOW())
ON CONFLICT (id) DO NOTHING;

-- Set fuel card IDs for drivers
UPDATE users SET fuel_card_id = 'CARD-ALPHA-DRV1' WHERE id = 'drvr1111-1111-1111-1111-111111111111';
UPDATE users SET fuel_card_id = 'CARD-ALPHA-DRV2' WHERE id = 'drvr2111-1111-1111-1111-111111111111';
UPDATE users SET fuel_card_id = 'CARD-BETA-DRV1' WHERE id = 'drvr1222-2222-2222-2222-222222222222';
UPDATE users SET fuel_card_id = 'CARD-BETA-DRV2' WHERE id = 'drvr2222-2222-2222-2222-222222222222';

\echo '  ✅ Created 9 users (1 owner + 4 per organization)'
\echo ''

-- ============================================================================
-- PHASE 4: TEAMS
-- ============================================================================
\echo '👥 Phase 4: Creating teams...'

INSERT INTO teams (id, name, description, organization_id, created_at) VALUES
('team1111-1111-1111-1111-111111111111', 'Construction Team A', 'Основная строительная бригада', '11111111-1111-1111-1111-111111111111', NOW()),
('team2111-1111-1111-1111-111111111111', 'Delivery Team A', 'Команда доставки', '11111111-1111-1111-1111-111111111111', NOW()),
('team1222-2222-2222-2222-222222222222', 'Construction Team B', 'Строительная бригада Beta', '22222222-2222-2222-2222-222222222222', NOW()),
('team2222-2222-2222-2222-222222222222', 'Delivery Team B', 'Команда доставки Beta', '22222222-2222-2222-2222-222222222222', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add team members
INSERT INTO team_members (id, team_id, user_id, created_at) VALUES
('tmbr1111-1111-1111-1111-111111111111', 'team1111-1111-1111-1111-111111111111', 'drvr1111-1111-1111-1111-111111111111', NOW()),
('tmbr2111-1111-1111-1111-111111111111', 'team2111-1111-1111-1111-111111111111', 'drvr2111-1111-1111-1111-111111111111', NOW()),
('tmbr1222-2222-2222-2222-222222222222', 'team1222-2222-2222-2222-222222222222', 'drvr1222-2222-2222-2222-222222222222', NOW()),
('tmbr2222-2222-2222-2222-222222222222', 'team2222-2222-2222-2222-222222222222', 'drvr2222-2222-2222-2222-222222222222', NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 4 teams with members'
\echo ''

-- ============================================================================
-- PHASE 5: VEHICLES
-- ============================================================================
\echo '🚙 Phase 5: Creating vehicles...'

-- Alpha: 2 regular + 2 rental
INSERT INTO vehicles (id, name, license_plate, vin, model, year, status, is_rental,
                      rental_start_date, rental_end_date, rental_monthly_price,
                      organization_id, vehicle_type_id, created_at) VALUES
-- Regular vehicles
('veh11111-1111-1111-1111-111111111111', 'Civic Work Car 1', 'B-TC-1234', '1HGBH41JXMN109186',
 'Honda Civic 2020', 2020, 'active', false, NULL, NULL, NULL,
 '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW()),

('veh21111-1111-1111-1111-111111111111', 'Sprinter Van 1', 'B-TC-5678', 'WD3PE7CC7B5500001',
 'Mercedes Sprinter 2021', 2021, 'active', false, NULL, NULL, NULL,
 '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),

-- Rental vehicles (одна истекает через 14 дней!)
('veh31111-1111-1111-1111-111111111111', 'Rental Civic Fleet 1', 'B-RN-1111', '1HGBH41JXMN109999',
 'Honda Civic 2022', 2022, 'rented', true, '2025-01-01', (CURRENT_DATE + INTERVAL '14 days')::date, 450.00,
 '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW()),

('veh41111-1111-1111-1111-111111111111', 'Rental Sprinter 1', 'B-RN-2222', 'WD3PE7CC7B5599999',
 'Mercedes Sprinter 2022', 2022, 'rented', true, '2024-12-01', '2025-02-28', 750.00,
 '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),

-- Beta: 2 regular + 2 rental
('veh12222-2222-2222-2222-222222222222', 'Civic Work Car 2', 'B-TB-3456', '1HGBH41JXMN209186',
 'Honda Civic 2020', 2020, 'active', false, NULL, NULL, NULL,
 '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW()),

('veh22222-2222-2222-2222-222222222222', 'Sprinter Van 2', 'B-TB-7890', 'WD3PE7CC7B5600001',
 'Mercedes Sprinter 2021', 2021, 'active', false, NULL, NULL, NULL,
 '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),

('veh32222-2222-2222-2222-222222222222', 'Rental Civic Fleet 2', 'B-RB-3333', '1HGBH41JXMN209999',
 'Honda Civic 2022', 2022, 'rented', true, '2025-01-01', '2025-03-31', 460.00,
 '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW()),

('veh42222-2222-2222-2222-222222222222', 'Rental Sprinter 2', 'B-RB-4444', 'WD3PE7CC7B5699999',
 'Mercedes Sprinter 2022', 2022, 'rented', true, '2024-12-01', '2025-02-28', 780.00,
 '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 8 vehicles (4 per org: 2 regular + 2 rental)'
\echo ''

-- ============================================================================
-- PHASE 6: VEHICLE ASSIGNMENTS
-- ============================================================================
\echo '🔗 Phase 6: Creating vehicle assignments...'

INSERT INTO vehicle_assignments (id, vehicle_id, team_id, start_date, end_date, organization_id, created_at) VALUES
-- Alpha assignments (current)
('asgn1111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111', 'team1111-1111-1111-1111-111111111111',
 '2025-01-01', NULL, '11111111-1111-1111-1111-111111111111', NOW()),
('asgn2111-1111-1111-1111-111111111111', 'veh21111-1111-1111-1111-111111111111', 'team2111-1111-1111-1111-111111111111',
 '2025-01-01', NULL, '11111111-1111-1111-1111-111111111111', NOW()),

-- Beta assignments (current)
('asgn1222-2222-2222-2222-222222222222', 'veh12222-2222-2222-2222-222222222222', 'team1222-2222-2222-2222-222222222222',
 '2025-01-01', NULL, '22222222-2222-2222-2222-222222222222', NOW()),
('asgn2222-2222-2222-2222-222222222222', 'veh22222-2222-2222-2222-222222222222', 'team2222-2222-2222-2222-222222222222',
 '2025-01-01', NULL, '22222222-2222-2222-2222-222222222222', NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 4 vehicle assignments'
\echo ''

-- ============================================================================
-- PHASE 7: FUEL LIMITS
-- ============================================================================
\echo '⛽ Phase 7: Creating fuel limits...'

INSERT INTO fuel_limits (id, organization_id, fuel_card_id, daily_limit, weekly_limit, monthly_limit, created_at) VALUES
-- Alpha limits
('limt1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NULL, 100.00, 500.00, 2000.00, NOW()),
('limt2111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'CARD-ALPHA-DRV1', 80.00, 400.00, 1500.00, NOW()),

-- Beta limits
('limt1222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', NULL, 100.00, 500.00, 2000.00, NOW()),
('limt2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'CARD-BETA-DRV1', 80.00, 400.00, 1500.00, NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 4 fuel limits'
\echo ''

-- ============================================================================
-- PHASE 8: CAR EXPENSES - FUEL (WITH ANOMALIES!)
-- ============================================================================
\echo '⛽ Phase 8: Creating fuel expenses with ANOMALIES...'

-- Alpha Driver 1 (Ivan) - Civic (6.5 л/100км)
-- Заправка 1: Базовая (одометр 10000)
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description,
                         created_by_user_id, fuel_card_id,
                         liters, price_per_liter, odometer_reading,
                         previous_odometer_reading, distance_traveled,
                         expected_consumption, actual_consumption, consumption_difference,
                         has_anomaly, created_at) VALUES
('fuel1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'fuel', 40.00, CURRENT_DATE - INTERVAL '5 days', 'Первая заправка - базовая',
 'drvr1111-1111-1111-1111-111111111111', 'CARD-ALPHA-DRV1',
 28.5, 1.40, 10000, NULL, NULL, NULL, NULL, NULL, false, NOW());

-- Заправка 2: Нормальная (одометр 10350, проехали 350км)
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description,
                         created_by_user_id, fuel_card_id,
                         liters, price_per_liter, odometer_reading,
                         previous_odometer_reading, distance_traveled,
                         expected_consumption, actual_consumption, consumption_difference,
                         has_anomaly, created_at) VALUES
('fuel2111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'fuel', 30.00, CURRENT_DATE - INTERVAL '4 days', 'Вторая заправка - нормальный расход',
 'drvr1111-1111-1111-1111-111111111111', 'CARD-ALPHA-DRV1',
 21.0, 1.43, 10350,
 10000, 350,
 22.75, 21.0, -1.75,
 false, NOW());

-- Заправка 3: АНОМАЛИЯ! (одометр 10750, проехали 400км, заправили 50л вместо 26л)
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description,
                         created_by_user_id, fuel_card_id,
                         liters, price_per_liter, odometer_reading,
                         previous_odometer_reading, distance_traveled,
                         expected_consumption, actual_consumption, consumption_difference,
                         has_anomaly, created_at) VALUES
('fuel3111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'fuel', 70.00, CURRENT_DATE - INTERVAL '3 days', 'ТЕСТ АНОМАЛИИ - большой перерасход',
 'drvr1111-1111-1111-1111-111111111111', 'CARD-ALPHA-DRV1',
 50.0, 1.40, 10750,
 10350, 400,
 26.0, 50.0, 24.0,
 true, NOW());

-- Заправка 4: Еще аномалия! (одометр 11150, проехали 400км, заправили 42л)
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description,
                         created_by_user_id, fuel_card_id,
                         liters, price_per_liter, odometer_reading,
                         previous_odometer_reading, distance_traveled,
                         expected_consumption, actual_consumption, consumption_difference,
                         has_anomaly, created_at) VALUES
('fuel4111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'fuel', 60.00, CURRENT_DATE - INTERVAL '2 days', 'Вторая аномалия подряд',
 'drvr1111-1111-1111-1111-111111111111', 'CARD-ALPHA-DRV1',
 42.0, 1.43, 11150,
 10750, 400,
 26.0, 42.0, 16.0,
 true, NOW());

-- Alpha Driver 2 (Maria) - Sprinter (9.8 л/100км) - для теста лимитов
-- Заправка 1 утром (70 EUR)
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description,
                         created_by_user_id, fuel_card_id,
                         liters, price_per_liter, odometer_reading,
                         previous_odometer_reading, distance_traveled,
                         expected_consumption, actual_consumption, consumption_difference,
                         has_anomaly, created_at) VALUES
('fuel5111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh21111-1111-1111-1111-111111111111',
 'fuel', 70.00, CURRENT_DATE, 'Утренняя заправка',
 'drvr2111-1111-1111-1111-111111111111', 'CARD-ALPHA-DRV2',
 50.0, 1.40, 5000, NULL, NULL, NULL, NULL, NULL, false, NOW());

-- Заправка 2 вечером (40 EUR) - ПРЕВЫШЕНИЕ ЛИМИТА 80 EUR!
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description,
                         created_by_user_id, fuel_card_id,
                         liters, price_per_liter, odometer_reading,
                         previous_odometer_reading, distance_traveled,
                         expected_consumption, actual_consumption, consumption_difference,
                         has_anomaly, created_at) VALUES
('fuel6111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh21111-1111-1111-1111-111111111111',
 'fuel', 40.00, CURRENT_DATE, 'Вечерняя заправка - ПРЕВЫШЕНИЕ ЛИМИТА!',
 'drvr2111-1111-1111-1111-111111111111', 'CARD-ALPHA-DRV2',
 28.0, 1.43, 5350, 5000, 350, 34.3, 28.0, -6.3, false, NOW());

-- Beta - normal fuel expenses
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description,
                         created_by_user_id, fuel_card_id,
                         liters, price_per_liter, odometer_reading, has_anomaly, created_at) VALUES
('fuel1222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh12222-2222-2222-2222-222222222222',
 'fuel', 35.00, CURRENT_DATE - INTERVAL '3 days', 'Заправка Beta',
 'drvr1222-2222-2222-2222-222222222222', 'CARD-BETA-DRV1',
 25.0, 1.40, 8000, false, NOW()),
('fuel2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh22222-2222-2222-2222-222222222222',
 'fuel', 65.00, CURRENT_DATE - INTERVAL '2 days', 'Заправка Sprinter Beta',
 'drvr2222-2222-2222-2222-222222222222', 'CARD-BETA-DRV2',
 46.0, 1.41, 3000, false, NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 8 fuel expenses (including 2 ANOMALIES!)'
\echo ''

-- ============================================================================
-- PHASE 9: CAR EXPENSES - OTHER CATEGORIES
-- ============================================================================
\echo '💰 Phase 9: Creating other car expenses...'

-- Repairs
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description, created_at) VALUES
('expr1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'repair', 350.00, CURRENT_DATE - INTERVAL '10 days', 'Замена тормозных колодок', NOW()),
('expr2111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh21111-1111-1111-1111-111111111111',
 'repair', 780.00, CURRENT_DATE - INTERVAL '9 days', 'Ремонт двигателя', NOW()),
('expr1222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh12222-2222-2222-2222-222222222222',
 'repair', 420.00, CURRENT_DATE - INTERVAL '8 days', 'Ремонт подвески', NOW()),
('expr2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh22222-2222-2222-2222-222222222222',
 'repair', 890.00, CURRENT_DATE - INTERVAL '7 days', 'Замена трансмиссии', NOW());

-- Insurance
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description, created_at) VALUES
('expi1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'insurance', 120.00, DATE_TRUNC('month', CURRENT_DATE), 'Ежемесячная страховка январь', NOW()),
('expi2111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh21111-1111-1111-1111-111111111111',
 'insurance', 180.00, DATE_TRUNC('month', CURRENT_DATE), 'Страховка Sprinter январь', NOW()),
('expi1222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh12222-2222-2222-2222-222222222222',
 'insurance', 125.00, DATE_TRUNC('month', CURRENT_DATE), 'Страховка Beta январь', NOW()),
('expi2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh22222-2222-2222-2222-222222222222',
 'insurance', 185.00, DATE_TRUNC('month', CURRENT_DATE), 'Страховка Sprinter Beta январь', NOW());

-- Rental payments (for rental vehicles)
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description, created_at) VALUES
('expr1311-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh31111-1111-1111-1111-111111111111',
 'rental', 450.00, DATE_TRUNC('month', CURRENT_DATE), 'Ежемесячный платеж аренды январь', NOW()),
('expr1411-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh41111-1111-1111-1111-111111111111',
 'rental', 750.00, DATE_TRUNC('month', CURRENT_DATE), 'Аренда Sprinter январь', NOW()),
('expr1322-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh32222-2222-2222-2222-222222222222',
 'rental', 460.00, DATE_TRUNC('month', CURRENT_DATE), 'Аренда Civic Beta январь', NOW()),
('expr1422-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh42222-2222-2222-2222-222222222222',
 'rental', 780.00, DATE_TRUNC('month', CURRENT_DATE), 'Аренда Sprinter Beta январь', NOW());

-- Parking
INSERT INTO car_expenses (id, organization_id, vehicle_id, category, amount, date, description, created_at) VALUES
('expp1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'parking', 15.00, CURRENT_DATE - INTERVAL '5 days', 'Парковка в центре', NOW()),
('expp2111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh21111-1111-1111-1111-111111111111',
 'parking', 20.00, CURRENT_DATE - INTERVAL '4 days', 'Парковка на стройке', NOW());

\echo '  ✅ Created 16 car expenses (repairs, insurance, rental, parking)'
\echo ''

-- ============================================================================
-- PHASE 10: MAINTENANCE
-- ============================================================================
\echo '🔧 Phase 10: Creating maintenance records...'

INSERT INTO maintenances (id, organization_id, vehicle_id, type, date, description, created_at) VALUES
('mnt11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'routine', CURRENT_DATE - INTERVAL '12 days', 'Плановое ТО 10000км - замена масла, фильтров', NOW()),
('mnt21111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'veh21111-1111-1111-1111-111111111111',
 'inspection', CURRENT_DATE - INTERVAL '11 days', 'Технический осмотр перед дальней поездкой', NOW()),
('mnt12222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh12222-2222-2222-2222-222222222222',
 'routine', CURRENT_DATE - INTERVAL '10 days', 'ТО Beta Civic', NOW()),
('mnt22222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'veh22222-2222-2222-2222-222222222222',
 'repair', CURRENT_DATE - INTERVAL '9 days', 'Ремонт коробки передач', NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 4 maintenance records'
\echo ''

-- ============================================================================
-- PHASE 11: PENALTIES
-- ============================================================================
\echo '🚧 Phase 11: Creating penalties...'

-- Open penalties
INSERT INTO penalties (id, organization_id, vehicle_id, driver_id, amount, date, description,
                      status, created_at) VALUES
('pnlt1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
 'veh11111-1111-1111-1111-111111111111', 'drvr1111-1111-1111-1111-111111111111',
 50.00, CURRENT_DATE - INTERVAL '10 days', 'Превышение скорости 20км/ч', 'open', NOW()),
('pnlt2111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
 'veh21111-1111-1111-1111-111111111111', 'drvr2111-1111-1111-1111-111111111111',
 30.00, CURRENT_DATE - INTERVAL '8 days', 'Парковка в неположенном месте', 'open', NOW()),
('pnlt1222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
 'veh12222-2222-2222-2222-222222222222', 'drvr1222-2222-2222-2222-222222222222',
 45.00, CURRENT_DATE - INTERVAL '7 days', 'Проезд на красный свет', 'open', NOW()),
('pnlt2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
 'veh22222-2222-2222-2222-222222222222', 'drvr2222-2222-2222-2222-222222222222',
 35.00, CURRENT_DATE - INTERVAL '6 days', 'Неправильная парковка', 'open', NOW());

-- Paid penalties
INSERT INTO penalties (id, organization_id, vehicle_id, driver_id, amount, date, description,
                      status, paid_at, created_at) VALUES
('pnlt3111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
 'veh11111-1111-1111-1111-111111111111', 'drvr1111-1111-1111-1111-111111111111',
 25.00, CURRENT_DATE - INTERVAL '30 days', 'Проезд на красный', 'paid',
 CURRENT_DATE - INTERVAL '22 days', NOW()),
('pnlt4111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
 'veh21111-1111-1111-1111-111111111111', 'drvr2111-1111-1111-1111-111111111111',
 40.00, CURRENT_DATE - INTERVAL '25 days', 'Превышение скорости', 'paid',
 CURRENT_DATE - INTERVAL '15 days', NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 6 penalties (4 open + 2 paid)'
\echo ''

-- ============================================================================
-- PHASE 12: DOCUMENTS
-- ============================================================================
\echo '📄 Phase 12: Creating documents...'

-- Vehicle documents (с истекающими сроками!)
INSERT INTO vehicle_documents (id, vehicle_id, document_type, title,
                               issue_date, expiry_date, is_active, created_at) VALUES
-- Alpha vehicles - Истекающие документы!
('doc11111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'insurance', 'Comprehensive Insurance Policy',
 CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '19 days', true, NOW()),

('doc21111-1111-1111-1111-111111111111', 'veh11111-1111-1111-1111-111111111111',
 'registration', 'Vehicle Registration Certificate',
 CURRENT_DATE - INTERVAL '2 years', CURRENT_DATE - INTERVAL '4 days', true, NOW()), -- ПРОСРОЧЕН!

('doc31111-1111-1111-1111-111111111111', 'veh21111-1111-1111-1111-111111111111',
 'inspection', 'Technical Inspection Certificate',
 CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', true, NOW()),

('doc41111-1111-1111-1111-111111111111', 'veh31111-1111-1111-1111-111111111111',
 'lease', 'Rental Agreement Civic',
 '2025-01-01', CURRENT_DATE + INTERVAL '14 days', true, NOW()), -- Совпадает с окончанием аренды

-- Beta vehicles
('doc12222-2222-2222-2222-222222222222', 'veh12222-2222-2222-2222-222222222222',
 'insurance', 'Insurance Beta Civic',
 CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE + INTERVAL '11 months', true, NOW()),

('doc22222-2222-2222-2222-222222222222', 'veh22222-2222-2222-2222-222222222222',
 'inspection', 'Technical Inspection Sprinter Beta',
 CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- User documents
INSERT INTO user_documents (id, user_id, document_type, document_number,
                           issue_date, expiry_date, created_at) VALUES
('usrdoc11-1111-1111-1111-111111111111', 'drvr1111-1111-1111-1111-111111111111',
 'driver_license', 'DL-123456789',
 '2020-05-10', '2030-05-10', NOW()),
('usrdoc21-1111-1111-1111-111111111111', 'drvr2111-1111-1111-1111-111111111111',
 'medical_certificate', 'MC-987654321',
 CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '11 months', NOW()),
('usrdoc12-2222-2222-2222-222222222222', 'drvr1222-2222-2222-2222-222222222222',
 'driver_license', 'DL-223344556',
 '2019-03-15', '2029-03-15', NOW()),
('usrdoc22-2222-2222-2222-222222222222', 'drvr2222-2222-2222-2222-222222222222',
 'driver_license', 'DL-334455667',
 '2021-07-20', '2031-07-20', NOW())
ON CONFLICT (id) DO NOTHING;

\echo '  ✅ Created 10 documents (6 vehicle + 4 user)'
\echo '  ⚠️  Note: 2 documents are expiring soon!'
\echo ''

-- ============================================================================
-- VERIFICATION & SUMMARY
-- ============================================================================
\echo '✅ TEST DATA GENERATION COMPLETED!'
\echo ''
\echo '📊 Summary:'
\echo '  ✅ 2 organizations'
\echo '  ✅ 2 universal vehicle types'
\echo '  ✅ 9 users (1 owner + 4 per org)'
\echo '  ✅ 4 teams with members'
\echo '  ✅ 8 vehicles (4 per org: 2 regular + 2 rental)'
\echo '  ✅ 4 vehicle assignments'
\echo '  ✅ 4 fuel limits'
\echo '  ✅ 8 fuel expenses (with 2 ANOMALIES!)'
\echo '  ✅ 16 other car expenses (repair, insurance, rental, parking)'
\echo '  ✅ 4 maintenance records'
\echo '  ✅ 6 penalties (4 open + 2 paid)'
\echo '  ✅ 10 documents (2 expiring)'
\echo ''
\echo '🔥 Critical Test Scenarios Ready:'
\echo '  ⚠️  FUEL ANOMALIES: 2 anomalies ready for testing'
\echo '  ⚠️  FUEL LIMITS: Daily limit exceeded scenario created'
\echo '  ⚠️  RENTAL EXPIRY: 1 contract expiring in 14 days'
\echo '  ⚠️  DOCUMENT EXPIRY: 2 documents expiring/expired'
\echo ''
\echo '🎯 Next Steps:'
\echo '  1. Login as admin.alpha@test.com or admin.beta@test.com'
\echo '  2. Check dashboard for anomaly alerts'
\echo '  3. View rental analytics widget'
\echo '  4. Test RLS by switching organizations'
\echo '  5. Test role permissions with different users'
\echo ''
\echo '🚀 Happy Testing!'
