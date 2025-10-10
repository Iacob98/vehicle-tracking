# 🔄 Запуск миграции team_member_documents

## Проблема
При добавлении документов участников бригады возникает ошибка:
```
Error: new row violates row-level security policy for table "team_member_documents"
```

## Решение
Нужно выполнить SQL-миграцию для добавления столбца `organization_id` в таблицу `team_member_documents`.

---

## 📋 Варианты запуска миграции

### Вариант 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)

1. **Откройте Supabase Dashboard:**
   - Перейдите на https://supabase.com/dashboard
   - Войдите в свой аккаунт
   - Выберите проект `wymucemxzhaulibsqdta`

2. **Откройте SQL Editor:**
   - В левом меню найдите раздел "SQL Editor"
   - Нажмите "New query"

3. **Скопируйте и выполните SQL:**
   ```sql
   -- Migration: 002_add_organization_id_to_team_member_documents

   -- Step 1: Add organization_id column (nullable first)
   ALTER TABLE team_member_documents
   ADD COLUMN IF NOT EXISTS organization_id UUID;

   -- Step 2: Populate organization_id from team_members
   UPDATE team_member_documents tmd
   SET organization_id = tm.organization_id
   FROM team_members tm
   WHERE tmd.team_member_id = tm.id
   AND tmd.organization_id IS NULL;

   -- Step 3: Make it NOT NULL and add foreign key
   ALTER TABLE team_member_documents
   ALTER COLUMN organization_id SET NOT NULL;

   ALTER TABLE team_member_documents
   ADD CONSTRAINT team_member_documents_organization_id_fkey
   FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

   -- Step 4: Add index for performance
   CREATE INDEX IF NOT EXISTS idx_team_member_documents_organization_id
   ON team_member_documents(organization_id);

   -- Step 5: Drop old RLS policies if they exist
   DROP POLICY IF EXISTS "Users can manage team member documents in their organization" ON team_member_documents;
   DROP POLICY IF EXISTS "Users can view team member documents in their organization" ON team_member_documents;

   -- Step 6: Enable RLS
   ALTER TABLE team_member_documents ENABLE ROW LEVEL SECURITY;

   -- Step 7: Create new RLS policies
   CREATE POLICY "Users can view team member documents in their organization"
   ON team_member_documents
   FOR SELECT
   USING (
     organization_id IN (
       SELECT organization_id FROM users WHERE id = auth.uid()
     )
   );

   CREATE POLICY "Users can insert team member documents in their organization"
   ON team_member_documents
   FOR INSERT
   WITH CHECK (
     organization_id IN (
       SELECT organization_id FROM users WHERE id = auth.uid()
     )
   );

   CREATE POLICY "Users can update team member documents in their organization"
   ON team_member_documents
   FOR UPDATE
   USING (
     organization_id IN (
       SELECT organization_id FROM users WHERE id = auth.uid()
     )
   );

   CREATE POLICY "Users can delete team member documents in their organization"
   ON team_member_documents
   FOR DELETE
   USING (
     organization_id IN (
       SELECT organization_id FROM users WHERE id = auth.uid()
     )
   );
   ```

4. **Нажмите RUN** (или Ctrl+Enter / Cmd+Enter)

5. **Проверьте результат:**
   - Должно появиться сообщение "Success. No rows returned"
   - Если есть ошибки - скопируйте их и сообщите

---

### Вариант 2: Через psql (если есть доступ к БД)

Если у вас есть пароль от базы данных PostgreSQL:

```bash
PGPASSWORD="ваш_пароль" psql \
  -h aws-0-eu-central-1.pooler.supabase.com \
  -U postgres.wymucemxzhaulibsqdta \
  -d postgres \
  -f migrations/002_add_organization_id_to_team_member_documents.sql
```

---

### Вариант 3: Через Supabase CLI (если установлен)

```bash
supabase db push
```

или

```bash
supabase db execute --file migrations/002_add_organization_id_to_team_member_documents.sql
```

---

## ✅ Как проверить, что миграция выполнена

После выполнения миграции:

1. **Проверьте структуру таблицы в Supabase:**
   - Table Editor → team_member_documents
   - Должен быть столбец `organization_id` типа `uuid`

2. **Попробуйте добавить документ участника:**
   - Перейдите в раздел "Бригады"
   - Выберите участника
   - Попробуйте добавить документ
   - Ошибки RLS больше не должно быть!

3. **Проверьте через SQL:**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'team_member_documents'
   AND column_name = 'organization_id';
   ```

   Ожидаемый результат:
   ```
   column_name     | data_type | is_nullable
   ---------------+-----------+------------
   organization_id | uuid      | NO
   ```

---

## 🔍 Что делает эта миграция

1. ✅ Добавляет столбец `organization_id` в таблицу `team_member_documents`
2. ✅ Заполняет его данными из связанной таблицы `team_members`
3. ✅ Делает столбец обязательным (NOT NULL)
4. ✅ Добавляет внешний ключ на таблицу `organizations`
5. ✅ Создаёт индекс для быстрого поиска
6. ✅ Включает RLS (Row Level Security)
7. ✅ Создаёт политики для изоляции данных между организациями

---

## 🆘 Если возникли ошибки

### Ошибка: "column already exists"
**Решение:** Столбец уже добавлен, можно пропустить Step 1

### Ошибка: "constraint already exists"
**Решение:** Ограничение уже создано, можно пропустить этот шаг

### Ошибка: "violates not-null constraint"
**Решение:** Есть записи без team_member_id. Нужно сначала очистить:
```sql
DELETE FROM team_member_documents WHERE team_member_id IS NULL;
```

### Ошибка: "policy already exists"
**Решение:** Политика уже создана, сначала удалите старую:
```sql
DROP POLICY IF EXISTS "название_политики" ON team_member_documents;
```

---

## 📞 Поддержка

Если после выполнения миграции проблема не решена:

1. Проверьте, что код API обновлён (должен быть `organization_id: orgId` в insert)
2. Попробуйте выйти и войти заново в систему
3. Проверьте логи браузера (F12 → Console) для дополнительной информации

---

**Дата создания:** 2025-10-05
**Статус:** ⏳ Ожидает выполнения
**Приоритет:** 🔴 Высокий
