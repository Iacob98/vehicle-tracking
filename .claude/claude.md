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
- **Роли:** owner, admin, manager, team_lead, driver (worker deprecated)
- **User metadata** содержит `organization_id` и `role`
- Функция `getOrganizationId()` извлекает organization_id из auth.users.raw_user_meta_data

#### 3. API Routes Pattern
```typescript
// Все API routes следуют этому паттерну:
export async function GET(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const organizationId = await getOrganizationId();
  if (!organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

  // Query with organization_id filter
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('organization_id', organizationId);

  // Always return standardized responses
  return NextResponse.json({ data, error });
}
```

#### 4. Database Schema
- См. `lib/database-schema.sql` для полной схемы
- Основные таблицы: organizations, users, vehicles, teams, team_members, vehicle_assignments, vehicle_documents, penalties, expenses, maintenance
- Все миграции нумерованы: `00X_description.sql` в папке `migrations/`

#### 5. Storage (Supabase)
- **Buckets:** `vehicles` (vehicle photos), `documents` (documents), `penalties` (penalty photos)
- RLS политики защищают файлы по organization_id
- Используй `lib/storage.ts` для работы с файлами

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

<RoleGuard allowedRoles={['owner', 'admin']}>
  <AdminOnlyContent />
</RoleGuard>
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

### Дополнительные ресурсы

- **Миграционный гайд:** `nextjs-app/MIGRATION_GUIDE.md`
- **Database schema:** `nextjs-app/lib/database-schema.sql`
- **RLS Security notes:** `nextjs-app/lib/RLS_SECURITY_NOTES.md`
- **Testing docs:** `nextjs-app/TESTING_DOCUMENTATION.md`
