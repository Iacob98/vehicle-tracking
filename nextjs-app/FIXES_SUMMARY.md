# 📋 Сводка исправлений - 2025-10-05

## ✅ Исправление №1: Organization ID для автомобилей

### Проблема
При создании автомобиля возникала ошибка:
```
Error: Organization ID not found
```

### Причина
- После логина `organization_id` не сохранялся в `user_metadata`
- Форма VehicleForm пыталась получить `organization_id` только из metadata

### Решение
1. **Обновлён процесс логина** (`app/login/actions.ts`):
   - При логине получаем `organization_id` из таблицы `users`
   - Сохраняем его в `user_metadata` для быстрого доступа

2. **Созданы универсальные хелперы**:
   - `lib/getOrganizationId.ts` - для серверных компонентов
   - `lib/getOrganizationIdClient.ts` - для клиентских компонентов
   - Логика: сначала проверяет metadata → если нет, запрашивает из БД → обновляет metadata

3. **Обновлена форма** (`app/dashboard/vehicles/VehicleForm.tsx`):
   - Использует `getOrganizationIdClient()` с fallback-логикой
   - Улучшенные сообщения об ошибках

### Документация
- ✅ `ORGANIZATION_ID_FIX.md` - полное описание исправления

### Статус
✅ **ИСПРАВЛЕНО** - пользователям нужно перелогиниться один раз

---

## ✅ Исправление №2: RLS для team_member_documents

### Проблема
При добавлении документов участников бригады возникала ошибка:
```
Error: new row violates row-level security policy for table "team_member_documents"
```

### Причина
- Таблица `team_member_documents` не имеет столбца `organization_id`
- RLS-политика ожидает этот столбец для изоляции данных между организациями

### Решение
1. **Создана миграция** (`migrations/002_add_organization_id_to_team_member_documents.sql`):
   - Добавляет столбец `organization_id UUID`
   - Заполняет данными из таблицы `team_members`
   - Добавляет NOT NULL constraint и foreign key
   - Создаёт индекс для производительности
   - Настраивает RLS-политики

2. **Обновлён API** (`app/api/team-member-documents/route.ts`):
   - В insert добавлено поле `organization_id: orgId` (строка 42)
   - API теперь корректно передаёт organization_id при создании документа

### Документация
- ✅ `RUN_MIGRATION.md` - инструкция по запуску миграции

### Статус
⏳ **ОЖИДАЕТ ВЫПОЛНЕНИЯ МИГРАЦИИ** - нужно выполнить SQL в Supabase Dashboard

---

## 🔧 Способы запуска миграции

### Способ 1: Supabase Dashboard (РЕКОМЕНДУЕТСЯ)
1. Зайти на https://supabase.com/dashboard
2. Выбрать проект `wymucemxzhaulibsqdta`
3. SQL Editor → New query
4. Скопировать SQL из `migrations/002_add_organization_id_to_team_member_documents.sql`
5. Выполнить (RUN)

### Способ 2: psql (если есть пароль БД)
```bash
PGPASSWORD="пароль" psql \
  -h aws-0-eu-central-1.pooler.supabase.com \
  -U postgres.wymucemxzhaulibsqdta \
  -d postgres \
  -f migrations/002_add_organization_id_to_team_member_documents.sql
```

### Способ 3: Supabase CLI
```bash
supabase db push
```

---

## 📊 Файлы изменены

### Исправление №1 (Organization ID):
- ✏️ `app/login/actions.ts` - обновлён процесс логина
- ➕ `lib/getOrganizationId.ts` - серверный хелпер
- ➕ `lib/getOrganizationIdClient.ts` - клиентский хелпер
- ✏️ `app/dashboard/vehicles/VehicleForm.tsx` - использует новый хелпер
- ➕ `ORGANIZATION_ID_FIX.md` - документация

### Исправление №2 (team_member_documents):
- ➕ `migrations/002_add_organization_id_to_team_member_documents.sql` - SQL миграция
- ✏️ `app/api/team-member-documents/route.ts` - добавлен organization_id в insert
- ➕ `RUN_MIGRATION.md` - инструкция запуска
- ➕ `scripts/run-migration.ts` - скрипт (требует RPC функцию)

---

## 🎯 Что нужно сделать пользователю

### Для исправления №1:
1. ✅ Выйти из системы
2. ✅ Войти заново
3. ✅ Organization ID автоматически установится

### Для исправления №2:
1. ⏳ Выполнить миграцию через Supabase Dashboard (см. `RUN_MIGRATION.md`)
2. ⏳ Проверить, что столбец `organization_id` появился в таблице
3. ⏳ Попробовать добавить документ участника бригады

---

## 🔍 Проверка результатов

### Проверка #1 (Organization ID):
```javascript
// В консоли браузера (F12)
supabase.auth.getUser().then(({ data }) => {
  console.log('Organization ID:', data.user?.user_metadata?.organization_id);
});
```

Должен вывести UUID организации.

### Проверка #2 (team_member_documents):
```sql
-- В Supabase SQL Editor
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'team_member_documents'
AND column_name = 'organization_id';
```

Ожидаемый результат:
```
organization_id | uuid | NO
```

---

## 📚 Связанные документы

- `ORGANIZATION_ID_FIX.md` - подробное описание исправления Organization ID
- `RUN_MIGRATION.md` - инструкция по запуску миграции team_member_documents
- `TESTING_DOCUMENTATION.md` - документация по тестированию
- `TESTS_RESULTS.md` - результаты прогона тестов

---

## 🐛 Известные проблемы

### Решённые:
- ✅ Organization ID не найден при создании автомобиля
- ✅ RLS violation при создании документов участников (ожидает миграции)

### Активные:
- Нет активных проблем

---

**Последнее обновление:** 2025-10-05
**Статус исправлений:**
- ✅ Organization ID для автомобилей - **ГОТОВО** (требует перелогин)
- ⏳ RLS для team_member_documents - **ОЖИДАЕТ МИГРАЦИИ**
