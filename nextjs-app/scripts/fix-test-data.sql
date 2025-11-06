-- ============================================================================
-- FIX TEST DATA - Correct schema mismatches
-- ============================================================================

\echo '🔧 Fixing test data...'

-- Fix team_members (they should have first_name, last_name directly, not reference users)
DO $$
DECLARE
  org1_id uuid;
  org2_id uuid;
  team1_1_id uuid;
  team1_2_id uuid;
  team2_1_id uuid;
BEGIN
  -- Get org IDs
  SELECT id INTO org1_id FROM organizations WHERE name = 'Test Company Alpha';
  SELECT id INTO org2_id FROM organizations WHERE name = 'Test Company Beta';

  -- Get team IDs
  SELECT id INTO team1_1_id FROM teams WHERE name = 'Construction Team A' AND organization_id = org1_id;
  SELECT id INTO team1_2_id FROM teams WHERE name = 'Delivery Team A' AND organization_id = org1_id;
  SELECT id INTO team2_1_id FROM teams WHERE name = 'Construction Team B' AND organization_id = org2_id;

  -- Add team members with actual names
  INSERT INTO team_members (team_id, first_name, last_name, phone, organization_id) VALUES
  (team1_1_id, 'Иван', 'Петров', '+49-170-1234567', org1_id),
  (team1_2_id, 'Сергей', 'Иванов', '+49-170-2345678', org1_id),
  (team2_1_id, 'Михаил', 'Сидоров', '+49-170-3456789', org2_id);

  RAISE NOTICE 'Created team members';
END $$;

-- Fix vehicle_assignments (need team_id to exist)
DO $$
DECLARE
  org1_id uuid;
  org2_id uuid;
  team1_1_id uuid;
  team1_2_id uuid;
  team2_1_id uuid;
  veh1_1_id uuid;
  veh1_2_id uuid;
  veh2_1_id uuid;
BEGIN
  -- Get org IDs
  SELECT id INTO org1_id FROM organizations WHERE name = 'Test Company Alpha';
  SELECT id INTO org2_id FROM organizations WHERE name = 'Test Company Beta';

  -- Get team IDs
  SELECT id INTO team1_1_id FROM teams WHERE name = 'Construction Team A' AND organization_id = org1_id;
  SELECT id INTO team1_2_id FROM teams WHERE name = 'Delivery Team A' AND organization_id = org1_id;
  SELECT id INTO team2_1_id FROM teams WHERE name = 'Construction Team B' AND organization_id = org2_id;

  -- Get vehicle IDs (first 3 vehicles)
  SELECT id INTO veh1_1_id FROM vehicles WHERE organization_id = org1_id AND license_plate LIKE 'B-TA%' ORDER BY license_plate LIMIT 1;
  SELECT id INTO veh1_2_id FROM vehicles WHERE organization_id = org1_id AND license_plate LIKE 'B-TA%' ORDER BY license_plate LIMIT 1 OFFSET 1;
  SELECT id INTO veh2_1_id FROM vehicles WHERE organization_id = org2_id AND license_plate LIKE 'B-TB%' ORDER BY license_plate LIMIT 1;

  -- Create assignments
  INSERT INTO vehicle_assignments (vehicle_id, team_id, start_date, end_date, organization_id) VALUES
  (veh1_1_id, team1_1_id, '2025-01-01', NULL, org1_id),
  (veh1_2_id, team1_2_id, '2025-01-01', NULL, org1_id),
  (veh2_1_id, team2_1_id, '2025-01-01', NULL, org2_id);

  RAISE NOTICE 'Created vehicle assignments';
END $$;

-- Fix car_expenses with correct category (use 'other' instead of 'parking')
DO $$
DECLARE
  org1_id uuid;
  veh1_1_id uuid;
  veh1_2_id uuid;
BEGIN
  SELECT id INTO org1_id FROM organizations WHERE name = 'Test Company Alpha';
  SELECT id INTO veh1_1_id FROM vehicles WHERE organization_id = org1_id AND license_plate LIKE 'B-TA%' ORDER BY license_plate LIMIT 1;
  SELECT id INTO veh1_2_id FROM vehicles WHERE organization_id = org1_id AND license_plate LIKE 'B-TA%' ORDER BY license_plate LIMIT 1 OFFSET 1;

  INSERT INTO car_expenses (organization_id, vehicle_id, category, amount, date, description) VALUES
  (org1_id, veh1_1_id, 'other', 15.00, CURRENT_DATE - 5, 'Парковка в центре'),
  (org1_id, veh1_2_id, 'other', 20.00, CURRENT_DATE - 4, 'Парковка на стройке');

  RAISE NOTICE 'Created other expenses';
END $$;

-- Fix maintenances with correct type (use 'inspection' instead of 'routine')
DO $$
DECLARE
  org1_id uuid;
  veh1_1_id uuid;
  veh1_2_id uuid;
BEGIN
  SELECT id INTO org1_id FROM organizations WHERE name = 'Test Company Alpha';
  SELECT id INTO veh1_1_id FROM vehicles WHERE organization_id = org1_id AND license_plate LIKE 'B-TA%' ORDER BY license_plate LIMIT 1;
  SELECT id INTO veh1_2_id FROM vehicles WHERE organization_id = org1_id AND license_plate LIKE 'B-TA%' ORDER BY license_plate LIMIT 1 OFFSET 1;

  INSERT INTO maintenances (organization_id, vehicle_id, type, date, description) VALUES
  (org1_id, veh1_1_id, 'inspection', CURRENT_DATE - 12, 'Плановое ТО 10000км'),
  (org1_id, veh1_2_id, 'inspection', CURRENT_DATE - 11, 'Техосмотр перед дальней поездкой');

  RAISE NOTICE 'Created maintenances';
END $$;

-- Fix penalties (no paid_at column, just status)
DO $$
DECLARE
  org1_id uuid;
  veh1_1_id uuid;
  veh1_2_id uuid;
  drv1_1_id uuid;
  drv1_2_id uuid;
BEGIN
  SELECT id INTO org1_id FROM organizations WHERE name = 'Test Company Alpha';
  SELECT id INTO veh1_1_id FROM vehicles WHERE organization_id = org1_id AND license_plate LIKE 'B-TA%' ORDER BY license_plate LIMIT 1;
  SELECT id INTO veh1_2_id FROM vehicles WHERE organization_id = org1_id AND license_plate LIKE 'B-TA%' ORDER BY license_plate LIMIT 1 OFFSET 1;
  SELECT id INTO drv1_1_id FROM users WHERE email = 'testdriver1.alpha@example.com';
  SELECT id INTO drv1_2_id FROM users WHERE email = 'testdriver2.alpha@example.com';

  INSERT INTO penalties (organization_id, vehicle_id, user_id, amount, date, description, status) VALUES
  (org1_id, veh1_1_id, drv1_1_id, 25.00, CURRENT_DATE - 30, 'Проезд на красный', 'paid'),
  (org1_id, veh1_2_id, drv1_2_id, 40.00, CURRENT_DATE - 25, 'Превышение скорости', 'paid'),
  (org1_id, veh1_1_id, drv1_1_id, 30.00, CURRENT_DATE - 10, 'Неправильная парковка', 'open'),
  (org1_id, veh1_2_id, drv1_2_id, 50.00, CURRENT_DATE - 5, 'Превышение на 20км/ч', 'open');

  RAISE NOTICE 'Created penalties';
END $$;

\echo '✅ Test data fixes completed!'
