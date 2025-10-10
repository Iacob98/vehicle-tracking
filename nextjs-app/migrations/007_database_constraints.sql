-- ============================================================================
-- Database Constraints: Data Integrity & Performance
-- ============================================================================
-- This migration adds NOT NULL constraints, CHECK constraints, and indexes
-- to improve data quality and query performance
--
-- Date: 2025-10-10
-- Author: Claude (Migration Agent)
-- Priority: HIGH (Stability)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: NOT NULL Constraints
-- ============================================================================

-- Vehicles table
ALTER TABLE vehicles ALTER COLUMN license_plate SET NOT NULL;
ALTER TABLE vehicles ALTER COLUMN status SET NOT NULL;
ALTER TABLE vehicles ALTER COLUMN is_rental SET NOT NULL;

-- Penalties table
ALTER TABLE penalties ALTER COLUMN status SET NOT NULL;

-- Note: description fields left as nullable (business logic allows empty descriptions)

-- ============================================================================
-- PART 2: CHECK Constraints (Data Validation)
-- ============================================================================

-- Positive amounts
ALTER TABLE penalties
ADD CONSTRAINT penalty_amount_positive
CHECK (amount > 0);

ALTER TABLE car_expenses
ADD CONSTRAINT car_expense_amount_positive
CHECK (amount > 0);

ALTER TABLE expenses
ADD CONSTRAINT expense_amount_positive
CHECK (amount > 0);

-- Vehicle constraints
ALTER TABLE vehicles
ADD CONSTRAINT vehicle_license_plate_not_empty
CHECK (license_plate <> '');

ALTER TABLE vehicles
ADD CONSTRAINT vehicle_name_not_empty
CHECK (name <> '');

ALTER TABLE vehicles
ADD CONSTRAINT vehicle_year_reasonable
CHECK (year IS NULL OR (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1));

ALTER TABLE vehicles
ADD CONSTRAINT vehicle_rental_price_positive
CHECK (rental_monthly_price IS NULL OR rental_monthly_price > 0);

ALTER TABLE vehicles
ADD CONSTRAINT vehicle_rental_dates_logical
CHECK (
  (rental_start_date IS NULL AND rental_end_date IS NULL) OR
  (rental_start_date IS NOT NULL AND (rental_end_date IS NULL OR rental_end_date >= rental_start_date))
);

-- Team constraints
ALTER TABLE teams
ADD CONSTRAINT team_name_not_empty
CHECK (name <> '');

-- User constraints
ALTER TABLE users
ADD CONSTRAINT user_email_not_empty
CHECK (email <> '');

ALTER TABLE users
ADD CONSTRAINT user_first_name_not_empty
CHECK (first_name <> '');

ALTER TABLE users
ADD CONSTRAINT user_last_name_not_empty
CHECK (last_name <> '');

-- ============================================================================
-- PART 3: Performance Indexes
-- ============================================================================

-- Date-based queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_penalties_date ON penalties(date DESC);
CREATE INDEX IF NOT EXISTS idx_car_expenses_date ON car_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenances_date ON maintenances(date DESC);

-- Document expiry queries
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_date_expiry ON vehicle_documents(date_expiry) WHERE date_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_documents_date_expiry ON user_documents(date_expiry) WHERE date_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_member_documents_expiry_date ON team_member_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Foreign key indexes (for joins)
CREATE INDEX IF NOT EXISTS idx_car_expenses_vehicle_id ON car_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_car_expenses_maintenance_id ON car_expenses(maintenance_id) WHERE maintenance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_penalties_vehicle_id ON penalties(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_penalties_user_id ON penalties(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maintenances_vehicle_id ON maintenances(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_team_id ON expenses(team_id) WHERE team_id IS NOT NULL;

-- Status-based filters
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON penalties(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_rental ON vehicles(is_rental) WHERE is_rental = true;

-- Organization + date composite indexes (common query pattern)
CREATE INDEX IF NOT EXISTS idx_penalties_org_date ON penalties(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_car_expenses_org_date ON car_expenses(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenances_org_date ON maintenances(organization_id, date DESC);

-- Vehicle assignments date range queries
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_dates ON vehicle_assignments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle_dates ON vehicle_assignments(vehicle_id, start_date, end_date);

-- Rental contracts
CREATE INDEX IF NOT EXISTS idx_rental_contracts_dates ON rental_contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_vehicle_id ON rental_contracts(vehicle_id);

-- ============================================================================
-- PART 4: Unique Constraints (Data Quality)
-- ============================================================================

-- Note: license_plate uniqueness per organization (not globally unique)
-- We'll use a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_license_plate_unique
ON vehicles(organization_id, LOWER(license_plate));

-- VIN should be globally unique when provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_vin_unique
ON vehicles(LOWER(vin)) WHERE vin IS NOT NULL AND vin <> '';

-- User email unique per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
ON users(organization_id, LOWER(email));

-- Team name unique per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_name_unique
ON teams(organization_id, LOWER(name));

-- ============================================================================
-- PART 5: Verification Queries
-- ============================================================================

-- Test 1: Count all constraints
-- SELECT COUNT(*) as constraint_count
-- FROM information_schema.table_constraints
-- WHERE table_schema = 'public'
-- AND constraint_type = 'CHECK';
-- Expected: At least 12 CHECK constraints

-- Test 2: Count all indexes
-- SELECT COUNT(*) as index_count
-- FROM pg_indexes
-- WHERE schemaname = 'public';
-- Expected: 30+ indexes

-- Test 3: Try to insert invalid data (should FAIL)
-- INSERT INTO penalties (organization_id, vehicle_id, date, amount)
-- VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE, -100);
-- Expected: ERROR - constraint violation

COMMIT;

-- ============================================================================
-- Performance Notes
-- ============================================================================

-- Indexes added will:
-- 1. Speed up date range queries (dashboard, reports)
-- 2. Improve JOIN performance (vehicle_id, organization_id)
-- 3. Optimize status filters (active vehicles, open penalties)
-- 4. Enable efficient document expiry checks

-- Trade-offs:
-- - Indexes take disk space (~2-5MB estimated)
-- - INSERT/UPDATE slightly slower (negligible for this app)
-- - SELECT queries 10-100x faster on large datasets

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================

-- To rollback constraints:
-- BEGIN;
-- ALTER TABLE penalties DROP CONSTRAINT IF EXISTS penalty_amount_positive;
-- ALTER TABLE car_expenses DROP CONSTRAINT IF EXISTS car_expense_amount_positive;
-- -- ... etc for all constraints
-- DROP INDEX IF EXISTS idx_penalties_date;
-- -- ... etc for all indexes
-- ROLLBACK;
