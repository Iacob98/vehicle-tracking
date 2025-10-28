-- Migration: Allow NULL organization_id for owner users
-- This allows owner (superadmin) to exist without being tied to a specific organization

BEGIN;

-- 1. Сделать organization_id nullable
ALTER TABLE users
ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Обновить RLS политики для users, чтобы owner мог видеть всех пользователей
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users
FOR SELECT
USING (
  -- Owner видит всех пользователей
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR
  -- Остальные видят только своей организации
  organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

-- 3. Обновить политику INSERT - owner может создавать пользователей для любой организации
DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users
FOR INSERT
WITH CHECK (
  -- Owner может создавать пользователей для любой организации
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR
  -- Admin может создавать пользователей только своей организации
  (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- 4. Обновить политику UPDATE - owner может обновлять любых пользователей
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
FOR UPDATE
USING (
  -- Owner может обновлять любых пользователей
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR
  -- Admin может обновлять пользователей своей организации
  (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
)
WITH CHECK (
  -- Owner может обновлять любых пользователей
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR
  -- Admin может обновлять пользователей только своей организации
  (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- 5. Обновить политику DELETE - owner может удалять любых пользователей
DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users
FOR DELETE
USING (
  -- Owner может удалять любых пользователей
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR
  -- Admin может удалять пользователей своей организации
  (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- 6. Добавить проверку: если роль owner, то organization_id должен быть NULL
ALTER TABLE users
ADD CONSTRAINT owner_no_org_check
CHECK (
  (role = 'owner' AND organization_id IS NULL)
  OR
  (role != 'owner' AND organization_id IS NOT NULL)
);

COMMIT;

-- Проверка
SELECT 'Migration 016 completed successfully' as status;
