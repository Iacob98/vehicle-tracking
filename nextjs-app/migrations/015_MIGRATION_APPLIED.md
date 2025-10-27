# Migration 015: Owner Role - Applied Successfully

## Дата применения
2025-10-27 15:20 UTC

## Статус
✅ **УСПЕШНО ПРИМЕНЕНО**

## Что было сделано

### 1. Добавлена новая роль 'owner'
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
```

**Результат:**
```
user_role enum values:
- admin
- manager
- driver
- viewer
- owner (НОВАЯ)
```

### 2. Обновлены RLS политики для таблицы organizations

#### Политика SELECT (org_select_policy)
- **Owner** видит все организации
- **Остальные** видят только свою организацию (по organization_id из user_metadata)

#### Политика INSERT (org_insert_policy)
- **Только owner** может создавать новые организации

#### Политика UPDATE (org_update_policy)
- **Owner** может обновлять любые организации
- **Admin** может обновлять только свою организацию

#### Политика DELETE (org_delete_policy)
- **Только owner** может удалять организации

### 3. Добавлен комментарий к типу user_role
```
"Роли пользователей: owner (владелец всех организаций), admin, manager, driver, viewer"
```

## Проверка результатов

### Роли в базе данных
```sql
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'user_role';
```
✅ 5 ролей: admin, manager, driver, viewer, owner

### Политики RLS
```sql
SELECT policyname FROM pg_policies
WHERE tablename = 'organizations';
```
✅ 5 политик:
- org_delete_policy
- org_insert_policy
- org_select_policy
- org_update_policy
- service_role_bypass_all_organizations

## Следующие шаги

### Для создания пользователя с ролью owner:

1. В Supabase Dashboard перейдите в Authentication > Users
2. Выберите пользователя
3. В разделе "User Metadata" добавьте/обновите:
   ```json
   {
     "role": "owner"
   }
   ```

### Для тестирования:

1. Создайте тестового пользователя с ролью `owner`
2. Войдите под этим пользователем
3. Проверьте доступ к странице управления организациями
4. Проверьте, что owner видит все организации в системе
5. Проверьте возможность создания/удаления организаций

## Rollback (при необходимости)

⚠️ **ВНИМАНИЕ:** Откат этой миграции невозможен из-за особенностей PostgreSQL enum:
- Нельзя удалить значение из enum, если оно используется
- Политики можно удалить и восстановить старые

Если необходим откат:
```sql
-- 1. Убедитесь, что нет пользователей с ролью 'owner'
-- 2. Удалите новые политики
DROP POLICY IF EXISTS org_select_policy ON organizations;
DROP POLICY IF EXISTS org_insert_policy ON organizations;
DROP POLICY IF EXISTS org_update_policy ON organizations;
DROP POLICY IF EXISTS org_delete_policy ON organizations;

-- 3. Восстановите старую политику
CREATE POLICY "org_select" ON organizations FOR SELECT USING (
  id::text = (
    SELECT raw_user_meta_data->>'organization_id'
    FROM auth.users
    WHERE id = auth.uid()
  )
);
```

## Версия базы данных
- **До миграции:** 014
- **После миграции:** 015

---
Миграция применена автоматически через psql
