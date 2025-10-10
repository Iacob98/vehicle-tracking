# RLS Security Notes

## ⚠️ Текущее состояние безопасности

Базовая схема RLS создана и работает, но требует доработки для полной безопасности.

### ✅ Что реализовано:
1. organization_id добавлен во все критичные таблицы
2. Базовые SELECT/INSERT/UPDATE/DELETE политики для всех таблиц
3. Правильный путь к JWT claim: `auth.jwt()->'user_metadata'->>'organization_id'`
4. Индексы для производительности

### ⚠️ Что требует доработки:

#### 1. WITH CHECK clauses в UPDATE политиках
**Проблема:** Некоторые UPDATE политики проверяют USING, но не WITH CHECK  
**Риск:** Атакующий может изменить строку так, чтобы она стала видна другой организации

**Решение:**
```sql
-- Пример правильной политики:
CREATE POLICY "table_update" ON table_name FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');
```

**Применить к:**
- team_member_documents
- vehicle_assignments  
- material_assignments
- material_history

#### 2. Cross-tenant foreign key validation
**Проблема:** INSERT/UPDATE не проверяют, что referenced entities (vehicle, material) принадлежат той же организации  
**Риск:** Можно создать vehicle_assignment с vehicle из другой организации

**Решение:**
```sql
-- Пример для vehicle_assignments:
CREATE POLICY "vehicle_assignments_insert" ON vehicle_assignments FOR INSERT 
    WITH CHECK (
        -- Проверяем команду
        EXISTS (
            SELECT 1 FROM teams 
            WHERE teams.id = vehicle_assignments.team_id 
            AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
        )
        AND
        -- Проверяем автомобиль
        EXISTS (
            SELECT 1 FROM vehicles 
            WHERE vehicles.id = vehicle_assignments.vehicle_id 
            AND vehicles.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
        )
    );
```

**Применить к:**
- vehicle_assignments (team + vehicle)
- material_assignments (team + material)
- material_history (team + material)
- rental_contracts (organization + vehicle)
- expenses (organization + vehicle/team)
- penalties (organization + vehicle + user)
- maintenances (organization + vehicle)

#### 3. Дополнительные проверки

**Service Role bypass:**
Текущие политики используют `auth.jwt()`, который не работает для service_role ключа.  
Для admin операций через service_role нужно:
```sql
CREATE POLICY "admin_bypass" ON table_name FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```

**NULL organization_id:**
Добавить проверку на NOT NULL:
```sql
ALTER TABLE table_name 
    ADD CONSTRAINT check_org_id_not_null 
    CHECK (organization_id IS NOT NULL);
```

### 🔧 Порядок исправления:

1. **Фаза 1: WITH CHECK clauses**
   ```sql
   -- Найти все UPDATE политики без WITH CHECK
   -- Добавить WITH CHECK, копируя USING clause
   ```

2. **Фаза 2: Cross-tenant FK validation**
   ```sql
   -- Для каждой таблицы с FK на другие таблицы:
   -- Добавить проверку organization_id для всех referenced entities
   ```

3. **Фаза 3: Service role policies**
   ```sql
   -- Добавить политики для service_role на все таблицы
   ```

4. **Фаза 4: NOT NULL constraints**
   ```sql
   -- Добавить NOT NULL constraint на organization_id
   ```

### 🧪 Тестирование безопасности:

```sql
-- Создать 2 тестовые организации
INSERT INTO organizations (id, name) VALUES 
    ('org1-uuid', 'Org 1'),
    ('org2-uuid', 'Org 2');

-- Попытаться создать vehicle_assignment с vehicle из другой org
-- Должно FAIL
SET request.jwt.claims = '{"user_metadata": {"organization_id": "org1-uuid"}}';
INSERT INTO vehicle_assignments (vehicle_id, team_id, start_date)
VALUES (
    (SELECT id FROM vehicles WHERE organization_id = 'org2-uuid' LIMIT 1),
    (SELECT id FROM teams WHERE organization_id = 'org1-uuid' LIMIT 1),
    CURRENT_DATE
);

-- Попытаться изменить organization_id через UPDATE
-- Должно FAIL
UPDATE vehicles SET organization_id = 'org2-uuid' 
WHERE organization_id = 'org1-uuid';
```

### 📚 Ресурсы:
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

**Рекомендация:** Доработать RLS политики ПЕРЕД запуском в продакшен.  
**Временное решение:** Использовать service_role ключ на бэкенде с проверками на уровне приложения.
