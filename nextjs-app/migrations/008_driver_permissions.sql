-- Миграция: Права доступа для водителей
-- 1. Добавление категории "fine" для штрафов
-- 2. Добавление полей в car_expenses для заправок и показаний одометра
-- 3. RLS политики для водителей (видят только свои автомобили)

BEGIN;

-- ============================================================================
-- 1. ДОБАВЛЕНИЕ КАТЕГОРИИ "FINE" (ШТРАФЫ)
-- ============================================================================

-- Добавляем новую категорию расходов для штрафов
ALTER TYPE car_expense_category ADD VALUE IF NOT EXISTS 'fine';

-- ============================================================================
-- 2. РАСШИРЕНИЕ ТАБЛИЦЫ CAR_EXPENSES
-- ============================================================================

-- Добавляем поля для детализации расходов
ALTER TABLE car_expenses
ADD COLUMN IF NOT EXISTS liters NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS odometer_reading INTEGER,
ADD COLUMN IF NOT EXISTS odometer_photo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Комментарии к полям
COMMENT ON COLUMN car_expenses.liters IS 'Количество залитого топлива (литры)';
COMMENT ON COLUMN car_expenses.odometer_reading IS 'Показания одометра на момент расхода (км)';
COMMENT ON COLUMN car_expenses.odometer_photo_url IS 'Фото показаний одометра';
COMMENT ON COLUMN car_expenses.created_by_user_id IS 'ID пользователя, создавшего запись (водитель)';

-- Индексы для оптимизации запросов водителей
CREATE INDEX IF NOT EXISTS idx_car_expenses_created_by_user
ON car_expenses(created_by_user_id) WHERE created_by_user_id IS NOT NULL;

-- ============================================================================
-- 3. RLS ПОЛИТИКИ ДЛЯ ВОДИТЕЛЕЙ
-- ============================================================================

-- Функция для получения роли текущего пользователя
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Функция для получения team_id текущего пользователя
CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Функция для проверки, назначен ли автомобиль на бригаду пользователя
CREATE OR REPLACE FUNCTION user_has_access_to_vehicle(vehicle_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM vehicle_assignments va
    WHERE va.vehicle_id = vehicle_uuid
      AND va.team_id = get_user_team_id()
      AND va.end_date IS NULL  -- Только активные назначения
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- RLS ДЛЯ VEHICLES: Водители видят только свои авто
-- ============================================================================

-- Удаляем старую политику для vehicles_all
DROP POLICY IF EXISTS "vehicles_all" ON vehicles;

-- Политика SELECT для vehicles: админы видят все, водители только свои
CREATE POLICY "vehicles_select_policy" ON vehicles
  FOR SELECT
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
    AND (
      -- Админы и менеджеры видят все авто в организации
      get_user_role() IN ('admin', 'manager')
      OR
      -- Водители видят только авто, назначенные их бригаде
      (get_user_role() = 'driver' AND user_has_access_to_vehicle(id))
    )
  );

-- Политики INSERT/UPDATE/DELETE для vehicles: только админы и менеджеры
CREATE POLICY "vehicles_insert_policy" ON vehicles
  FOR INSERT
  WITH CHECK (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
    AND get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "vehicles_update_policy" ON vehicles
  FOR UPDATE
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
    AND get_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
    AND get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "vehicles_delete_policy" ON vehicles
  FOR DELETE
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
    AND get_user_role() IN ('admin', 'manager')
  );

-- ============================================================================
-- RLS ДЛЯ CAR_EXPENSES: Водители могут добавлять расходы для своих авто
-- ============================================================================

-- Удаляем старую политику для car_expenses_all
DROP POLICY IF EXISTS "car_expenses_all" ON car_expenses;

-- Политика SELECT для car_expenses
CREATE POLICY "car_expenses_select_policy" ON car_expenses
  FOR SELECT
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
    AND (
      -- Админы и менеджеры видят все расходы
      get_user_role() IN ('admin', 'manager')
      OR
      -- Водители видят только расходы по своим авто
      (get_user_role() = 'driver' AND user_has_access_to_vehicle(vehicle_id))
    )
  );

-- Политика INSERT для car_expenses: водители могут добавлять только для своих авто
CREATE POLICY "car_expenses_insert_policy" ON car_expenses
  FOR INSERT
  WITH CHECK (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
    AND (
      -- Админы и менеджеры могут добавлять для любых авто
      get_user_role() IN ('admin', 'manager')
      OR
      -- Водители могут добавлять только для своих авто
      (get_user_role() = 'driver' AND user_has_access_to_vehicle(vehicle_id))
    )
  );

-- Политика UPDATE для car_expenses
CREATE POLICY "car_expenses_update_policy" ON car_expenses
  FOR UPDATE
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
    AND (
      -- Админы и менеджеры могут редактировать любые расходы
      get_user_role() IN ('admin', 'manager')
      OR
      -- Водители могут редактировать только свои расходы
      (get_user_role() = 'driver' AND created_by_user_id = auth.uid())
    )
  )
  WITH CHECK (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
  );

-- Политика DELETE для car_expenses: только админы
CREATE POLICY "car_expenses_delete_policy" ON car_expenses
  FOR DELETE
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata'::text) ->> 'organization_id'::text
    AND get_user_role() IN ('admin', 'manager')
  );

COMMIT;

-- ============================================================================
-- ПРОВЕРКА
-- ============================================================================

-- Проверим добавленные поля
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'car_expenses'
  AND column_name IN ('liters', 'odometer_reading', 'odometer_photo_url', 'created_by_user_id')
ORDER BY column_name;

-- Проверим политики для vehicles
SELECT
  policyname,
  cmd,
  CASE
    WHEN length(qual::text) > 50 THEN substring(qual::text, 1, 50) || '...'
    ELSE qual::text
  END as qual_preview
FROM pg_policies
WHERE tablename = 'vehicles' AND policyname NOT LIKE 'service_role%'
ORDER BY policyname;

-- Проверим политики для car_expenses
SELECT
  policyname,
  cmd,
  CASE
    WHEN length(qual::text) > 50 THEN substring(qual::text, 1, 50) || '...'
    ELSE qual::text
  END as qual_preview
FROM pg_policies
WHERE tablename = 'car_expenses' AND policyname NOT LIKE 'service_role%'
ORDER BY policyname;

-- Проверим новые категории расходов
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'car_expense_category'::regtype
ORDER BY enumsortorder;
