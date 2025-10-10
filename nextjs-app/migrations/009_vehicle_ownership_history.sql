-- Migration 009: Vehicle Ownership History
-- Date: 2025-10-10
-- Purpose: Добавить историю владения транспортом

BEGIN;

-- 1. Создать enum для типа владельца
CREATE TYPE owner_type AS ENUM (
  'individual',    -- Физическое лицо
  'company',       -- Юридическое лицо
  'organization'   -- Организация (текущая)
);

COMMENT ON TYPE owner_type IS 'Тип владельца транспортного средства';

-- 2. Создать таблицу истории владения
CREATE TABLE vehicle_ownership_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Информация о владельце
  owner_name varchar(255) NOT NULL,
  owner_type owner_type NOT NULL DEFAULT 'individual',
  owner_contact varchar(100),  -- Телефон или email владельца
  owner_address text,           -- Адрес владельца

  -- Период владения
  start_date date NOT NULL,
  end_date date,  -- NULL = текущий владелец

  -- Финансовая информация
  purchase_price numeric(12,2),  -- Цена покупки
  sale_price numeric(12,2),      -- Цена продажи (если уже продано)

  -- Дополнительная информация
  document_number varchar(100),  -- Номер договора купли-продажи
  notes text,

  -- Метаданные
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_ownership_dates CHECK (
    end_date IS NULL OR end_date >= start_date
  ),
  CONSTRAINT valid_purchase_price CHECK (
    purchase_price IS NULL OR purchase_price >= 0
  ),
  CONSTRAINT valid_sale_price CHECK (
    sale_price IS NULL OR sale_price >= 0
  ),
  CONSTRAINT owner_name_not_empty CHECK (
    owner_name <> ''
  )
);

-- 3. Создать индексы
CREATE INDEX idx_ownership_vehicle ON vehicle_ownership_history(vehicle_id);
CREATE INDEX idx_ownership_organization ON vehicle_ownership_history(organization_id);
CREATE INDEX idx_ownership_dates ON vehicle_ownership_history(start_date, end_date);
CREATE INDEX idx_ownership_current ON vehicle_ownership_history(vehicle_id) WHERE end_date IS NULL;

-- 4. Создать функцию для обновления updated_at
CREATE OR REPLACE FUNCTION update_vehicle_ownership_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Создать триггер
CREATE TRIGGER trigger_update_vehicle_ownership_updated_at
  BEFORE UPDATE ON vehicle_ownership_history
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_ownership_updated_at();

-- 6. Создать RLS политики
ALTER TABLE vehicle_ownership_history ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все пользователи организации могут читать)
CREATE POLICY "ownership_select_policy"
  ON vehicle_ownership_history
  FOR SELECT
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
  );

-- Политика для вставки (admin, manager могут добавлять)
CREATE POLICY "ownership_insert_policy"
  ON vehicle_ownership_history
  FOR INSERT
  WITH CHECK (
    organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
  );

-- Политика для обновления (admin, manager могут обновлять)
CREATE POLICY "ownership_update_policy"
  ON vehicle_ownership_history
  FOR UPDATE
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
  )
  WITH CHECK (
    organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
  );

-- Политика для удаления (только admin может удалять)
CREATE POLICY "ownership_delete_policy"
  ON vehicle_ownership_history
  FOR DELETE
  USING (
    organization_id::text = (auth.jwt() -> 'user_metadata' ->> 'organization_id')
  );

-- Bypass для service_role
CREATE POLICY "service_role_bypass_ownership"
  ON vehicle_ownership_history
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Добавить комментарии
COMMENT ON TABLE vehicle_ownership_history IS 'История владения транспортными средствами';
COMMENT ON COLUMN vehicle_ownership_history.owner_name IS 'ФИО или название владельца';
COMMENT ON COLUMN vehicle_ownership_history.owner_type IS 'Тип владельца: физлицо, юрлицо, организация';
COMMENT ON COLUMN vehicle_ownership_history.start_date IS 'Дата начала владения';
COMMENT ON COLUMN vehicle_ownership_history.end_date IS 'Дата окончания владения (NULL = текущий владелец)';
COMMENT ON COLUMN vehicle_ownership_history.purchase_price IS 'Цена покупки автомобиля';
COMMENT ON COLUMN vehicle_ownership_history.sale_price IS 'Цена продажи автомобиля';

COMMIT;

-- 8. Проверка
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicle_ownership_history'
ORDER BY ordinal_position;
