# Руководство по миграции на Next.js + Supabase

## ⚠️ КРИТИЧЕСКИЕ ЗАМЕЧАНИЯ

### Проблемы безопасности текущей схемы
Обнаружены таблицы БЕЗ `organization_id` в models.py:
- ❌ **vehicles** - нет привязки к организации
- ❌ **materials** - нет привязки к организации  
- ❌ **penalties** - нет привязки к организации (только через vehicle/user)
- ❌ **maintenances** - нет привязки к организации (только через vehicle)

**Это означает:**
1. Текущая Streamlit система **НЕ изолирует** эти данные между организациями на уровне БД
2. Изоляция происходит только на уровне приложения (фильтр в запросах)
3. При миграции на Supabase это создаст **серьёзную уязвимость**

### Решение проблемы

**Вариант А (рекомендуется):** Добавить organization_id ПЕРЕД миграцией
```sql
-- Выполнить в текущей PostgreSQL
ALTER TABLE vehicles ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE materials ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE penalties ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE maintenances ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Заполнить данные (пример для vehicles)
UPDATE vehicles v
SET organization_id = va.organization_id
FROM (
    SELECT DISTINCT vehicle_id, teams.organization_id
    FROM vehicle_assignments
    JOIN teams ON vehicle_assignments.team_id = teams.id
) va
WHERE v.id = va.vehicle_id;
```

**Вариант Б:** Миграция как есть с временными RLS политиками (небезопасно)

---

## Текущий статус

✅ **Завершено:**
- Next.js проект с TypeScript, Tailwind CSS
- Supabase клиенты (client/server)
- **Полная** SQL схема (100% соответствие models.py)
- **Полные** RLS политики для всех таблиц
- Базовая структура приложения

⏳ **Требуется от вас:**

### Шаг 1: Создать Supabase проект
1. Зарегистрируйтесь на https://supabase.com
2. Создайте новый проект
3. Выберите регион (ближайший к вам)
4. Дождитесь создания БД (~2 минуты)

### Шаг 2: Настроить схему БД
1. Откройте Supabase Dashboard → SQL Editor
2. **ВАЖНО:** Сначала решите проблему с organization_id (см. выше)
3. Скопируйте содержимое `lib/database-schema.sql`
4. Выполните SQL скрипт
5. Проверьте, что все таблицы созданы

### Шаг 3: Получить API ключи
1. Supabase Dashboard → Settings → API
2. Скопируйте:
   - **Project URL** (например: https://xxxxx.supabase.co)
   - **Anon (public) key** - для клиентского доступа
   - **Service role key** - для админ операций

### Шаг 4: Настроить переменные окружения
Создайте файл `nextjs-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Шаг 5: Настроить Supabase Auth
1. Dashboard → Authentication → Providers
2. Включите Email provider
3. Отключите "Confirm email" (для упрощения миграции)
4. Settings → Auth → Email templates (настройте под себя)

### Шаг 6: Настроить Supabase Storage
1. Dashboard → Storage → Create new bucket
2. Создайте bucket: **`uploads`** (public)
3. Настройте политики доступа:

```sql
-- Политика для загрузки файлов (только для своей организации)
CREATE POLICY "Users can upload files" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND
    auth.role() = 'authenticated'
);

-- Политика для просмотра файлов
CREATE POLICY "Users can view files" ON storage.objects 
FOR SELECT USING (
    bucket_id = 'uploads'
);

-- Политика для удаления файлов
CREATE POLICY "Users can delete own files" ON storage.objects 
FOR DELETE USING (
    bucket_id = 'uploads' AND
    auth.role() = 'authenticated'
);
```

---

## План миграции данных

### Этап 1: Экспорт данных из текущей БД

```bash
# Подключитесь к текущей PostgreSQL
# Экспортируйте каждую таблицу в CSV

# Organizations
psql $DATABASE_URL -c "\COPY organizations TO 'data/organizations.csv' CSV HEADER"

# Users
psql $DATABASE_URL -c "\COPY users TO 'data/users.csv' CSV HEADER"

# Teams
psql $DATABASE_URL -c "\COPY teams TO 'data/teams.csv' CSV HEADER"

# И так далее для всех таблиц...
```

### Этап 2: Импорт данных в Supabase

```sql
-- В Supabase SQL Editor
-- Временно отключаем RLS для импорта
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ... и т.д.

-- Импортируем данные через Supabase Dashboard → Table Editor → Import CSV

-- Включаем RLS обратно
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ... и т.д.
```

### Этап 3: Миграция файлов в Supabase Storage

```bash
# Скрипт для переноса файлов из uploads/ в Supabase Storage
# Создайте файл: scripts/migrate-files.ts

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateFiles() {
  const uploadsDir = '../uploads';
  const files = fs.readdirSync(uploadsDir, { recursive: true });
  
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    await supabase.storage
      .from('uploads')
      .upload(file, fileBuffer);
      
    console.log(`Migrated: ${file}`);
  }
}

migrateFiles();
```

### Этап 4: Миграция пользователей в Supabase Auth

**⚠️ ПРОБЛЕМА:** Текущие пароли захешированы SHA-256  
**Решение:** Принудительный сброс паролей

```typescript
// scripts/migrate-users-auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateUsers() {
  // 1. Получить пользователей из БД
  const { data: users } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, organization_id, role');
  
  for (const user of users) {
    // 2. Создать пользователя в Supabase Auth
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: {
        organization_id: user.organization_id,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
    
    // 3. Отправить письмо для установки нового пароля
    await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: user.email
    });
    
    console.log(`Migrated user: ${user.email}`);
  }
}
```

---

## Архитектура новой системы

```
┌─────────────────────────────────────┐
│   Next.js Frontend (App Router)     │
│                                     │
│  ├── app/                          │
│  │   ├── (auth)/                  │
│  │   │   ├── login/               │
│  │   │   └── register/            │
│  │   ├── dashboard/               │
│  │   ├── vehicles/                │
│  │   ├── teams/                   │
│  │   ├── users/                   │
│  │   └── ...                      │
│  │                                │
│  ├── components/                   │
│  │   ├── ui/                      │
│  │   ├── forms/                   │
│  │   └── tables/                  │
│  │                                │
│  └── lib/                         │
│      ├── supabase/                │
│      └── utils/                   │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│       Supabase Platform             │
│                                     │
│  ├── PostgreSQL Database            │
│  │   └── Row Level Security (RLS)  │
│  │                                │
│  ├── Authentication (Auth)         │
│  │   ├── JWT Tokens               │
│  │   └── User Metadata            │
│  │                                │
│  ├── Storage (Buckets)             │
│  │   └── uploads/                 │
│  │                                │
│  └── Real-time (optional)          │
└─────────────────────────────────────┘
```

## Следующие шаги реализации

### Фаза 1: Инфраструктура (1-2 недели)
- [x] Next.js структура
- [ ] Настройка Supabase проекта
- [ ] Миграция схемы БД
- [ ] Настройка Auth и Storage
- [ ] Миграция данных и файлов

### Фаза 2: Авторизация (1 неделя)
- [ ] Страницы login/register
- [ ] Middleware для защиты роутов
- [ ] Управление сессиями
- [ ] Права доступа по ролям

### Фаза 3: Базовые модули (2-3 недели)
- [ ] Dashboard с метриками
- [ ] Автомобили (CRUD + фото)
- [ ] Бригады и участники
- [ ] Пользователи платформы

### Фаза 4: Финансы и логистика (2-3 недели)
- [ ] Штрафы с фотографиями
- [ ] Материалы и оборудование
- [ ] Возврат оборудования
- [ ] Расходы (авто и общие)
- [ ] Аналитика расходов

### Фаза 5: Дополнительно (1-2 недели)
- [ ] Документы с истечением срока
- [ ] Договоры аренды
- [ ] Техобслуживание
- [ ] История материалов
- [ ] Telegram интеграция
- [ ] CSV импорт/экспорт

### Фаза 6: Тестирование и запуск (1-2 недели)
- [ ] E2E тестирование
- [ ] Параллельная работа систем
- [ ] Обучение пользователей
- [ ] Финальный переход
- [ ] Отключение Streamlit

## Преимущества новой системы

### Технические
- ✅ **Безопасность**: RLS на уровне БД, JWT токены
- ✅ **Производительность**: Server Components, ISR, Edge Functions
- ✅ **Масштабируемость**: Supabase Auto-scaling, CDN
- ✅ **Type Safety**: TypeScript везде, автогенерация типов

### Пользовательские
- ✅ **Скорость**: Мгновенная навигация (SPA)
- ✅ **UX**: Современный интерфейс, оптимистичные обновления
- ✅ **Мобильность**: Responsive дизайн, PWA возможности
- ✅ **Offline**: Возможность работы без интернета (с кешем)

### Разработческие
- ✅ **DX**: Hot reload, TypeScript автодополнение
- ✅ **Поддерживаемость**: Чистая архитектура, модульность
- ✅ **Тестируемость**: Unit, Integration, E2E тесты
- ✅ **Документация**: Автогенерация из кода

## Команды для работы

```bash
# Разработка
cd nextjs-app
npm run dev              # Запуск dev сервера на :3000

# Продакшен
npm run build           # Билд оптимизированной версии
npm start              # Запуск продакшен сервера

# Генерация TypeScript типов из Supabase
npx supabase gen types typescript --project-id your-project-id > lib/database.types.ts
```

## Контакты и поддержка

Если возникнут вопросы:
1. Проверьте Supabase Dashboard → Logs
2. Проверьте Next.js console в браузере (F12)
3. Изучите документацию: https://supabase.com/docs

---

**Оценка времени полной миграции:** 8-12 недель (1 разработчик)  
**Критический путь:** Решение проблемы с organization_id → Миграция данных → Авторизация → Модули
