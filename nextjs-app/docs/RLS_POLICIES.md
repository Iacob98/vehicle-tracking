# Row Level Security (RLS) Policies

## Обзор

В системе используются RLS политики для контроля доступа к данным на уровне строк PostgreSQL. Политики обеспечивают, что пользователи видят и изменяют только те данные, которые относятся к их организации.

## Роли пользователей

### owner (Суперадмин)
- Имеет полный доступ ко всем данным во всех организациях
- `organization_id` = NULL (по constraint в таблице users)
- Может создавать, читать, обновлять и удалять данные в любой организации

### admin (Администратор организации)
- Полный доступ к данным своей организации
- Может управлять пользователями и настройками своей организации
- Не может видеть или изменять данные других организаций

### manager (Менеджер)
- Может создавать и редактировать большинство данных в своей организации
- Не может удалять данные (кроме случаев, специально разрешенных)

### driver (Водитель)
- Ограниченный доступ для чтения данных
- Может создавать расходы на топливо (car_expenses)
- Не может изменять или удалять данные

### viewer (Наблюдатель)
- Только чтение данных своей организации

## Helper функции

### `get_user_role()`
Возвращает роль текущего пользователя.

```sql
CREATE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (SELECT role FROM public.users WHERE id = auth.uid())
  );
$$;
```

**Логика:**
1. Сначала проверяет роль в JWT токене (быстро, без запроса к БД)
2. Если в JWT нет данных, делает запрос к таблице users

### `get_user_organization_id()`
Возвращает organization_id текущего пользователя.

```sql
CREATE FUNCTION public.get_user_organization_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
    (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );
$$;
```

**Логика:**
1. Сначала проверяет organization_id в JWT токене
2. Если в JWT нет данных, делает запрос к таблице users
3. Для owner всегда возвращает NULL

## Паттерны политик

### SELECT (чтение)
```sql
CREATE POLICY "table_select" ON table_name FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);
```

**Логика:**
- Owner видит все строки
- Остальные видят только строки своей организации

### INSERT (создание)
```sql
CREATE POLICY "table_insert" ON table_name FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);
```

**Логика:**
- Owner может создавать записи для любой организации
- Admin и manager могут создавать записи только для своей организации
- Важно: owner проверяется отдельно, без проверки organization_id

### UPDATE (обновление)
```sql
CREATE POLICY "table_update" ON table_name FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);
```

**Логика:**
- Owner может обновлять любые записи
- Admin и manager могут обновлять записи только своей организации

### DELETE (удаление)
```sql
CREATE POLICY "table_delete" ON table_name FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);
```

**Логика:**
- Owner может удалять любые записи
- Только admin может удалять записи своей организации
- Manager не может удалять (по умолчанию)

## Специальные случаи

### Таблица users
```sql
-- SELECT: пользователь может видеть себя
CREATE POLICY "users_select" ON users FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
  OR id = auth.uid()  -- ← может видеть свою запись
);

-- UPDATE: пользователь может обновлять себя
CREATE POLICY "users_update" ON users FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND (organization_id = get_user_organization_id() OR id = auth.uid())
  )
);
```

### Таблица organizations
```sql
-- SELECT: admin может видеть только свою организацию
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (
  get_user_role() = 'owner'
  OR
  (
    get_user_role() = 'admin'
    AND id = get_user_organization_id()
  )
);

-- INSERT: только owner может создавать организации
CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (
  get_user_role() = 'owner'
);
```

### Таблица car_expenses
```sql
-- INSERT: driver может создавать расходы
CREATE POLICY "car_expenses_insert" ON car_expenses FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager', 'driver')  -- ← включает driver
    AND organization_id = get_user_organization_id()
  )
);
```

## Важные детали

### Почему owner проверяется отдельно?

В INSERT/UPDATE/DELETE политиках owner проверяется отдельно от проверки organization_id:

```sql
(get_user_role() = 'owner')
OR
(
  get_user_role() IN ('admin', 'manager')
  AND organization_id = get_user_organization_id()
)
```

**Причина:**
- У owner `organization_id` = NULL (по constraint)
- Если проверять `organization_id = NULL`, то получится `uuid = NULL`, что даёт NULL (не TRUE)
- Поэтому owner должен обходить проверку organization_id полностью

### Избежание циклических зависимостей

Helper функции используют JWT как primary источник данных:
- JWT доступен всегда, без запроса к БД
- Это предотвращает циклическую зависимость: "чтобы прочитать users, нужно проверить роль в users"
- Fallback на таблицу users используется только если JWT недоступен

### Constraint на таблицу users

```sql
ALTER TABLE users
ADD CONSTRAINT owner_no_org_check
CHECK (
  (role = 'owner' AND organization_id IS NULL)
  OR
  (role != 'owner' AND organization_id IS NOT NULL)
);
```

Этот constraint гарантирует:
- Owner всегда имеет organization_id = NULL
- Все остальные роли всегда имеют organization_id заполненным

## История изменений

### Migration 024 (Старая версия - ПРОБЛЕМНАЯ)
- Использовала helper функции
- `get_user_organization_id()` брала данные только из JWT
- Owner не мог создавать записи для организаций

### Migration 025 (Текущая версия)
- Исправлена `get_user_organization_id()` с fallback на users таблицу
- Упрощена логика политик: owner проверяется отдельно
- Owner теперь может создавать, редактировать и удалять данные для любой организации

## Тестирование политик

### Проверка доступа для owner
```sql
-- Войти как owner
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claim.sub" TO '<owner_user_id>';

-- Owner должен видеть все организации
SELECT * FROM organizations;

-- Owner должен создавать vehicle для любой организации
INSERT INTO vehicles (name, organization_id)
VALUES ('Test Vehicle', '<any_org_id>');
```

### Проверка доступа для admin
```sql
-- Войти как admin организации
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claim.sub" TO '<admin_user_id>';

-- Admin должен видеть только свою организацию
SELECT * FROM organizations;

-- Admin не должен видеть данные других организаций
SELECT * FROM vehicles WHERE organization_id != '<admin_org_id>';
```

## Troubleshooting

### Проблема: Owner не может создавать записи
**Причина:** Проверка `organization_id = get_user_organization_id()` даёт NULL для owner

**Решение:** Проверять owner отдельно:
```sql
(get_user_role() = 'owner')
OR (conditions for other roles)
```

### Проблема: Циклическая зависимость в users таблице
**Причина:** Политики проверяют users.role, но для доступа к users тоже нужна политика

**Решение:** Использовать JWT как primary источник данных в helper функциях

### Проблема: Политика возвращает NULL вместо TRUE/FALSE
**Причина:** Сравнение с NULL всегда даёт NULL

**Решение:** Использовать `COALESCE()` или проверять NULL явно:
```sql
-- Плохо
organization_id = get_user_organization_id()  -- может быть NULL

-- Хорошо
COALESCE(organization_id = get_user_organization_id(), false)
```
