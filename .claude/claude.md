# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Vehicle Tracking System - Проект на Next.js + Supabase

## Обязательная синхронизация с Git/GitHub

### После КАЖДОГО завершенного действия:

1. **Создавай коммит** в Git с подробным описанием изменений
2. **Делай push** в GitHub для синхронизации
3. **Все описания коммитов на РУССКОМ языке**

### Когда делать коммит и push:

- ✅ После исправления бага
- ✅ После добавления новой функции
- ✅ После рефакторинга кода
- ✅ После обновления документации
- ✅ После настройки конфигурации
- ✅ После изменения зависимостей
- ✅ После создания/изменения тестов
- ✅ После любого значимого изменения кода

### Формат коммитов (на русском):

```
<Тип>: <Краткое описание на русском>

<Детальное описание что и зачем было сделано>

<Опционально: примечания, ссылки, breaking changes>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Типы коммитов:

- **Добавлено:** - новая функциональность
- **Исправлено:** - исправление багов
- **Изменено:** - изменение существующей функциональности
- **Удалено:** - удаление функциональности
- **Рефакторинг:** - улучшение кода без изменения функциональности
- **Документация:** - изменения в документации
- **Тесты:** - добавление или изменение тестов
- **Настройка:** - изменение конфигурации
- **Безопасность:** - исправления безопасности
- **Производительность:** - улучшение производительности

### Примеры коммитов:

```
Исправлено: RLS политики для защиты от cross-tenant утечек

- Добавлены политики проверки organization_id для всех таблиц
- Добавлены тесты для проверки изоляции данных
- Обновлена документация по безопасности

Исправляет критическую уязвимость #1

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
Добавлено: Storage RLS политики для защиты файлов

- Настроены RLS политики для всех storage buckets
- Добавлены тесты загрузки и скачивания файлов
- Обновлен README с инструкциями по настройке Storage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Workflow для каждой задачи:

1. **Понять задачу** - убедиться что понятно что нужно сделать
2. **Спланировать** - использовать TodoWrite для планирования шагов
3. **Реализовать** - выполнить изменения
4. **Проверить** - убедиться что работает
5. **Закоммитить и запушить** - сохранить прогресс на GitHub
6. **Отчитаться** - сообщить пользователю о выполнении

## Команды Git:

### Проверка статуса перед коммитом:
```bash
git status
git diff
```

### Коммит и push:
```bash
git add .
git commit -m "$(cat <<'EOF'
<Тип>: <Описание на русском>

<Детали>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
git push
```

### При конфликтах:
```bash
git pull --rebase
# Разрешить конфликты
git add .
git rebase --continue
git push
```

## Специальные правила для проекта

### Next.js приложение:
- Всегда тестировать локально перед коммитом: `npm run build`
- Проверять TypeScript ошибки: `npm run type-check` (если настроено)
- Проверять линтинг: `npm run lint`

### База данных:
- Миграции всегда коммитить отдельно
- Тестировать миграции на тестовой базе
- Документировать изменения схемы в MIGRATION_*.md

### Безопасность:
- НИКОГДА не коммитить .env файлы с реальными ключами
- Проверять .gitignore перед каждым коммитом
- Проверять что SERVICE_ROLE_KEY не попал в код

### Документация:
- Обновлять README.md при добавлении новых функций
- Обновлять NEXT_STEPS.md по мере выполнения задач
- Создавать отчеты о завершенных задачах

## Примеры рабочих процессов

### Исправление бага:

```
1. Воспроизвести баг
2. Найти причину
3. Исправить код
4. Протестировать исправление
5. git add . && git commit -m "Исправлено: <описание>" && git push
6. Отчитаться пользователю
```

### Добавление функции:

```
1. Создать TodoWrite список задач
2. Реализовать функцию по частям
3. После каждой части: git commit && git push
4. Обновить документацию
5. git commit && git push документацию
6. Отчитаться пользователю
```

### Рефакторинг:

```
1. Убедиться что есть тесты (или написать)
2. Провести рефакторинг
3. Запустить тесты
4. git commit && git push
5. Отчитаться пользователю
```

## Язык общения

- **С пользователем:** русский язык
- **В коде:** английский (переменные, функции, комментарии)
- **В коммитах:** РУССКИЙ язык (обязательно!)
- **В документации:** русский язык

## Недопустимые действия

❌ НЕ делать множественные изменения в одном коммите без описания
❌ НЕ забывать делать push после коммита
❌ НЕ коммитить без тестирования
❌ НЕ использовать английский в сообщениях коммитов
❌ НЕ оставлять незакоммиченные изменения в конце задачи

## Обработка ошибок

Если push не удался:
1. Проверить подключение к GitHub
2. Проверить права доступа
3. Сделать pull с rebase
4. Разрешить конфликты
5. Повторить push
6. Сообщить пользователю о проблеме

---

**Главное правило:** После КАЖДОГО завершенного действия - коммит и push на GitHub с подробным описанием на русском языке!

---

## Архитектура и структура проекта

### Технологический стек
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS, shadcn/ui (Radix UI components)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Testing:** Jest (unit), Playwright (e2e)
- **Forms:** React Hook Form + Zod validation

### Структура директорий

```
nextjs-app/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── vehicles/             # Vehicle CRUD
│   │   ├── upload/               # File upload
│   │   └── [other resources]/
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── vehicles/             # Vehicle management
│   │   ├── teams/                # Team management
│   │   ├── users/                # User management
│   │   ├── documents/            # Document management
│   │   ├── penalties/            # Penalties
│   │   ├── expenses/             # Expenses tracking
│   │   ├── maintenance/          # Maintenance records
│   │   ├── analytics/            # Analytics dashboard
│   │   └── [other modules]/
│   ├── login/                    # Login page
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── Header.tsx                # Dashboard header with role display
│   ├── Sidebar.tsx               # Navigation sidebar
│   ├── RoleGuard.tsx             # Role-based access control
│   ├── ErrorBoundary.tsx         # Error handling
│   ├── DeleteButton.tsx          # Delete with confirmation
│   └── [other shared components]
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Client-side Supabase client
│   │   ├── server.ts             # Server-side Supabase client
│   │   └── middleware.ts         # Auth middleware (deprecated)
│   ├── auth/
│   │   └── roles.ts              # Role definitions and checks
│   ├── schemas/                  # Zod validation schemas
│   ├── types/                    # TypeScript type definitions
│   ├── database.types.ts         # Supabase generated types
│   ├── api-client.ts             # API client utilities
│   ├── api-response.ts           # API response helpers
│   ├── storage.ts                # Supabase Storage helpers
│   ├── errors.ts                 # Error handling utilities
│   └── utils.ts                  # General utilities
│
├── migrations/                   # Database migration scripts (numbered)
├── scripts/                      # Utility scripts (e.g., create driver)
├── __tests__/                    # Jest unit tests
├── e2e/                          # Playwright e2e tests
├── middleware.ts                 # Next.js middleware for auth
└── [config files]
```

### Ключевые концепции архитектуры

#### 1. Multi-tenant архитектура
- **Каждая запись привязана к `organization_id`**
- Row Level Security (RLS) политики на уровне БД обеспечивают изоляцию данных
- КРИТИЧНО: Всегда проверяй что новые таблицы имеют `organization_id` и RLS политики

#### 2. Аутентификация и авторизация
- **Supabase Auth** управляет пользователями и сессиями
- **Middleware** (`middleware.ts`) защищает роуты `/dashboard/*`
- **Упрощенные роли (4 типа):**
  - `admin` 👑 - Полный доступ (управление пользователями, все операции)
  - `manager` 💼 - Управление операциями и аналитика
  - `driver` 🚗 - Заправки, штрафы, документы
  - `viewer` 👁️ - Только чтение данных
- **User metadata** содержит `organization_id` и `role`
- Функция `getOrganizationId()` извлекает organization_id из auth.users.raw_user_meta_data

#### 3. API Routes Pattern (Стандартизированный)
```typescript
// Все API routes следуют этому паттерну:
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  checkAuthentication,
  checkOrganizationId
} from '@/lib/api-response';
import { Permissions, type UserRole } from '@/lib/types/roles';

export async function POST(request: Request) {
  try {
    // 1. Создание Supabase клиента
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // 3. Получение organization_id
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // 4. Проверка прав доступа
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на создание автомобилей');
    }

    // 5. Бизнес-логика
    const data = await request.json();
    const { data: result, error } = await supabase
      .from('table_name')
      .insert({ organization_id: orgId, ...data })
      .select()
      .single();

    if (error) throw error;

    // 6. Стандартизированный ответ
    return apiSuccess({ item: result });
  } catch (error) {
    return apiErrorFromUnknown(error, { context: 'POST /api/resource' });
  }
}
```

**Ключевые принципы API:**
- ✅ Всегда используй `checkAuthentication()` и `checkOrganizationId()`
- ✅ Проверяй права доступа через `Permissions` API
- ✅ Используй стандартизированные ответы: `apiSuccess()`, `apiBadRequest()`, `apiForbidden()`
- ✅ Оборачивай в try-catch и используй `apiErrorFromUnknown()`
- ✅ Всегда добавляй `organization_id` в INSERT/UPDATE операции

#### 4. Database Schema
- См. `lib/database-schema.sql` для полной схемы
- **Основные таблицы (12 шт.):**
  1. `organizations` - организации (компании)
  2. `users` - пользователи с аккаунтами (связаны с Supabase Auth)
  3. `teams` - бригады
  4. `team_members` - работники бригад (без аккаунтов)
  5. `vehicles` - транспортные средства
  6. `vehicle_assignments` - назначение авто на бригады
  7. `vehicle_documents` - документы на авто
  8. `penalties` - штрафы
  9. `car_expenses` - расходы на автомобили (fuel, repair, maintenance, insurance, other)
  10. `maintenances` - обслуживание (inspection, repair)
  11. `expenses` - общие расходы (устаревшая, использовать car_expenses)
  12. `rental_contracts` - договоры аренды
- **Все миграции нумерованы:** `00X_description.sql` в папке `migrations/` (сейчас 012 миграций)
- **User documents:** `user_documents` - документы пользователей
- **Team member documents:** `team_member_documents` - документы членов бригад

#### 5. Storage (Supabase)
- **4 Buckets настроены:**
  1. `vehicles` - фотографии автомобилей (публичный)
  2. `documents` - документы (приватный)
  3. `penalties` - фото постановлений о штрафах (приватный)
  4. `expenses` - чеки расходов (приватный)
- **RLS политики** защищают файлы по organization_id
- **API для работы с файлами** (`lib/storage.ts`):
  ```typescript
  // Загрузка файла
  await uploadFile(file, 'vehicles', orgId)

  // Загрузка нескольких файлов
  await uploadMultipleFiles(files, 'vehicles', orgId)

  // Удаление файла
  await deleteFile(url, 'vehicles')
  ```
- **Важно:** Все загрузки идут через API endpoint `/api/upload` (Service Role Key) для обхода RLS

#### 6. Type Safety
- `lib/database.types.ts` - сгенерированные типы из Supabase схемы
- Zod схемы в `lib/schemas/` для валидации форм
- Все API responses типизированы через `api-response.ts`

### Команды для разработки

```bash
# Рабочая директория
cd nextjs-app

# Разработка
npm run dev              # Dev сервер на localhost:3000

# Тестирование
npm run lint             # ESLint проверка
npm test                 # Jest unit tests
npm run test:watch       # Jest в watch режиме
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright e2e tests
npm run test:e2e:ui      # Playwright UI mode
npm run test:all         # Все тесты

# Production
npm run build            # Production build
npm start                # Production сервер на localhost:3000
```

### Database Migrations

```bash
# Подключение к Supabase PostgreSQL
PGPASSWORD="Iasaninja1973.." psql -h aws-0-eu-central-1.pooler.supabase.com \
  -p 6543 -U postgres.wymucemxzhaulibsqdta -d postgres

# Выполнение миграции
PGPASSWORD="Iasaninja1973.." psql -h aws-0-eu-central-1.pooler.supabase.com \
  -p 6543 -U postgres.wymucemxzhaulibsqdta -d postgres \
  -f nextjs-app/migrations/XXX_migration_name.sql

# Проверка таблиц
PGPASSWORD="Iasaninja1973.." psql -h aws-0-eu-central-1.pooler.supabase.com \
  -p 6543 -U postgres.wymucemxzhaulibsqdta -d postgres \
  -c "\d table_name"
```

### Важные паттерны кода

#### Server Components (по умолчанию)
```typescript
// app/dashboard/vehicles/page.tsx
import { createServerClient } from '@/lib/supabase/server';

export default async function VehiclesPage() {
  const supabase = await createServerClient();
  const { data } = await supabase.from('vehicles').select('*');
  return <VehiclesList vehicles={data} />;
}
```

#### Client Components (для интерактивности)
```typescript
'use client';

import { createBrowserClient } from '@/lib/supabase/client';
```

#### RoleGuard использование
```typescript
import { RoleGuard } from '@/components/RoleGuard';

<RoleGuard allowedRoles={['admin', 'manager']} userRole={currentUser.role}>
  <AdminOnlyContent />
</RoleGuard>
```

#### Permissions API (проверка прав доступа)
```typescript
import { Permissions, type UserRole } from '@/lib/types/roles';

// Проверки в коде:
Permissions.canManageVehicles(role)      // admin, manager
Permissions.canManageTeams(role)         // admin, manager
Permissions.canManageUsers(role)         // только admin
Permissions.canAddExpenses(role)         // admin, manager, driver
Permissions.canAddPenalties(role)        // admin, manager, driver
Permissions.canViewAnalytics(role)       // все кроме viewer
Permissions.canEdit(role)                // все кроме viewer
Permissions.canDelete(role)              // admin, manager
```

### Проблемы безопасности

⚠️ **КРИТИЧНО при добавлении новых таблиц:**
1. Добавь колонку `organization_id UUID REFERENCES organizations(id)`
2. Создай RLS политики для SELECT/INSERT/UPDATE/DELETE
3. Убедись что политики проверяют `organization_id`
4. Тестируй изоляцию данных между организациями

⚠️ **НЕ коммить:**
- `.env.local` с реальными ключами (проверяй `.gitignore`)
- `SUPABASE_SERVICE_ROLE_KEY` в коде
- Пароли и секреты

### Debugging

```typescript
// Включено логирование в middleware.ts и lib/supabase/server.ts
// Проверяй консоль браузера (F12) и терминал dev сервера
```

### Основные модули приложения

#### 1. 🚗 Vehicles (Транспорт)
**Файлы:** `app/dashboard/vehicles/`, `app/api/vehicles/`
**Функционал:**
- ✅ CRUD операции с авто
- ✅ Поиск по name, license_plate, vin
- ✅ Фильтр по статусу (active, repair, unavailable, rented)
- ✅ Smart sorting (1, 2, 3... вместо 1, 10, 11...)
- ✅ Пагинация (20 на страницу)
- ✅ Загрузка фотографий (multiple files)
- ✅ Поддержка аренды (rental contracts)

#### 2. 👷 Teams (Бригады)
**Файлы:** `app/dashboard/teams/`, `app/api/teams/`
**Функционал:**
- ✅ Создание и управление бригадами
- ✅ Назначение лидера бригады
- ✅ Управление членами бригады (team_members)
- ✅ Назначение автомобилей на бригады (vehicle_assignments)
- ✅ Документы членов бригады

#### 3. 👤 Users (Пользователи)
**Файлы:** `app/dashboard/users/`, `app/api/users/`
**Функционал:**
- ✅ CRUD операции (только admin)
- ✅ Назначение ролей (admin, manager, driver, viewer)
- ✅ Привязка к бригадам
- ✅ Документы пользователей
- ✅ Синхронизация с Supabase Auth

#### 4. 🚧 Penalties (Штрафы)
**Файлы:** `app/dashboard/penalties/`, `app/api/penalties/`
**Функционал:**
- ✅ Регистрация штрафов
- ✅ Статусы (open, paid)
- ✅ Загрузка фото постановлений
- ✅ Привязка к автомобилю и водителю
- ✅ Пагинация и поиск

#### 5. 🚗💰 Car Expenses (Расходы на авто)
**Файлы:** `app/dashboard/car-expenses/`, `app/api/car-expenses/`
**Функционал:**
- ✅ Категории (fuel, repair, maintenance, insurance, other)
- ✅ Загрузка чеков (фото)
- ✅ Привязка к обслуживанию (maintenance_id)
- ✅ Статистика по авто
- ✅ Фильтрация по дате и категории

#### 6. 🔧 Maintenance (Обслуживание)
**Файлы:** `app/dashboard/maintenance/`, `app/api/maintenance/`
**Функционал:**
- ✅ Типы (inspection, repair)
- ✅ Загрузка актов обслуживания
- ✅ История обслуживания по авто
- ✅ Связь с расходами (car_expenses)

#### 7. 📄 Documents (Документы)
**Файлы:** `app/dashboard/documents/`
**Функционал:**
- ✅ Документы на авто (vehicle_documents)
- ✅ Документы пользователей (user_documents)
- ✅ Документы членов бригад (team_member_documents)
- ✅ Отслеживание истекающих документов (30 дней)
- ✅ Типы документов и сроки действия
- ✅ Пагинация и фильтрация

#### 8. 📊 Dashboard (Главная панель)
**Файлы:** `app/dashboard/page.tsx`
**Функционал:**
- ✅ Статистика (кол-во авто, бригад, штрафов)
- ✅ Истекающие документы (предупреждение)
- ✅ Быстрые действия
- ✅ Адаптивный дизайн

### Дополнительные ресурсы

- **Миграционный гайд:** `nextjs-app/MIGRATION_GUIDE.md`
- **Database schema:** `nextjs-app/lib/database-schema.sql`
- **RLS Security notes:** `nextjs-app/lib/RLS_SECURITY_NOTES.md`
- **Testing docs:** `nextjs-app/TESTING_DOCUMENTATION.md`

---

## 📊 Статистика проекта

- **262+** TypeScript файлов
- **91** dashboard компонентов
- **18** API модулей
- **15** dashboard модулей
- **12** миграций БД
- **12** основных таблиц
- **4** роли пользователей
- **4** storage buckets
- **~95%** функциональности готово

---

## 🎯 Текущий статус и приоритеты

### ✅ Что работает отлично:
1. **Безопасность:** RLS на всех таблицах, Storage RLS, multi-tenant изоляция
2. **Архитектура:** SSR, типобезопасность, централизованная обработка ошибок
3. **Функционал:** Полный CRUD, поиск, фильтрация, пагинация, загрузка файлов
4. **DX:** Hot reload, TypeScript, ESLint, документация

### 🔄 В процессе:
1. **RoleGuard защита** - активно внедряется во все модули
2. **E2E тесты** - настроены, требуется расширение сценариев
3. **Analytics** - модуль в разработке

### 📋 TODO (Приоритеты):
1. **Высокий приоритет:**
   - [ ] Добавить мониторинг ошибок (Sentry)
   - [ ] Оптимизировать SQL запросы (индексы)
   - [ ] Добавить loading states и skeleton loaders
   - [ ] Toast notifications для действий

2. **Средний приоритет:**
   - [ ] React Query для кеширования
   - [ ] Экспорт данных (CSV, PDF)
   - [ ] Email уведомления (истекающие документы)
   - [ ] Telegram bot интеграция

3. **Низкий приоритет:**
   - [ ] Аналитика использования
   - [ ] Dark mode
   - [ ] Локализация (i18n)
