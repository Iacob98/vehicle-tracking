-- Migration 007: Fuel Limits
-- Создание таблицы для лимитов расхода топлива по организациям

-- Создаем таблицу fuel_limits
CREATE TABLE IF NOT EXISTS fuel_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  daily_limit DECIMAL(10, 2) NOT NULL DEFAULT 400.00,
  weekly_limit DECIMAL(10, 2) NOT NULL DEFAULT 800.00,
  monthly_limit DECIMAL(10, 2) NOT NULL DEFAULT 1800.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Индекс для быстрого поиска по organization_id
CREATE INDEX IF NOT EXISTS idx_fuel_limits_organization ON fuel_limits(organization_id);

-- RLS политики для fuel_limits
ALTER TABLE fuel_limits ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: пользователи видят только лимиты своей организации
CREATE POLICY "Users can view their organization fuel limits"
  ON fuel_limits
  FOR SELECT
  USING (
    organization_id IN (
      SELECT (raw_user_meta_data->>'organization_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Политика INSERT: только admin и manager могут создавать лимиты
CREATE POLICY "Admin and manager can create fuel limits"
  ON fuel_limits
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT (raw_user_meta_data->>'organization_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Политика UPDATE: только admin и manager могут обновлять лимиты
CREATE POLICY "Admin and manager can update fuel limits"
  ON fuel_limits
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT (raw_user_meta_data->>'organization_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT (raw_user_meta_data->>'organization_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Политика DELETE: только admin может удалять лимиты
CREATE POLICY "Admin can delete fuel limits"
  ON fuel_limits
  FOR DELETE
  USING (
    organization_id IN (
      SELECT (raw_user_meta_data->>'organization_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Service role bypass (для использования в серверных функциях)
CREATE POLICY "service_role_bypass_fuel_limits" ON fuel_limits
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_fuel_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fuel_limits_updated_at_trigger
  BEFORE UPDATE ON fuel_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_limits_updated_at();

-- Вставляем дефолтные лимиты для существующей организации
INSERT INTO fuel_limits (organization_id, daily_limit, weekly_limit, monthly_limit)
SELECT id, 400.00, 800.00, 1800.00
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM fuel_limits WHERE fuel_limits.organization_id = organizations.id
);

-- Комментарии
COMMENT ON TABLE fuel_limits IS 'Лимиты расхода топлива по организациям';
COMMENT ON COLUMN fuel_limits.daily_limit IS 'Лимит расхода в день (в валюте организации)';
COMMENT ON COLUMN fuel_limits.weekly_limit IS 'Лимит расхода в неделю (в валюте организации)';
COMMENT ON COLUMN fuel_limits.monthly_limit IS 'Лимит расхода в месяц (в валюте организации)';
