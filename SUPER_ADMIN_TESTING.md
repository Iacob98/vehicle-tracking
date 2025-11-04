# Super Admin System - Testing Guide

## 📋 Обзор

Система Super Admin позволяет admin-пользователям с `organization_id = NULL` видеть и управлять всеми организациями, подобно owner.

**Формула Super Admin:**
```
isSuperAdmin = (role === 'owner') OR (role === 'admin' AND organization_id === NULL)
```

## ✅ Результаты автоматизированного тестирования

### Выполненные тесты (20/20 ✓)

**test-super-admin.py** - Тестирование RLS политик на уровне базы данных:

1. ✓ **Функция is_super_admin()** существует в БД
2. ✓ **RLS политики** для 12 таблиц используют is_super_admin():
   - vehicles, teams, users, organizations
   - penalties, vehicle_documents, expenses, car_expenses
   - team_members, team_member_documents, user_documents, vehicle_assignments
3. ✓ **Создание тестовых организаций** (ORG1, ORG2)
4. ✓ **Создание тестовых vehicles** в разных организациях
5. ✓ **Owner пользователь** имеет `organization_id = NULL`
6. ✓ **Owner видит все vehicles** из всех организаций через RLS
7. ✓ **Очистка тестовых данных** работает корректно

## 🚀 Запуск тестов

### Автоматизированный тест RLS политик

```bash
# С автоматической очисткой тестовых данных
AUTO_CLEANUP=y python3 test-super-admin.py

# Без очистки (оставить тестовые данные)
python3 test-super-admin.py
```

**Что проверяется:**
- Наличие функции `is_super_admin()` в базе данных
- Использование функции во всех RLS политиках
- Создание и доступ к данным разных организаций
- Корректность owner роли (organization_id = NULL)
- RLS фильтрация через прямые SQL запросы

## 🧪 Ручное тестирование через UI

### Шаг 1: Создание Super Admin пользователя

1. Откройте Supabase Dashboard
2. Authentication → Users → Invite User
3. После создания, откройте пользователя и добавьте в `user_metadata`:

```json
{
  "role": "admin",
  "organization_id": null,
  "first_name": "Super",
  "last_name": "Admin"
}
```

**ВАЖНО:** `organization_id` должен быть `null` (не строка "null", а настоящий JSON null)

### Шаг 2: Создание Regular Admin пользователя

Для сравнения, создайте обычного admin с organization_id:

```json
{
  "role": "admin",
  "organization_id": "your-org-uuid-here",
  "first_name": "Regular",
  "last_name": "Admin"
}
```

### Шаг 3: Тестовые сценарии

#### Super Admin (admin + NULL org_id)

**Ожидаемое поведение:**
- ✅ Видит ВСЕ организации на `/dashboard/organizations`
- ✅ Видит vehicles из ВСЕХ организаций на `/dashboard/vehicles`
- ✅ Может создавать организации
- ✅ Может создавать vehicles для любой организации
- ✅ Может редактировать данные любой организации
- ✅ Может удалять данные (роль admin)

#### Regular Admin (admin + конкретный org_id)

**Ожидаемое поведение:**
- ✅ Видит ТОЛЬКО свою организацию
- ✅ Видит ТОЛЬКО vehicles своей организации
- ❌ Не может создавать новые организации
- ✅ Может создавать vehicles только для своей организации
- ✅ Может редактировать данные своей организации
- ✅ Может удалять данные своей организации

#### Owner (owner роль)

**Ожидаемое поведение:**
- ✅ То же самое что Super Admin
- ✅ Системная роль (не изменяемая через UI)
- ✅ Всегда имеет `organization_id = NULL`

## 🔧 Технические детали

### Database Function

```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (
    -- Owner всегда super admin
    get_user_role() = 'owner'
    OR
    -- Admin с NULL organization_id - тоже super admin
    (
      get_user_role() = 'admin'
      AND get_user_organization_id() IS NULL
    )
  );
$$;
```

### RLS Policy Example (organizations)

```sql
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND id = get_user_organization_id()
  )
);
```

### Application Layer

**query-helpers.ts:**
```typescript
export interface UserQueryContext {
  role: string;
  organizationId: string | null;
  isSuperAdmin: boolean; // NEW: Super admin flag
}

export function getUserQueryContext(user: any): UserQueryContext {
  const role = user?.user_metadata?.role || user?.role || 'viewer';
  const organizationId = user?.user_metadata?.organization_id ?? user?.organization_id ?? null;

  // Super admin = owner ИЛИ (admin с NULL organization_id)
  const isSuperAdmin = role === 'owner' || (role === 'admin' && organizationId === null);

  return { role, organizationId, isSuperAdmin };
}
```

**auth-helpers.ts:**
```typescript
export function isSuperAdmin(user: User): boolean {
  return user.role === 'owner' || (user.role === 'admin' && user.organization_id === null);
}
```

## 📊 Изменённые файлы

### Database
- `nextjs-app/migrations/027_super_admin_support.sql` - новая миграция с is_super_admin()

### Core Utilities
- `nextjs-app/lib/query-helpers.ts` - добавлен isSuperAdmin
- `nextjs-app/lib/auth-helpers.ts` - добавлена функция isSuperAdmin()
- `nextjs-app/lib/api-response.ts` - добавлен isSuperAdmin в return

### API Routes (29 файлов)
Все API роуты обновлены для использования `isSuperAdmin` вместо `isOwner`:
- organizations, vehicles, teams, users, penalties
- maintenance, car-expenses, vehicle-assignments, team-members
- expenses, fuel-limits, documents, upload routes

### UI Components
- `nextjs-app/app/dashboard/organizations/page.tsx` - проверка isSuperAdmin

## 🎯 Рекомендации

### Для Production

1. **Создайте Super Admin аккаунт:**
   ```json
   {
     "role": "admin",
     "organization_id": null
   }
   ```

2. **Используйте Super Admin для:**
   - Управления всеми организациями
   - Создания новых организаций
   - Мониторинга всех vehicles/teams
   - Troubleshooting проблем клиентов

3. **Используйте Regular Admin для:**
   - Управления конкретной организацией
   - Делегирования прав в рамках одной компании

4. **Используйте Owner для:**
   - Системных операций
   - Критических изменений
   - Финального уровня доступа

### Безопасность

- ⚠️ Super Admin имеет доступ ко ВСЕМ данным всех организаций
- ⚠️ Создавайте Super Admin только для доверенных лиц
- ⚠️ Регулярно проверяйте список пользователей с `organization_id = NULL`
- ✅ RLS политики на уровне БД защищают от обхода через SQL
- ✅ Application layer дополнительно проверяет права доступа

## 🐛 Troubleshooting

### Проблема: Admin не видит все организации

**Проверьте:**
```sql
-- В Supabase SQL Editor
SELECT id, email,
       raw_user_meta_data->>'role' as role,
       raw_user_meta_data->>'organization_id' as org_id
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'admin';
```

**organization_id должен быть:**
- `null` (пусто) для Super Admin
- UUID строка для Regular Admin

### Проблема: RLS блокирует доступ

**Проверьте функцию:**
```sql
SELECT is_super_admin();
```

**Проверьте политики:**
```sql
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public'
AND qual LIKE '%is_super_admin%'
ORDER BY tablename;
```

### Проблема: Тесты не запускаются

**Требования:**
- Python 3.x
- psql (PostgreSQL client)
- Переменные окружения в test-super-admin.py

**Проверка подключения:**
```bash
PGPASSWORD="..." psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 \
  -U postgres.wymucemxzhaulibsqdta -d postgres -c "SELECT 1;"
```

## 📝 Changelog

### 2025-01-04
- ✅ Создана функция `is_super_admin()` в БД
- ✅ Обновлены 48 RLS политик для 12 таблиц
- ✅ Добавлен `isSuperAdmin` в application layer
- ✅ Обновлены 29 API routes
- ✅ Создан автоматизированный тест (test-super-admin.py)
- ✅ Все тесты пройдены успешно (20/20)

## 📞 Поддержка

При возникновении проблем:
1. Запустите `python3 test-super-admin.py` для диагностики
2. Проверьте логи в Supabase Dashboard
3. Проверьте RLS политики через SQL Editor
4. Проверьте user_metadata пользователя
