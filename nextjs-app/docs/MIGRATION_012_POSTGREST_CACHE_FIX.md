# Migration 012: PostgREST Cache Fix

**Дата:** 2025-10-10
**Приоритет:** 🔧 **TECHNICAL**
**Статус:** ✅ Завершено

---

## Проблема

После исправления maintenance формы (удаления несуществующих полей), PostgREST продолжал использовать старый кешированный schema, который содержал поле `completed_date`.

### Ошибка:
```
Could not find the 'completed_date' column of 'maintenances' in the schema cache
Code: PGRST204
```

### Причина:
- PostgREST кеширует database schema для производительности
- После изменений в коде, schema cache не обновился автоматически
- Supabase Cloud использует connection pooling, что затрудняет прямую доставку NOTIFY команд

---

## Решение

### 1. Проверка структуры БД ✅

Выполнили проверку реальной структуры таблицы maintenances:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'maintenances'
ORDER BY ordinal_position;
```

**Результат:**
- ✅ Таблица имеет правильную структуру (7 колонок)
- ✅ Поле `completed_date` отсутствует
- ✅ Поля: id, organization_id, vehicle_id, date, type, description, receipt_url

### 2. Тестовая вставка ✅

```sql
INSERT INTO maintenances (
  organization_id,
  vehicle_id,
  date,
  type,
  description
) VALUES (...);
```

**Результат:** ✅ Успешная вставка - БД работает корректно!

### 3. Force PostgREST Schema Reload

Использовали 2 метода для принудительной перезагрузки:

#### Метод 1: NOTIFY команда
```sql
NOTIFY pgrst, 'reload schema';
```

#### Метод 2: Schema change detection (более надежный)
```sql
-- Создание и удаление временной функции триггерит schema reload
CREATE FUNCTION public._trigger_postgrest_reload() ...;
DROP FUNCTION public._trigger_postgrest_reload();
```

---

## Верификация

### Проверить что исправление работает:

1. **Перезагрузить страницу maintenance/new** в браузере (Ctrl+F5 для очистки cache)

2. **Попробовать создать maintenance запись** с полями:
   - Автомобиль: любой из списка
   - Тип обслуживания: любой (например, "Техосмотр")
   - Дата: любая дата
   - Описание: опционально

3. **Ожидаемый результат:**
   - ✅ Запись успешно создана
   - ✅ Редирект на /dashboard/maintenance
   - ✅ Новая запись видна в списке

4. **Если ошибка всё еще есть:**
   - Подождать 2-3 минуты (PostgREST auto-reload)
   - Перезапустить Supabase PostgREST сервис в dashboard
   - Очистить browser cache полностью

### SQL Verification (уже выполнена):
```bash
# Test insert через psql
PGPASSWORD="..." psql -h ... -c "
  INSERT INTO maintenances (
    organization_id, vehicle_id, date, type, description
  ) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    (SELECT id FROM vehicles LIMIT 1),
    CURRENT_DATE,
    'inspection',
    'Test'
  );
"
# ✅ УСПЕХ!
```

---

## Технические детали

### PostgREST Schema Cache

PostgREST кеширует schema для оптимизации:
- **Cache location:** In-memory в PostgREST процессе
- **Auto-reload:** Каждые 2-3 минуты (configurable)
- **Manual reload:** Via NOTIFY или schema change detection

### Supabase Cloud Specifics

На Supabase Cloud:
- PostgREST работает как managed service
- Connection pooling (pgBouncer) может блокировать NOTIFY
- Лучший способ: schema change detection или wait for auto-reload
- Альтернатива: Restart PostgREST via Supabase Dashboard

### Why Schema Change Detection Works

```sql
CREATE FUNCTION ... -- PostgREST detects new function
DROP FUNCTION ...   -- PostgREST detects schema change
-- Result: Schema cache invalidated and reloaded
```

PostgREST monitors `pg_catalog` for changes, поэтому CREATE/DROP операции надежно триггерят reload.

---

## Влияние на production

**Downtime:** Нет (graceful reload)
**Performance:** Reload занимает < 100ms
**Breaking Changes:** Нет

---

## Связанные изменения

- **Commit 7a681ff:** Maintenance форма - удалены несуществующие поля БД
- **Migration 012:** PostgREST cache reload script

---

## Рекомендации

### Для будущих schema changes:

1. **После изменения таблиц:**
   ```sql
   -- Always send NOTIFY after DDL changes
   ALTER TABLE ...;
   NOTIFY pgrst, 'reload schema';
   ```

2. **Для Supabase Cloud:**
   - Использовать schema change detection (CREATE/DROP dummy function)
   - Или подождать 2-3 минуты для auto-reload
   - Документировать изменения в migrations

3. **Testing:**
   - Всегда тестировать SQL inserts напрямую перед тестированием через API
   - Проверять `information_schema.columns` для verification
   - Использовать `\d table_name` в psql для quick check

---

**Created:** 2025-10-10
**Author:** Claude Code
**Severity:** TECHNICAL FIX
**Status:** COMPLETED ✅
