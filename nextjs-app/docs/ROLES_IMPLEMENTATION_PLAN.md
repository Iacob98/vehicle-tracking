# План внедрения упрощенной системы ролей

**Дата:** 2025-10-10
**Текущая версия:** Next.js 15.1.6 + Supabase
**Цель:** Упростить роли с 5 до 4, внедрить процессы анти-фрод и TCO аналитику

---

## 1. Текущее состояние vs Целевое

### Текущие роли (5):
- 👑 **Owner** - владелец организации, полный доступ
- 🔧 **Admin** - администратор системы
- 💼 **Manager** - менеджер операций
- 👨‍💼 **Team Lead** - бригадир
- 👷 **Worker** - работник

### Целевые роли (4):
- 👑 **Админ** (объединяет Owner + Admin) - полный доступ к системе
- 💼 **Менеджер** (Manager) - управление операциями, аналитика, назначения
- 🚗 **Водитель** (объединяет Team Lead + Worker) - водители с правом заправки/штрафов
- 👁️ **Просмотр** (новая роль) - только чтение данных

### Что уже есть в БД:
✅ Таблица `users` с полем `role` (текст/enum)
✅ Таблицы: `vehicles`, `teams`, `team_members`, `penalties`, `expenses`, `car_expenses`, `maintenance`, `documents`
✅ RLS политики настроены на основе `organization_id`
✅ Централизованная обработка ошибок
✅ Валидация форм (Zod + react-hook-form)
✅ Пагинация для всех списков

### Что нужно добавить:
❌ Новая роль "Просмотр" (viewer)
❌ Поле `driver_id` в `car_expenses` для связи заправок с водителем
❌ Анти-фрод проверки (лимиты, частота, геолокация опционально)
❌ TCO калькулятор (Total Cost of Ownership)
❌ Процесс онбординга автомобиля
❌ Права доступа по ролям в UI

---

## 2. Миграции БД

### 2.1 Изменение enum для ролей

**Файл:** `migrations/008_simplify_roles.sql`

```sql
-- Шаг 1: Изменить существующие роли
BEGIN;

-- Создать временный тип с новыми ролями
CREATE TYPE user_role_new AS ENUM ('admin', 'manager', 'driver', 'viewer');

-- Мигрировать данные
ALTER TABLE users ADD COLUMN role_new user_role_new;

UPDATE users SET role_new =
  CASE
    WHEN role IN ('owner', 'admin') THEN 'admin'::user_role_new
    WHEN role = 'manager' THEN 'manager'::user_role_new
    WHEN role IN ('team_lead', 'worker') THEN 'driver'::user_role_new
    ELSE 'viewer'::user_role_new
  END;

-- Заменить старый тип
ALTER TABLE users DROP COLUMN role;
ALTER TABLE users RENAME COLUMN role_new TO role;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer';
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Удалить старый тип
DROP TYPE IF EXISTS user_role CASCADE;
ALTER TYPE user_role_new RENAME TO user_role;

COMMIT;
```

### 2.2 Добавление поля driver_id в car_expenses

```sql
-- Для связи заправки с конкретным водителем (анти-фрод)
ALTER TABLE car_expenses
ADD COLUMN driver_id UUID REFERENCES users(id);

-- Индекс для быстрого поиска заправок водителя
CREATE INDEX idx_car_expenses_driver_id ON car_expenses(driver_id);

-- Добавить поле для геолокации (опционально)
ALTER TABLE car_expenses
ADD COLUMN location_lat DECIMAL(10, 8),
ADD COLUMN location_lng DECIMAL(11, 8);

COMMENT ON COLUMN car_expenses.driver_id IS 'Водитель, осуществивший расход (для анти-фрод)';
COMMENT ON COLUMN car_expenses.location_lat IS 'Широта места расхода (GPS)';
COMMENT ON COLUMN car_expenses.location_lng IS 'Долгота места расхода (GPS)';
```

### 2.3 Таблица для лимитов и анти-фрод правил

```sql
-- Таблица лимитов заправок по автомобилям
CREATE TABLE IF NOT EXISTS fuel_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
  daily_limit DECIMAL(10,2) DEFAULT 100.00, -- Максимум в день (€)
  weekly_limit DECIMAL(10,2) DEFAULT 500.00, -- Максимум в неделю (€)
  max_tank_capacity DECIMAL(10,2) DEFAULT 80.00, -- Объем бака (литры)
  min_interval_hours INTEGER DEFAULT 12, -- Минимум часов между заправками
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица алертов анти-фрод
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  expense_id UUID REFERENCES car_expenses(id) NOT NULL,
  alert_type TEXT NOT NULL, -- 'daily_limit', 'frequency', 'duplicate', 'amount'
  alert_message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS политики для fuel_limits
ALTER TABLE fuel_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fuel limits in their organization" ON fuel_limits
FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins and managers can manage fuel limits" ON fuel_limits
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- RLS политики для fraud_alerts
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fraud alerts in their organization" ON fraud_alerts
FOR SELECT USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins and managers can manage fraud alerts" ON fraud_alerts
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);
```

---

## 3. Обновление RLS политик по ролям

### 3.1 Политики для роли "Просмотр" (viewer)

**Файл:** `migrations/009_viewer_role_policies.sql`

```sql
-- Viewer может только читать данные, никаких изменений
BEGIN;

-- Для каждой таблицы добавить политику SELECT для viewer
CREATE POLICY "Viewers can read vehicles" ON vehicles
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND role = 'viewer'
  )
);

-- Аналогично для всех таблиц: teams, users, penalties, expenses,
-- car_expenses, maintenance, documents, team_members, vehicle_assignments

-- Viewer НЕ может INSERT/UPDATE/DELETE (эти политики не создаются)

COMMIT;
```

### 3.2 Политики для роли "Водитель" (driver)

```sql
-- Водитель может:
-- - Просматривать свой автомобиль и бригаду
-- - Добавлять заправки (car_expenses с category='fuel')
-- - Добавлять штрафы (penalties)
-- - НЕ может изменять пользователей, бригады, удалять данные

CREATE POLICY "Drivers can add fuel expenses" ON car_expenses
FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  AND category = 'fuel'
  AND driver_id = auth.uid()
);

CREATE POLICY "Drivers can add penalties" ON penalties
FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  AND user_id = auth.uid()
);
```

### 3.3 Политики для "Менеджер" и "Админ"

```sql
-- Менеджер и Админ - полный доступ CRUD
-- (уже есть в текущих политиках, просто обновить условие)

-- Пример обновления существующей политики:
DROP POLICY IF EXISTS "Users can insert vehicles in their organization" ON vehicles;
CREATE POLICY "Admins and managers can insert vehicles" ON vehicles
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);
```

---

## 4. API Endpoints (новые/обновленные)

### 4.1 Анти-фрод проверки

**Файл:** `app/api/car-expenses/validate/route.ts`

**Функционал:**
- Проверка дневного/недельного лимита
- Проверка частоты заправок (минимум N часов между заправками)
- Проверка на дубликаты (одинаковые суммы в тот же день)
- Проверка объема бака (не больше максимума)
- Запись алертов в `fraud_alerts`

**Эндпоинт:** `POST /api/car-expenses/validate`

**Запрос:**
```json
{
  "vehicle_id": "uuid",
  "driver_id": "uuid",
  "amount": 75.50,
  "date": "2025-10-10",
  "category": "fuel",
  "liters": 65.0
}
```

**Ответ:**
```json
{
  "valid": true,
  "alerts": [
    {
      "type": "warning",
      "message": "Заправка близка к дневному лимиту (80%)"
    }
  ]
}
```

### 4.2 TCO аналитика

**Файл:** `app/api/analytics/tco/route.ts`

**Функционал:**
- Расчет Total Cost of Ownership по автомобилю
- Разбивка: топливо, ремонт, обслуживание, страховка, штрафы, аренда
- За период (месяц, квартал, год)
- Сравнение автомобилей

**Эндпоинт:** `GET /api/analytics/tco?vehicle_id=uuid&period=month`

**Ответ:**
```json
{
  "vehicle_id": "uuid",
  "vehicle_name": "Mercedes Sprinter",
  "period": "2025-10",
  "total_cost": 2450.80,
  "breakdown": {
    "fuel": 1200.00,
    "maintenance": 450.00,
    "repair": 500.00,
    "insurance": 200.00,
    "penalties": 100.80,
    "rental": 0.00
  },
  "cost_per_km": 0.45, // если есть пробег
  "alerts": ["Высокие расходы на ремонт"]
}
```

### 4.3 Онбординг автомобиля

**Файл:** `app/api/vehicles/onboarding/route.ts`

**Функционал:**
- Пошаговое добавление автомобиля
- Шаг 1: Основная информация (название, номер, VIN)
- Шаг 2: Документы (регистрация, страховка, TÜV)
- Шаг 3: Лимиты заправок
- Шаг 4: Назначение на бригаду

**Эндпоинт:** `POST /api/vehicles/onboarding`

---

## 5. Frontend компоненты (обновления)

### 5.1 Компонент выбора роли

**Файл:** `app/dashboard/users/new/UserForm.tsx`

**Обновить:**
```tsx
<select name="role" defaultValue="viewer">
  <option value="admin">👑 Админ - Полный доступ</option>
  <option value="manager">💼 Менеджер - Управление операциями</option>
  <option value="driver">🚗 Водитель - Заправки и штрафы</option>
  <option value="viewer">👁️ Просмотр - Только чтение</option>
</select>
```

### 5.2 Форма заправки с анти-фрод

**Файл:** `app/dashboard/car-expenses/new/FuelExpenseForm.tsx`

**Добавить:**
- Поле "Водитель" (автозаполнение текущим пользователем для role='driver')
- Поле "Литры" (для проверки объема бака)
- Кнопка "Получить GPS координаты" (опционально)
- Блок предупреждений (если API вернул алерты)

**Пример:**
```tsx
{alerts.length > 0 && (
  <div className="bg-yellow-50 p-4 rounded">
    <h4>⚠️ Предупреждения:</h4>
    <ul>
      {alerts.map(alert => <li key={alert.type}>{alert.message}</li>)}
    </ul>
  </div>
)}
```

### 5.3 Dashboard TCO виджет

**Файл:** `app/dashboard/analytics/TCOWidget.tsx`

**Компонент:**
- Карточка с общим TCO за месяц
- График разбивки расходов (Chart.js или Recharts)
- Топ-3 самых дорогих автомобиля
- Кнопка "Подробная аналитика"

### 5.4 Условный рендеринг по ролям

**Файл:** `components/RoleGuard.tsx`

**Создать:**
```tsx
export function RoleGuard({
  allowedRoles,
  children
}: {
  allowedRoles: UserRole[],
  children: React.ReactNode
}) {
  const { user } = useUser();
  if (!allowedRoles.includes(user.role)) {
    return null;
  }
  return <>{children}</>;
}

// Использование:
<RoleGuard allowedRoles={['admin', 'manager']}>
  <Button>Удалить автомобиль</Button>
</RoleGuard>
```

### 5.5 Онбординг автомобиля (мастер)

**Файл:** `app/dashboard/vehicles/new/OnboardingWizard.tsx`

**Компонент:**
- Multi-step форма (4 шага)
- Прогресс-бар
- Валидация на каждом шаге
- Возможность вернуться назад
- Сохранение черновика (localStorage)

---

## 6. User Stories по ролям

### 6.1 Админ 👑
**Может:**
- ✅ Управлять пользователями (создать, редактировать, удалить, изменить роль)
- ✅ Управлять бригадами (создать, назначить бригадира, удалить)
- ✅ Управлять автомобилями (полный CRUD + документы)
- ✅ Настраивать лимиты заправок
- ✅ Просматривать все алерты анти-фрод
- ✅ Доступ ко всей аналитике и отчетам
- ✅ Настройки организации

**Сценарий:**
*Админ Мария заходит в систему → Видит dashboard с алертами о превышении лимитов → Открывает алерт → Видит водителя и автомобиль → Проверяет историю заправок → Связывается с водителем → Закрывает алерт*

### 6.2 Менеджер 💼
**Может:**
- ✅ Просматривать всех пользователей (не может удалять)
- ✅ Управлять бригадами (создать, редактировать, назначать автомобили)
- ✅ Управлять автомобилями (CRUD + документы)
- ✅ Добавлять штрафы, расходы, обслуживание
- ✅ Просматривать алерты анти-фрод (не может настраивать лимиты)
- ✅ Доступ к аналитике (TCO, расходы, штрафы)
- ❌ Не может управлять пользователями
- ❌ Не может изменять настройки организации

**Сценарий:**
*Менеджер Иван получает новый автомобиль → Запускает онбординг → Заполняет данные → Загружает документы → Устанавливает лимиты (по умолчанию) → Назначает автомобиль на бригаду "Дальние перевозки" → Уведомляет бригадира*

### 6.3 Водитель 🚗
**Может:**
- ✅ Просматривать свой профиль и документы
- ✅ Просматривать свою бригаду
- ✅ Просматривать назначенный автомобиль
- ✅ Добавлять заправки (car_expenses с category='fuel')
- ✅ Добавлять штрафы (penalties для себя)
- ✅ Просматривать историю своих заправок
- ❌ Не может удалять/редактировать расходы
- ❌ Не может управлять другими пользователями
- ❌ Не может видеть аналитику организации

**Сценарий:**
*Водитель Петр заправляет автомобиль → Открывает приложение → Переходит "Добавить заправку" → Выбирает свой автомобиль (автоматически) → Вводит сумму 85€ и 70 литров → Нажимает "GPS" (получает координаты) → Сохраняет → Получает предупреждение "Близко к дневному лимиту" → Продолжает*

### 6.4 Просмотр 👁️
**Может:**
- ✅ Просматривать автомобили
- ✅ Просматривать бригады
- ✅ Просматривать документы
- ✅ Просматривать расходы и штрафы (read-only)
- ❌ Не может создавать, редактировать, удалять что-либо

**Сценарий:**
*Аудитор София получает доступ "Просмотр" → Заходит в систему → Просматривает все автомобили → Открывает аналитику расходов → Экспортирует отчет за квартал → Покидает систему*

---

## 7. Процессы

### 7.1 Онбординг автомобиля
**Шаги:**
1. **Основная информация:** Название, номер, VIN, статус, тип (аренда/собственность)
2. **Документы:** Регистрация (обязательно), Страховка (обязательно), TÜV (обязательно)
3. **Лимиты:** Объем бака, дневной лимит, недельный лимит, минимальный интервал
4. **Назначение:** Выбор бригады, период назначения
5. **Проверка:** Сводка всех данных → Подтверждение → Создание

**Валидация:**
- ❌ Нельзя завершить без обязательных документов
- ⚠️ Предупреждение если не установлены лимиты
- ⚠️ Предупреждение если не назначена бригада

### 7.2 Заправка с анти-фрод
**Шаги:**
1. **Водитель добавляет заправку:**
   - Автомобиль (выбор из назначенных ему)
   - Сумма (€)
   - Литры
   - Дата (сегодня по умолчанию)
   - GPS координаты (опционально)

2. **Backend проверяет:**
   - Дневной лимит (не превышен ли?)
   - Недельный лимит
   - Частота заправок (не слишком часто?)
   - Объем бака (не больше максимума?)
   - Дубликаты (такая же сумма в тот же день?)

3. **Если есть алерты:**
   - ⚠️ Warning: показать водителю, но разрешить сохранить
   - 🔴 Critical: заблокировать сохранение, показать причину

4. **Сохранение:**
   - Запись в `car_expenses`
   - Запись алертов в `fraud_alerts` (если есть)
   - Уведомление менеджеру (если critical)

### 7.3 TCO аналитика
**Расчет:**
```
TCO = Fuel + Maintenance + Repair + Insurance + Penalties + Rental
```

**Метрики:**
- Общий TCO за период
- TCO на км (если есть пробег)
- Разбивка по категориям (pie chart)
- Сравнение с предыдущим периодом (+/- %)
- Топ-3 самых дорогих автомобиля

**Алерты:**
- 🔴 TCO вырос на >30% по сравнению с прошлым месяцем
- ⚠️ Расходы на ремонт >50% от общего TCO
- ℹ️ Автомобиль в аренде дороже собственного

---

## 8. Приоритизация (порядок внедрения)

### Фаза 1: Миграция ролей (1-2 дня)
**Приоритет:** 🔴 Высокий
**Задачи:**
1. Миграция БД: изменить enum ролей
2. Обновить существующие пользователи
3. Обновить UI форм (выбор роли)
4. Обновить отображение ролей (иконки, названия)

**Тестирование:** Проверить что все пользователи мигрировали корректно

---

### Фаза 2: RLS политики по ролям (2-3 дня)
**Приоритет:** 🔴 Высокий
**Задачи:**
1. Создать политики для роли "Просмотр"
2. Обновить политики для роли "Водитель"
3. Обновить политики для "Админ" и "Менеджер"
4. Создать компонент `RoleGuard` для UI

**Тестирование:**
- Проверить что viewer не может создавать/редактировать
- Проверить что driver может только заправки и штрафы
- Проверить что manager не может управлять пользователями

---

### Фаза 3: Анти-фрод система (3-5 дней)
**Приоритет:** 🟡 Средний
**Задачи:**
1. Создать таблицы `fuel_limits` и `fraud_alerts`
2. Добавить поле `driver_id` в `car_expenses`
3. Создать API `/api/car-expenses/validate`
4. Обновить форму заправки (добавить водителя, литры, GPS)
5. Создать страницу алертов для админа/менеджера

**Тестирование:**
- Проверить что лимиты работают
- Проверить что алерты создаются
- Проверить что водитель видит предупреждения

---

### Фаза 4: TCO аналитика (3-4 дня)
**Приоритет:** 🟡 Средний
**Задачи:**
1. Создать API `/api/analytics/tco`
2. Создать компонент `TCOWidget` для dashboard
3. Создать страницу "Подробная аналитика TCO"
4. Добавить графики (Chart.js или Recharts)
5. Добавить экспорт в CSV/PDF

**Тестирование:**
- Проверить расчеты TCO
- Проверить графики
- Проверить экспорт

---

### Фаза 5: Онбординг автомобиля (2-3 дня)
**Приоритет:** 🟢 Низкий (улучшение UX)
**Задачи:**
1. Создать компонент `OnboardingWizard`
2. Реализовать multi-step форму
3. Добавить сохранение черновика
4. Интегрировать с API

**Тестирование:**
- Проверить все шаги
- Проверить валидацию
- Проверить сохранение черновика

---

## 9. Оценка времени и ресурсов

**Общее время:** 11-17 дней (1 разработчик)

**По фазам:**
- Фаза 1 (Миграция ролей): 1-2 дня ✅ Критично
- Фаза 2 (RLS политики): 2-3 дня ✅ Критично
- Фаза 3 (Анти-фрод): 3-5 дней ⚠️ Важно
- Фаза 4 (TCO аналитика): 3-4 дня ⚠️ Важно
- Фаза 5 (Онбординг UX): 2-3 дня ℹ️ Опционально

**Критический путь:**
Фаза 1 → Фаза 2 → Фаза 3 → Фаза 4

**Можно делать параллельно:**
Фаза 4 и Фаза 5 (если 2 разработчика)

---

## 10. Риски и митигация

### Риск 1: Потеря данных при миграции ролей
**Вероятность:** Средняя
**Воздействие:** Критическое
**Митигация:**
- Сделать backup БД перед миграцией
- Протестировать миграцию на копии БД
- Запустить миграцию в нерабочее время

### Риск 2: Ложные срабатывания анти-фрод
**Вероятность:** Высокая
**Воздействие:** Среднее
**Митигация:**
- Настроить разумные лимиты по умолчанию
- Сделать алерты типа "warning" (не блокирующие)
- Дать возможность менеджеру отключить проверки для конкретного автомобиля

### Риск 3: Производительность расчета TCO
**Вероятность:** Низкая
**Воздействие:** Низкое
**Митигация:**
- Использовать кеширование результатов (Redis или Supabase Caching)
- Рассчитывать TCO в фоне (background job)
- Добавить индексы на поля `date`, `vehicle_id` в таблицах расходов

---

## 11. Чек-лист перед запуском

### БД:
- [ ] Миграция ролей выполнена
- [ ] Все пользователи имеют новые роли
- [ ] Таблицы `fuel_limits` и `fraud_alerts` созданы
- [ ] RLS политики обновлены и протестированы
- [ ] Индексы созданы

### Backend:
- [ ] API `/api/car-expenses/validate` работает
- [ ] API `/api/analytics/tco` работает
- [ ] Проверки анти-фрод работают корректно
- [ ] Алерты создаются в БД

### Frontend:
- [ ] Формы обновлены (новые роли)
- [ ] `RoleGuard` компонент используется везде
- [ ] Форма заправки с анти-фрод работает
- [ ] TCO виджет отображается на dashboard
- [ ] Онбординг автомобиля работает (опционально)

### Тестирование:
- [ ] Unit тесты для API
- [ ] E2E тесты для каждой роли
- [ ] Тестирование анти-фрод (разные сценарии)
- [ ] Нагрузочное тестирование TCO API

### Документация:
- [ ] Обновить README с новыми ролями
- [ ] Документировать API endpoints
- [ ] Создать инструкции для пользователей
- [ ] Обучение команды новым процессам

---

## 12. Пример кода (референс)

### Анти-фрод проверка (псевдокод)

```typescript
// app/api/car-expenses/validate/route.ts
export async function POST(request: Request) {
  const { vehicle_id, driver_id, amount, date, liters } = await request.json();

  // 1. Получить лимиты для автомобиля
  const limits = await supabase
    .from('fuel_limits')
    .select('*')
    .eq('vehicle_id', vehicle_id)
    .single();

  const alerts = [];

  // 2. Проверка дневного лимита
  const todayExpenses = await supabase
    .from('car_expenses')
    .select('amount')
    .eq('vehicle_id', vehicle_id)
    .eq('category', 'fuel')
    .gte('date', startOfDay(date));

  const dailyTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0) + amount;

  if (dailyTotal > limits.daily_limit) {
    alerts.push({
      type: 'critical',
      message: `Превышен дневной лимит: ${dailyTotal}€ / ${limits.daily_limit}€`
    });
  } else if (dailyTotal > limits.daily_limit * 0.8) {
    alerts.push({
      type: 'warning',
      message: `Близко к дневному лимиту: ${dailyTotal}€ / ${limits.daily_limit}€`
    });
  }

  // 3. Проверка объема бака
  if (liters > limits.max_tank_capacity) {
    alerts.push({
      type: 'critical',
      message: `Объем превышает бак: ${liters}л / ${limits.max_tank_capacity}л`
    });
  }

  // 4. Проверка частоты
  const lastFuel = await supabase
    .from('car_expenses')
    .select('date')
    .eq('vehicle_id', vehicle_id)
    .eq('category', 'fuel')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (lastFuel) {
    const hoursSince = differenceInHours(new Date(date), new Date(lastFuel.date));
    if (hoursSince < limits.min_interval_hours) {
      alerts.push({
        type: 'warning',
        message: `Слишком частая заправка: ${hoursSince}ч / ${limits.min_interval_hours}ч`
      });
    }
  }

  return Response.json({
    valid: !alerts.some(a => a.type === 'critical'),
    alerts
  });
}
```

---

## Заключение

Этот план является **инструкцией к действию**, а не кодом. Все миграции, API и компоненты нужно будет реализовать последовательно по фазам.

**Рекомендация:** Начать с Фазы 1 (миграция ролей), так как она критична и влияет на все остальные фазы.

**Следующий шаг:** Утверждение плана с командой → Создание задач в трекере → Начало реализации Фазы 1.
