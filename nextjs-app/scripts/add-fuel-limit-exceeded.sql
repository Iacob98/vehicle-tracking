-- Add fuel limit for CARD-ALPHA-DRV2 to trigger exceeded scenario
DO $$
DECLARE
  org1_id uuid;
BEGIN
  SELECT id INTO org1_id FROM organizations WHERE name = 'Test Company Alpha';

  INSERT INTO fuel_limits (organization_id, fuel_card_id, daily_limit, weekly_limit, monthly_limit)
  VALUES (org1_id, 'CARD-ALPHA-DRV2', 80.00, 400.00, 1500.00);

  RAISE NOTICE 'Added fuel limit for CARD-ALPHA-DRV2 (80 EUR daily, but already spent 110 EUR today!)';
END $$;
