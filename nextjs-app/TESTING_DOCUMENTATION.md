# 🧪 Документация по тестированию Fleet Manager

**Дата:** 2025-10-05
**Версия:** 1.0.0

---

## 📋 Содержание

1. [Обзор тестирования](#обзор-тестирования)
2. [Типы тестов](#типы-тестов)
3. [Настройка окружения](#настройка-окружения)
4. [Запуск тестов](#запуск-тестов)
5. [Покрытие по модулям](#покрытие-по-модулям)
6. [Лучшие практики](#лучшие-практики)

---

## 🎯 Обзор тестирования

Проект использует многоуровневую стратегию тестирования для обеспечения качества и стабильности приложения:

- **Unit тесты** - изолированное тестирование компонентов и функций
- **Integration тесты** - тестирование API routes и взаимодействия модулей
- **E2E тесты** - сквозное тестирование пользовательских сценариев
- **Server Actions тесты** - тестирование серверной логики Next.js

### 📊 Статистика покрытия

- **Общее покрытие:** ~70%
- **Unit тесты:** 10 файлов
- **Integration тесты:** 2 API routes
- **E2E тесты:** 3 критических флоу
- **Server Actions:** 2 модуля

---

## 🔬 Типы тестов

### 1. Unit тесты (Jest + React Testing Library)

**Расположение:** `__tests__/components/`, `__tests__/lib/`

**Что тестируем:**
- React компоненты (Sidebar, Header)
- Утилиты и хелперы
- Supabase клиенты

**Пример:**
```typescript
// __tests__/components/Sidebar.test.tsx
import { render, screen } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';

describe('Sidebar Component', () => {
  it('renders all menu items', () => {
    render(<Sidebar user={mockUser} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

### 2. Integration тесты (Jest)

**Расположение:** `__tests__/api/`

**Что тестируем:**
- API routes (`/api/vehicles`, `/api/vehicle-documents`)
- Взаимодействие с базой данных
- Загрузка файлов
- Аутентификация и авторизация

**Пример:**
```typescript
// __tests__/api/vehicle-documents.test.ts
describe('Vehicle Documents API', () => {
  it('uploads document successfully', async () => {
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

### 3. E2E тесты (Playwright)

**Расположение:** `e2e/`

**Что тестируем:**
- Полные пользовательские сценарии
- Аутентификация (вход/выход)
- CRUD операции (создание, чтение, обновление, удаление)
- Навигация между страницами

**Пример:**
```typescript
// e2e/vehicles.spec.ts
test('should create new vehicle', async ({ page }) => {
  await page.goto('/dashboard/vehicles/new');
  await page.fill('input[name="name"]', 'Test Vehicle');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard/vehicles');
});
```

### 4. Server Actions тесты

**Расположение:** `__tests__/server-actions/`

**Что тестируем:**
- Server Actions для CRUD операций
- Валидация данных
- RLS (Row Level Security) проверки
- Обработка ошибок

---

## ⚙️ Настройка окружения

### Установка зависимостей

```bash
# Jest и React Testing Library
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @types/jest

# Playwright для E2E
npm install -D @playwright/test
```

### Конфигурация Jest

**Файл:** `jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Конфигурация Playwright

**Файл:** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
  },
});
```

### Переменные окружения для тестов

**Файл:** `.env.test`

```bash
# Test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🚀 Запуск тестов

### Unit и Integration тесты

```bash
# Запустить все тесты
npm test

# Запустить в watch режиме
npm test -- --watch

# Запустить с покрытием
npm test -- --coverage

# Запустить конкретный файл
npm test Sidebar.test.tsx
```

### E2E тесты

```bash
# Запустить все E2E тесты
npx playwright test

# Запустить в UI режиме
npx playwright test --ui

# Запустить конкретный файл
npx playwright test e2e/auth.spec.ts

# Запустить с отладкой
npx playwright test --debug
```

### Скрипты в package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm test && npm run test:e2e"
  }
}
```

---

## 📦 Покрытие по модулям

### ✅ Протестированные модули

#### 1. 🚗 Автомобили (Vehicles)
- **Unit тесты:** ❌ Не покрыто (Server Component)
- **Integration тесты:** ✅ DELETE `/api/vehicles/[id]`
- **E2E тесты:** ✅ Полный CRUD цикл
- **Server Actions:** ✅ Create, Update, Delete

**Тестовые сценарии:**
- Создание нового автомобиля
- Просмотр списка автомобилей
- Редактирование автомобиля
- Удаление автомобиля
- Валидация обязательных полей

#### 2. 🚧 Штрафы (Penalties)
- **Unit тесты:** ❌ Не покрыто (Server Component)
- **Integration тесты:** ❌ Не покрыто
- **E2E тесты:** ✅ CRUD + фильтрация
- **Server Actions:** ✅ Create, Update

**Тестовые сценарии:**
- Создание штрафа (без team_id)
- Изменение статуса (open → paid)
- Фильтрация по статусу
- Проверка RLS по organization_id

#### 3. 📄 Документы (Documents)
- **Unit тесты:** ❌ Не покрыто
- **Integration тесты:** ✅ POST `/api/vehicle-documents`
- **E2E тесты:** ❌ Не покрыто
- **Server Actions:** ❌ Не покрыто

**Тестовые сценарии:**
- Загрузка документа
- Проверка аутентификации
- Валидация organization_id

#### 4. 🔐 Авторизация (Auth)
- **Unit тесты:** ❌ Не покрыто
- **Integration тесты:** ❌ Не покрыто
- **E2E тесты:** ✅ Полный флоу
- **Server Actions:** ❌ Не покрыто

**Тестовые сценарии:**
- Вход с корректными данными
- Ошибка при неверных данных
- Выход из системы
- Редирект на dashboard

#### 5. 🧩 Компоненты (Components)
- **Sidebar:** ✅ Полное покрытие
- **Header:** ✅ Полное покрытие
- **Другие:** ❌ Не покрыто

### ⚠️ Непокрытые модули

1. **👥 Бригады (Teams)** - требуются E2E тесты
2. **👤 Пользователи (Users)** - требуются E2E тесты
3. **🔧 Обслуживание (Maintenance)** - все типы тестов
4. **💰 Расходы (Expenses)** - все типы тестов
5. **📊 Аналитика (Analytics)** - визуальные тесты

---

## 🎯 Лучшие практики

### 1. Написание тестов

#### ✅ DO:
```typescript
// Используйте описательные названия
test('should create vehicle with valid data', async () => {
  // ...
});

// Группируйте связанные тесты
describe('Vehicle CRUD', () => {
  test('creates vehicle', () => {});
  test('updates vehicle', () => {});
  test('deletes vehicle', () => {});
});

// Используйте моки для внешних зависимостей
jest.mock('@/lib/supabase/server');
```

#### ❌ DON'T:
```typescript
// Избегайте неясных названий
test('test1', () => {});

// Не тестируйте implementation details
expect(component.state.count).toBe(5);

// Не используйте реальную БД в unit тестах
await supabase.from('vehicles').insert({});
```

### 2. E2E тесты

#### ✅ DO:
```typescript
// Используйте page object pattern
class VehiclePage {
  async createVehicle(name: string) {
    await this.page.fill('[name="name"]', name);
    await this.page.click('button[type="submit"]');
  }
}

// Очищайте данные после тестов
test.afterEach(async () => {
  await cleanupTestData();
});
```

#### ❌ DON'T:
```typescript
// Не используйте фиксированные таймауты
await page.waitForTimeout(5000);

// Не зависьте от порядка тестов
test.serial('test that depends on previous', () => {});
```

### 3. Моки и стабы

```typescript
// Правильное использование моков
const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: [] }),
  }),
};

// Восстановление моков после тестов
afterEach(() => {
  jest.clearAllMocks();
});
```

---

## 🔍 Отладка тестов

### Jest тесты

```bash
# Запустить с расширенным выводом
npm test -- --verbose

# Запустить только failed тесты
npm test -- --onlyFailures

# Показать покрытие
npm test -- --coverage --coverageReporters=text
```

### Playwright тесты

```bash
# Запустить с headed браузером
npx playwright test --headed

# Включить режим отладки
npx playwright test --debug

# Записать trace
npx playwright test --trace on
```

---

## 📊 CI/CD интеграция

### GitHub Actions пример

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 🎯 План развития тестирования

### Краткосрочные цели (1-2 недели):
- [ ] Добавить E2E тесты для Teams
- [ ] Добавить E2E тесты для Users
- [ ] Добавить Integration тесты для всех API routes
- [ ] Увеличить покрытие Server Actions

### Среднесрочные цели (1 месяц):
- [ ] Добавить визуальные регрессионные тесты
- [ ] Настроить автоматический запуск тестов в CI/CD
- [ ] Достичь 80% покрытия кода
- [ ] Добавить performance тесты

### Долгосрочные цели (3 месяца):
- [ ] 100% покрытие критических путей
- [ ] Автоматическое тестирование на разных браузерах
- [ ] Интеграция с инструментами мониторинга
- [ ] A/B тестирование новых функций

---

## 📚 Дополнительные ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)

---

**Последнее обновление:** 2025-10-05
**Автор:** Fleet Manager Team
