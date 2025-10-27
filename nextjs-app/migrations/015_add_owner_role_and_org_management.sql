-- Migration 015: Add owner role and organization management
-- Добавление роли owner для управления несколькими организациями

BEGIN;

-- 1. Добавляем роль 'owner' в enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';

-- 2. Обновляем RLS политики для organizations
-- Удаляем старую политику
DROP POLICY IF EXISTS "org_select" ON organizations;

-- Создаём новую политику: owner видит все организации, остальные только свою
CREATE POLICY "org_select_policy"
ON organizations
FOR SELECT
USING (
  -- Owner видит все организации
  (
    SELECT raw_user_meta_data->>'role'
    FROM auth.users
    WHERE id = auth.uid()
  ) = 'owner'
  OR
  -- Остальные видят только свою организацию
  id::text = (
    SELECT raw_user_meta_data->>'organization_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);

-- Политика INSERT: только owner может создавать организации
CREATE POLICY "org_insert_policy"
ON organizations
FOR INSERT
WITH CHECK (
  (
    SELECT raw_user_meta_data->>'role'
    FROM auth.users
    WHERE id = auth.uid()
  ) = 'owner'
);

-- Политика UPDATE: owner может обновлять все, admin только свою
CREATE POLICY "org_update_policy"
ON organizations
FOR UPDATE
USING (
  (
    SELECT raw_user_meta_data->>'role'
    FROM auth.users
    WHERE id = auth.uid()
  ) = 'owner'
  OR
  (
    id::text = (
      SELECT raw_user_meta_data->>'organization_id'
      FROM auth.users
      WHERE id = auth.uid()
    )
    AND
    (
      SELECT raw_user_meta_data->>'role'
      FROM auth.users
      WHERE id = auth.uid()
    ) = 'admin'
  )
);

-- Политика DELETE: только owner может удалять организации
CREATE POLICY "org_delete_policy"
ON organizations
FOR DELETE
USING (
  (
    SELECT raw_user_meta_data->>'role'
    FROM auth.users
    WHERE id = auth.uid()
  ) = 'owner'
);

-- 3. Комментарии
COMMENT ON TYPE user_role IS 'Роли пользователей: owner (владелец всех организаций), admin, manager, driver, viewer';

COMMIT;
