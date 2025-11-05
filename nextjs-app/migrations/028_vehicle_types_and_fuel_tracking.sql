-- Migration 028: Vehicle Types and Fuel Consumption Tracking
-- Description: Add vehicle types with fuel consumption rates and enhanced fuel tracking in car_expenses

-- =====================================================
-- 1. Create vehicle_types table
-- =====================================================
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  fuel_consumption_per_100km DECIMAL(5,2) NOT NULL CHECK (fuel_consumption_per_100km > 0),
  tank_capacity INTEGER CHECK (tank_capacity IS NULL OR tank_capacity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by organization
CREATE INDEX idx_vehicle_types_organization ON vehicle_types(organization_id);

-- Unique constraint: one type name per organization
CREATE UNIQUE INDEX idx_vehicle_types_name_unique ON vehicle_types(organization_id, LOWER(name));

COMMENT ON TABLE vehicle_types IS 'Vehicle types with expected fuel consumption rates';
COMMENT ON COLUMN vehicle_types.fuel_consumption_per_100km IS 'Expected fuel consumption in liters per 100 km';
COMMENT ON COLUMN vehicle_types.tank_capacity IS 'Tank capacity in liters (optional)';

-- =====================================================
-- 2. Add vehicle_type_id to vehicles table
-- =====================================================
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type_id);

COMMENT ON COLUMN vehicles.vehicle_type_id IS 'Reference to vehicle type for fuel consumption tracking';

-- =====================================================
-- 3. Enhance car_expenses table for fuel tracking
-- =====================================================

-- Add new columns for fuel tracking
ALTER TABLE car_expenses
  ADD COLUMN IF NOT EXISTS liters DECIMAL(10,2) CHECK (liters IS NULL OR liters > 0),
  ADD COLUMN IF NOT EXISTS price_per_liter DECIMAL(10,2) CHECK (price_per_liter IS NULL OR price_per_liter > 0),
  ADD COLUMN IF NOT EXISTS previous_odometer_reading INTEGER CHECK (previous_odometer_reading IS NULL OR previous_odometer_reading >= 0),
  ADD COLUMN IF NOT EXISTS distance_traveled INTEGER CHECK (distance_traveled IS NULL OR distance_traveled >= 0),
  ADD COLUMN IF NOT EXISTS expected_consumption DECIMAL(10,2) CHECK (expected_consumption IS NULL OR expected_consumption >= 0),
  ADD COLUMN IF NOT EXISTS actual_consumption DECIMAL(10,2) CHECK (actual_consumption IS NULL OR actual_consumption >= 0),
  ADD COLUMN IF NOT EXISTS consumption_difference DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS has_anomaly BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anomaly_checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS anomaly_checked_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN car_expenses.liters IS 'Fuel quantity in liters';
COMMENT ON COLUMN car_expenses.price_per_liter IS 'Price per liter calculated as amount/liters';
COMMENT ON COLUMN car_expenses.previous_odometer_reading IS 'Odometer reading from previous refuel';
COMMENT ON COLUMN car_expenses.distance_traveled IS 'Distance traveled since last refuel (km)';
COMMENT ON COLUMN car_expenses.expected_consumption IS 'Expected fuel consumption based on vehicle type (liters)';
COMMENT ON COLUMN car_expenses.actual_consumption IS 'Actual fuel added (same as liters)';
COMMENT ON COLUMN car_expenses.consumption_difference IS 'Difference between actual and expected (positive = anomaly)';
COMMENT ON COLUMN car_expenses.has_anomaly IS 'True if actual consumption exceeds expected by more than 15%';
COMMENT ON COLUMN car_expenses.anomaly_checked_by IS 'Admin who checked this anomaly';
COMMENT ON COLUMN car_expenses.anomaly_checked_at IS 'When the anomaly was checked';

-- Index for finding anomalies quickly
CREATE INDEX IF NOT EXISTS idx_car_expenses_anomaly
  ON car_expenses(organization_id, has_anomaly, date DESC)
  WHERE has_anomaly = TRUE AND anomaly_checked_at IS NULL;

-- Index for finding last refuel by vehicle
CREATE INDEX IF NOT EXISTS idx_car_expenses_vehicle_fuel_date
  ON car_expenses(vehicle_id, category, date DESC)
  WHERE category = 'fuel';

-- =====================================================
-- 4. RLS Policies for vehicle_types
-- =====================================================

-- Enable RLS
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;

-- Service role bypass
DROP POLICY IF EXISTS service_role_bypass_all_vehicle_types ON vehicle_types;
CREATE POLICY service_role_bypass_all_vehicle_types ON vehicle_types
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- SELECT: All authenticated users in the organization can see vehicle types
DROP POLICY IF EXISTS vehicle_types_select ON vehicle_types;
CREATE POLICY vehicle_types_select ON vehicle_types
  FOR SELECT
  USING (
    is_super_admin()
    OR organization_id = get_user_organization_id()
  );

-- INSERT: Only admin and manager can create vehicle types
DROP POLICY IF EXISTS vehicle_types_insert ON vehicle_types;
CREATE POLICY vehicle_types_insert ON vehicle_types
  FOR INSERT
  WITH CHECK (
    is_super_admin()
    OR (
      get_user_role() = ANY(ARRAY['admin'::text, 'manager'::text])
      AND organization_id = get_user_organization_id()
    )
  );

-- UPDATE: Only admin and manager can update vehicle types
DROP POLICY IF EXISTS vehicle_types_update ON vehicle_types;
CREATE POLICY vehicle_types_update ON vehicle_types
  FOR UPDATE
  USING (
    is_super_admin()
    OR (
      get_user_role() = ANY(ARRAY['admin'::text, 'manager'::text])
      AND organization_id = get_user_organization_id()
    )
  );

-- DELETE: Only admin can delete vehicle types
DROP POLICY IF EXISTS vehicle_types_delete ON vehicle_types;
CREATE POLICY vehicle_types_delete ON vehicle_types
  FOR DELETE
  USING (
    is_super_admin()
    OR (
      get_user_role() = 'admin'::text
      AND organization_id = get_user_organization_id()
    )
  );

-- =====================================================
-- 5. Function to get last odometer reading for a vehicle
-- =====================================================
CREATE OR REPLACE FUNCTION get_last_odometer_reading(vehicle_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  last_reading INTEGER;
BEGIN
  SELECT odometer_reading INTO last_reading
  FROM car_expenses
  WHERE vehicle_id = vehicle_uuid
    AND category = 'fuel'
    AND odometer_reading IS NOT NULL
  ORDER BY date DESC, created_at DESC
  LIMIT 1;

  RETURN COALESCE(last_reading, 0);
END;
$$;

COMMENT ON FUNCTION get_last_odometer_reading IS 'Returns the last odometer reading for a vehicle from fuel expenses';

-- =====================================================
-- 6. Trigger to update vehicle_types.updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_vehicle_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vehicle_types_updated_at ON vehicle_types;
CREATE TRIGGER trigger_vehicle_types_updated_at
  BEFORE UPDATE ON vehicle_types
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_types_updated_at();

-- =====================================================
-- 7. Grant permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_types TO authenticated;
GRANT SELECT ON vehicle_types TO anon;

-- =====================================================
-- Migration complete
-- =====================================================
