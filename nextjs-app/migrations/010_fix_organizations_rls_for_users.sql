-- Исправление RLS политик для organizations
-- Проблема: водители и другие роли не могут читать название своей организации
-- Решение: разрешить всем пользователям читать информацию о своей организации

-- Удаляем старую ограниченную политику
DROP POLICY IF EXISTS "organizations_select" ON organizations;

-- Создаём новую политику с расширенным доступом
-- Разрешаем:
-- 1. Super Admin - полный доступ
-- 2. Admin - доступ к своей организации
-- 3. ВСЕ пользователи - доступ на чтение своей организации
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT
  USING (
    is_super_admin()
    OR (get_user_role() = 'admin' AND id = get_user_organization_id())
    OR (id = get_user_organization_id())
  );

-- Проверка: водитель с organization_id должен видеть свою организацию
COMMENT ON POLICY "organizations_select" ON organizations IS
  'Все пользователи могут читать информацию о своей организации';
