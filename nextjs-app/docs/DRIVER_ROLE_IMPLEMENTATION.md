# Реализация роли "Водитель" (Driver)

## ✅ Выполнено (Backend & Database)

### 1. Структура базы данных

#### Добавлены категории расходов:
- `fuel` - Заправка
- `repair` - Ремонт
- `maintenance` - Техобслуживание
- `insurance` - Страховка
- `other` - Прочее
- **`fine`** - Штрафы ⭐ (НОВОЕ)

#### Расширена таблица `car_expenses`:
```sql
ALTER TABLE car_expenses ADD COLUMN:
- liters NUMERIC(10,2)              -- Литры залитого топлива
- odometer_reading INTEGER          -- Показания одометра (км)
- odometer_photo_url VARCHAR(500)   -- URL фото одометра
- created_by_user_id UUID           -- ID создателя (водитель)
```

#### Таблица `users`:
- Поле `team_id` связывает водителя с бригадой
- Поле `role` определяет права доступа (driver, admin, manager, viewer)

#### Таблица `vehicle_assignments`:
- Связывает автомобили с бригадами
- Поле `end_date = NULL` означает активное назначение

### 2. RLS Политики безопасности

#### Функции безопасности:
```sql
-- Получение роли текущего пользователя
get_user_role() -> user_role

-- Получение ID бригады пользователя
get_user_team_id() -> UUID

-- Проверка доступа к автомобилю
user_has_access_to_vehicle(vehicle_uuid) -> BOOLEAN
```

#### Политики для `vehicles`:
- **SELECT**: Водители видят только авто, назначенные их бригаде
- **INSERT/UPDATE/DELETE**: Только админы и менеджеры

#### Политики для `car_expenses`:
- **SELECT**: Водители видят только расходы по своим авто
- **INSERT**: Водители могут добавлять расходы только для своих авто
- **UPDATE**: Водители могут редактировать только свои записи
- **DELETE**: Только админы и менеджеры

### 3. Тестовые данные

```
Водитель:
  Email: vod@gmail.com
  Password: Admin12345
  Role: driver
  Team: brigada 1
  Assigned Vehicle: "1" (B-FD 5555)
```

## 🔨 Что нужно реализовать (Frontend)

### 1. Проверка роли пользователя

```typescript
// lib/auth-helpers.ts или middleware
export async function getUserRole(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('role, team_id')
    .eq('id', user.id)
    .single();

  return userData;
}

export function isDriver(role: string) {
  return role === 'driver';
}

export function isAdmin(role: string) {
  return role === 'admin';
}

export function isManager(role: string) {
  return role === 'manager';
}
```

### 2. Страница дашборда водителя

**Маршрут**: `/dashboard/driver`

**Компоненты**:
```
/dashboard/driver/
  ├── page.tsx              - Главная страница (список авто водителя)
  ├── expenses/
  │   ├── new/
  │   │   └── page.tsx      - Форма добавления расхода
  │   └── [id]/
  │       └── edit/
  │           └── page.tsx  - Редактирование расхода
  └── vehicles/
      └── [id]/
          └── page.tsx      - Детали автомобиля
```

#### Главная страница водителя:
```typescript
// app/dashboard/driver/page.tsx
export default async function DriverDashboard() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Получаем автомобили, назначенные бригаде водителя
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      *,
      vehicle_assignments!inner(
        team_id,
        start_date,
        end_date
      )
    `)
    .is('vehicle_assignments.end_date', null);  // Только активные

  return (
    <div>
      <h1>Мои автомобили</h1>
      {/* Карточки автомобилей */}
      {/* Быстрые действия: Добавить заправку, Добавить штраф */}
    </div>
  );
}
```

### 3. Форма добавления расхода

**Поля формы**:
- `category` - Категория (select: fuel, fine, other)
- `date` - Дата
- `amount` - Сумма (€)
- `description` - Описание
- `receipt_url` - Чек (загрузка файла)
- **Для заправки**:
  - `liters` - Литры
  - `odometer_reading` - Показания одометра (км)
  - `odometer_photo_url` - Фото одометра

```typescript
// app/dashboard/driver/expenses/new/page.tsx
import { ExpenseForm } from './ExpenseForm';

export default function NewExpensePage() {
  return (
    <div>
      <h1>Добавить расход</h1>
      <ExpenseForm />
    </div>
  );
}
```

```typescript
// app/dashboard/driver/expenses/new/ExpenseForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ExpenseCategory = 'fuel' | 'fine' | 'other';

export function ExpenseForm() {
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      vehicle_id: formData.get('vehicle_id'),
      category: formData.get('category'),
      date: formData.get('date'),
      amount: parseFloat(formData.get('amount') as string),
      description: formData.get('description'),
      liters: category === 'fuel' ? parseFloat(formData.get('liters') as string) : null,
      odometer_reading: category === 'fuel' ? parseInt(formData.get('odometer_reading') as string) : null,
      // receipt_url и odometer_photo_url загружаются в Storage
    };

    // Отправка на API
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      router.push('/dashboard/driver');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Выбор автомобиля */}
      <VehicleSelect name="vehicle_id" required />

      {/* Категория расхода */}
      <Select name="category" value={category} onChange={e => setCategory(e.target.value)}>
        <option value="fuel">⛽ Заправка</option>
        <option value="fine">🚨 Штраф</option>
        <option value="other">📝 Прочее</option>
      </Select>

      {/* Дата */}
      <Input type="date" name="date" required />

      {/* Сумма */}
      <Input type="number" name="amount" placeholder="Сумма (€)" step="0.01" required />

      {/* Описание */}
      <Textarea name="description" placeholder="Описание" />

      {/* Чек */}
      <FileUpload name="receipt" label="Загрузить чек" accept="image/*,application/pdf" />

      {/* Дополнительные поля для заправки */}
      {category === 'fuel' && (
        <>
          <Input type="number" name="liters" placeholder="Литры" step="0.01" required />
          <Input type="number" name="odometer_reading" placeholder="Показания одометра (км)" required />
          <FileUpload name="odometer_photo" label="Фото одометра" accept="image/*" required />
        </>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Сохранение...' : 'Добавить расход'}
      </Button>
    </form>
  );
}
```

### 4. API Route для добавления расходов

```typescript
// app/api/expenses/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Получаем organization_id пользователя
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  // Вставляем расход
  const { data, error } = await supabase
    .from('car_expenses')
    .insert({
      ...body,
      organization_id: userData.organization_id,
      created_by_user_id: user.id,  // Важно для отслеживания
    })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
```

### 5. Загрузка файлов в Supabase Storage

```typescript
// lib/storage-helpers.ts
export async function uploadFile(
  supabase: SupabaseClient,
  bucket: string,
  file: File,
  folder: string = ''
): Promise<string | null> {
  const fileName = `${folder}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  // Получаем публичный URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
```

### 6. Middleware для проверки роли

```typescript
// middleware.ts или app/dashboard/driver/layout.tsx
export default async function DriverLayout({ children }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'driver') {
    redirect('/dashboard');  // Перенаправляем на обычный дашборд
  }

  return <>{children}</>;
}
```

### 7. Навигация по ролям

```typescript
// components/DashboardNav.tsx
export function DashboardNav({ userRole }: { userRole: string }) {
  if (userRole === 'driver') {
    return (
      <nav>
        <NavLink href="/dashboard/driver">Мои автомобили</NavLink>
        <NavLink href="/dashboard/driver/expenses/new">Добавить расход</NavLink>
      </nav>
    );
  }

  // Для админов и менеджеров
  return (
    <nav>
      <NavLink href="/dashboard/vehicles">Автомобили</NavLink>
      <NavLink href="/dashboard/teams">Бригады</NavLink>
      <NavLink href="/dashboard/car-expenses">Расходы</NavLink>
      {/* ... другие пункты */}
    </nav>
  );
}
```

## 📋 Чеклист реализации

### Backend (✅ Готово)
- [x] Добавлена категория "fine" (штрафы)
- [x] Расширена таблица car_expenses (liters, odometer_reading, odometer_photo_url)
- [x] Созданы RLS политики для водителей
- [x] Водитель привязан к бригаде
- [x] Автомобиль назначен на бригаду водителя

### Frontend (❌ Требуется реализация)
- [ ] Страница дашборда водителя `/dashboard/driver`
- [ ] Форма добавления расходов
- [ ] Компонент выбора автомобиля (только назначенные)
- [ ] Загрузка файлов (чеки, фото одометра)
- [ ] API routes для expenses
- [ ] Middleware/Layout для проверки роли
- [ ] Навигация с учетом роли пользователя
- [ ] Страница просмотра/редактирования расходов водителя

## 🧪 Тестирование

1. **Войти как водитель**: vod@gmail.com / Admin12345
2. **Проверить доступ**: должен видеть только автомобиль "1" (B-FD 5555)
3. **Добавить расход**: заправку с литрами и показаниями одометра
4. **Добавить штраф**: с чеком
5. **Проверить изоляцию**: водитель не должен видеть другие авто
6. **Войти как админ**: admin@test.com / test123456
7. **Проверить**: админ видит все авто и все расходы

## 📊 Приоритеты

### Высокий приоритет (MVP):
1. Страница дашборда водителя (список своих авто)
2. Форма добавления заправки (fuel)
3. Форма добавления штрафа (fine)
4. Загрузка чеков и фото одометра
5. Middleware для проверки роли

### Средний приоритет:
1. История расходов водителя
2. Редактирование своих расходов
3. Статистика по заправкам (расход топлива)
4. Уведомления о превышении расхода

### Низкий приоритет:
1. Мобильная версия (PWA)
2. Пуш-уведомления
3. Экспорт данных водителя
4. График расхода топлива
