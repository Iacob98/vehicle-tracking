-- Migration: Add 'rental' category to car_expense_category enum
-- Description: Adds 'rental' category to support tracking monthly rental vehicle costs
-- Date: 2025-01-06

-- ============================================================================
-- ADD RENTAL CATEGORY TO ENUM
-- ============================================================================

-- Add 'rental' value to car_expense_category enum
-- This allows tracking monthly rental costs as a separate category
ALTER TYPE car_expense_category ADD VALUE IF NOT EXISTS 'rental';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  enum_values TEXT[];
BEGIN
  SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO enum_values
  FROM pg_enum
  WHERE enumtypid = 'car_expense_category'::regtype;

  IF NOT 'rental' = ANY(enum_values) THEN
    RAISE EXCEPTION 'rental category was not added to car_expense_category enum';
  END IF;

  RAISE NOTICE 'car_expense_category enum updated successfully. Values: %', enum_values;
END $$;
