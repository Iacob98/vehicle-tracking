# Annual Tax Feature Documentation

## Описание

Функция автоматического создания записей о ежегодном налоге для автомобилей.

## Что было добавлено

### 1. База данных (Migration 011)
**Файл:** `nextjs-app/migrations/011_add_annual_tax_to_vehicles.sql`

Добавлены 3 новых поля в таблицу `vehicles`:
- `annual_tax_amount` (DECIMAL) - Сумма ежегодного налога в EUR
- `tax_due_date` (DATE) - Дата, когда налог должен быть уплачен
- `last_tax_created_date` (DATE) - Дата последнего созданного расхода по налогу

**Constraints:**
- `annual_tax_amount` должен быть положительным или NULL
- Создан индекс `idx_vehicles_tax_due` для быстрого поиска автомобилей с налогами

### 2. Схема валидации
**Файл:** `nextjs-app/lib/schemas/vehicles.schema.ts`

Добавлены поля в Zod схему с валидацией:
- `annual_tax_amount` - optional, positive, max 999999.99
- `tax_due_date` - optional, формат YYYY-MM-DD
- `last_tax_created_date` - optional, формат YYYY-MM-DD

### 3. UI Форма редактирования автомобиля
**Файл:** `nextjs-app/app/dashboard/vehicles/VehicleForm.tsx`

Добавлена секция "💶 Налоговая информация":
- Поле "Ежегодный налог (€)" - число с десятичными знаками
- Поле "Дата платежа налога" - date picker
- Информационный блок показывает дату последнего созданного налога

### 4. API Endpoints
**Файлы:**
- `nextjs-app/app/api/vehicles/route.ts` (POST)
- `nextjs-app/app/api/vehicles/[id]/route.ts` (PUT)

Оба endpoint обрабатывают новые поля:
- Парсят `annual_tax_amount` как float
- Парсят `tax_due_date` как строку
- Сохраняют в базу данных

### 5. Cron Job для автоматического создания налогов
**Файл:** `nextjs-app/app/api/cron/create-annual-taxes/route.ts`

**Логика работы:**
1. Запускается каждый день в 00:00 UTC
2. Находит автомобили где:
   - `annual_tax_amount` установлен (не NULL)
   - `tax_due_date` наступила или прошла (≤ сегодня)
   - Запись за текущий год еще не создана
3. Для каждого автомобиля:
   - Создает `car_expense` с category='tax'
   - Обновляет `last_tax_created_date` на сегодня
   - Обновляет `tax_due_date` на следующий год (+1 год)

**Защита:**
- Authorization header с CRON_SECRET
- Идемпотентность: не создаст дубликатов за один год

### 6. Vercel Cron Configuration
**Файл:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/create-annual-taxes",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Расписание: `0 0 * * *` = каждый день в полночь UTC

## Настройка

### 1. Environment Variables
Добавьте в `.env.local`:

```bash
# Generate secret: openssl rand -base64 32
CRON_SECRET=your_random_secret_here
```

### 2. Vercel Deployment
При деплое на Vercel:

1. Добавьте `CRON_SECRET` в Environment Variables проекта
2. Vercel автоматически настроит cron job из `vercel.json`
3. В настройках проекта Vercel → Settings → Cron Jobs увидите задачу

### 3. Локальное тестирование Cron Job

Для локального тестирования:

```bash
# Установите CRON_SECRET в .env.local
echo "CRON_SECRET=test-secret-123" >> nextjs-app/.env.local

# Запустите сервер
cd nextjs-app && npm run dev

# В другом терминале - вызовите endpoint
curl -H "Authorization: Bearer test-secret-123" \
  http://localhost:3000/api/cron/create-annual-taxes
```

## Использование

### Для пользователей

1. Перейдите на страницу редактирования автомобиля
2. Прокрутите до секции "💶 Налоговая информация"
3. Введите:
   - **Ежегодный налог (€)**: Сумму налога (например, 150.00)
   - **Дата платежа налога**: Дату когда налог нужно платить (например, 2025-03-15)
4. Сохраните изменения

### Что произойдет автоматически

- **Каждый день в 00:00 UTC** система проверит все автомобили
- Если `tax_due_date` наступила, система создаст:
  - Запись в "Расходы на авто" (category='tax')
  - Amount = `annual_tax_amount`
  - Date = `tax_due_date`
  - Description = "Автоматически созданный ежегодный налог..."
- После создания:
  - `last_tax_created_date` обновится на сегодня
  - `tax_due_date` обновится на следующий год

### Пример

**Сегодня:** 15 марта 2025
**Автомобиль:** Mercedes Sprinter (номер XYZ-123)
**annual_tax_amount:** 180.50€
**tax_due_date:** 2025-03-15
**last_tax_created_date:** NULL (или 2024-03-01)

**Что произойдет:**
1. Cron job создаст car_expense:
   - vehicle_id: Mercedes Sprinter
   - category: tax
   - amount: 180.50
   - date: 2025-03-15
   - description: "Автоматически созданный ежегодный налог..."
2. Обновит vehicle:
   - last_tax_created_date: 2025-03-15
   - tax_due_date: 2026-03-15

**На следующий год (2026-03-15):** процесс повторится автоматически.

## Мониторинг

### Проверка логов Vercel Cron
1. Vercel Dashboard → Project → Logs
2. Фильтр: `/api/cron/create-annual-taxes`
3. Смотрите результаты выполнения:
   - `succeeded`: количество успешно созданных записей
   - `failed`: список ошибок

### Проверка записей в БД

```sql
-- Проверить автомобили с налогами
SELECT
  id, name, license_plate,
  annual_tax_amount,
  tax_due_date,
  last_tax_created_date
FROM vehicles
WHERE annual_tax_amount IS NOT NULL
ORDER BY tax_due_date;

-- Проверить созданные записи о налогах
SELECT
  ce.id, ce.date, ce.amount, ce.description,
  v.name as vehicle_name, v.license_plate
FROM car_expenses ce
JOIN vehicles v ON v.id = ce.vehicle_id
WHERE ce.category = 'tax'
ORDER BY ce.date DESC;
```

## Troubleshooting

### Cron job не создает записи
1. Проверьте `CRON_SECRET` в Vercel Environment Variables
2. Проверьте что `tax_due_date` ≤ сегодня
3. Проверьте что `annual_tax_amount` не NULL
4. Проверьте логи Vercel для ошибок

### Дубликаты записей
- Cron job **не создаст** дубликаты за один год благодаря проверке `last_tax_created_date`
- Если `last_tax_created_date` уже в текущем году, запись не создастся

### Ручное создание записи
Если нужно создать запись вручную:
1. Перейдите в "Расходы на авто"
2. Создайте новую запись с category='tax'
3. Не забудьте обновить `last_tax_created_date` в автомобиле

## Архитектура

```
┌─────────────────┐
│  VehicleForm    │ ← Пользователь вводит annual_tax_amount
│  (UI)           │   и tax_due_date
└────────┬────────┘
         │ FormData
         ▼
┌─────────────────┐
│  POST/PUT       │ ← Валидация Zod Schema
│  /api/vehicles  │   Сохранение в БД
└─────────────────┘

┌─────────────────┐
│  Vercel Cron    │ ← Запускается каждый день 00:00 UTC
│  (Scheduler)    │
└────────┬────────┘
         │ HTTP GET + Authorization
         ▼
┌─────────────────────────────┐
│  GET /api/cron/             │
│  create-annual-taxes        │
│                             │
│  1. Find vehicles with tax  │
│  2. Create car_expense      │
│  3. Update vehicle dates    │
└─────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
│  - vehicles     │
│  - car_expenses │
└─────────────────┘
```

## Дальнейшие улучшения (опционально)

1. **Email уведомления**: Отправлять email админу о созданных налогах
2. **Dashboard виджет**: Показывать предстоящие налоги на главной странице
3. **История налогов**: Отдельная страница со всеми налоговыми платежами
4. **Настройка даты**: Позволить настроить сколько дней до due date создавать запись
5. **Webhook интеграция**: Интеграция с бухгалтерскими системами

## Версии

- **v1.0** (2025-11-06): Первая реализация
  - Базовая функциональность автоматического создания
  - UI для ввода данных
  - Cron job с ежедневным запуском
