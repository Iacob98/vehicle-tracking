-- Migration 013: Fuel Limits by Card
-- Изменение структуры fuel_limits - привязка лимитов к заправочной карте вместо организации

BEGIN;

-- 1. Удаляем старую уникальность по organization_id
ALTER TABLE fuel_limits DROP CONSTRAINT IF EXISTS fuel_limits_organization_id_key;

-- 2. Добавляем колонку fuel_card_id
ALTER TABLE fuel_limits ADD COLUMN IF NOT EXISTS fuel_card_id VARCHAR(50);

-- 3. Добавляем уникальность по fuel_card_id и organization_id (карта уникальна в рамках организации)
ALTER TABLE fuel_limits ADD CONSTRAINT fuel_limits_fuel_card_id_org_unique
  UNIQUE (fuel_card_id, organization_id);

-- 4. Создаем индекс для быстрого поиска по fuel_card_id
CREATE INDEX IF NOT EXISTS idx_fuel_limits_fuel_card_id ON fuel_limits(fuel_card_id);

-- 5. Обновляем RLS политики

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view their organization fuel limits" ON fuel_limits;
DROP POLICY IF EXISTS "Admin and manager can create fuel limits" ON fuel_limits;
DROP POLICY IF EXISTS "Admin and manager can update fuel limits" ON fuel_limits;
DROP POLICY IF EXISTS "Admin can delete fuel limits" ON fuel_limits;

-- Новая политика SELECT: пользователи видят лимиты своей карты или все лимиты своей организации
CREATE POLICY "Users can view fuel limits"
  ON fuel_limits
  FOR SELECT
  USING (
    organization_id IN (
      SELECT (raw_user_meta_data->>'organization_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );

-- Новая политика INSERT: только admin и manager могут создавать лимиты
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

-- Новая политика UPDATE: только admin и manager могут обновлять лимиты
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

-- Новая политика DELETE: только admin может удалять лимиты
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

-- 6. Обновляем комментарии
COMMENT ON TABLE fuel_limits IS 'Лимиты расхода топлива по заправочным картам';
COMMENT ON COLUMN fuel_limits.fuel_card_id IS 'Номер заправочной карты (NULL = общий лимит организации)';
COMMENT ON COLUMN fuel_limits.organization_id IS 'ID организации (для изоляции данных)';
COMMENT ON COLUMN fuel_limits.daily_limit IS 'Лимит расхода в день (в валюте организации)';
COMMENT ON COLUMN fuel_limits.weekly_limit IS 'Лимит расхода в неделю (в валюте организации)';
COMMENT ON COLUMN fuel_limits.monthly_limit IS 'Лимит расхода в месяц (в валюте организации)';

COMMIT;
