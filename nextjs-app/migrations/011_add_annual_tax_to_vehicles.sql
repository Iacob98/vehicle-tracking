-- Migration 011: Add Annual Tax Tracking to Vehicles
-- Description: Adds optional fields for automatic annual tax expense creation
-- Date: 2025-11-06

BEGIN;

-- Add annual tax fields to vehicles table
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS annual_tax_amount DECIMAL(10,2)
    CHECK (annual_tax_amount IS NULL OR annual_tax_amount > 0),
  ADD COLUMN IF NOT EXISTS tax_due_date DATE,
  ADD COLUMN IF NOT EXISTS last_tax_created_date DATE;

-- Add index for efficient querying of vehicles with pending taxes
-- This index helps the cron job quickly find vehicles that need tax expenses created
CREATE INDEX IF NOT EXISTS idx_vehicles_tax_due
  ON vehicles(organization_id, tax_due_date)
  WHERE annual_tax_amount IS NOT NULL AND tax_due_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN vehicles.annual_tax_amount IS 'Annual vehicle tax amount in EUR. When set, automatic tax expenses will be created each year.';
COMMENT ON COLUMN vehicles.tax_due_date IS 'Date when annual tax is due. System will create expense records on or after this date.';
COMMENT ON COLUMN vehicles.last_tax_created_date IS 'Last date when automatic tax expense was created. Used to prevent duplicate entries.';

COMMIT;
