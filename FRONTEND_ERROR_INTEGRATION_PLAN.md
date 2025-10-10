# План интеграции централизованной системы обработки ошибок (Frontend)

**Дата:** 2025-10-10
**Статус:** Готов к выполнению
**Приоритет:** Высокий

---

## 1. Executive Summary (Краткая сводка)

### Контекст
Backend централизованная система обработки ошибок успешно интегрирована:
- ✅ `lib/errors.ts` - типы ошибок и парсинг
- ✅ `lib/api-response.ts` - API helpers для backend
- ✅ `lib/api-client.ts` - хуки для frontend (`useApi`, `useDelete`, `usePostJSON`, `usePostFormData`)
- ✅ `components/ErrorAlert.tsx` - компонент для отображения ошибок
- ✅ Все API routes возвращают structured errors

### Проблема
**83 файла** в `app/dashboard/` используют **устаревшие паттерны обработки ошибок**:
- ❌ `console.error()` вместо structured logging
- ❌ `alert()` вместо компонента ErrorAlert
- ❌ Ручные `fetch()` вместо хуков `useApi`
- ❌ `useState` для error state без типизации
- ❌ **42 файла с прямыми вызовами** `console.error` или `alert()`

### Решение
Провести поэтапную интеграцию централизованной системы обработки ошибок во все формы, компоненты и страницы dashboard.

### Ожидаемые результаты
- ✅ Единый UX для всех ошибок
- ✅ Типобезопасная обработка ошибок
- ✅ Лучшая debugging experience
- ✅ Уменьшение дублирования кода на ~30%
- ✅ Централизованное логирование

---

## 2. Текущее состояние (Анализ)

### 2.1 Найденные паттерны использования

#### Паттерн 1: Формы с прямым Supabase (57% файлов)
**Пример:** `VehicleForm.tsx`, `PenaltyForm.tsx`, `ExpenseForm.tsx`

```typescript
// ❌ ТЕКУЩИЙ КОД
const [error, setError] = useState('');

try {
  const { error: insertError } = await supabase
    .from('vehicles')
    .insert(vehicleData);

  if (insertError) {
    throw insertError;
  }
} catch (err: any) {
  console.error('Error:', err);
  setError(err.message || 'Ошибка сохранения');
}

// JSX
{error && (
  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
    {error}
  </div>
)}
```

**Проблемы:**
- Нет типизации ошибок
- Теряется информация о типе ошибки (validation, DB constraint, etc.)
- Кастомный UI для каждой формы
- Дублирование логики обработки

#### Паттерн 2: DELETE кнопки с fetch (18% файлов)
**Пример:** `DeleteVehicleButton.tsx`, `DeletePenaltyButton.tsx`

```typescript
// ❌ ТЕКУЩИЙ КОД
const [isDeleting, setIsDeleting] = useState(false);

const handleDelete = async () => {
  if (!confirm('Вы уверены?')) return;

  setIsDeleting(true);
  try {
    const response = await fetch(`/api/vehicles/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      router.push('/dashboard/vehicles');
    } else {
      alert('Ошибка при удалении');
    }
  } catch (error) {
    alert('Ошибка при удалении');
  } finally {
    setIsDeleting(false);
  }
};
```

**Проблемы:**
- `alert()` вместо компонента
- Нет информации о причине ошибки
- Не используется structured error response от API

#### Паттерн 3: Компоненты с document upload (15% файлов)
**Пример:** `VehicleDocuments.tsx`, `UserDocuments.tsx`

```typescript
// ❌ ТЕКУЩИЙ КОД
const [error, setError] = useState('');

const handleAddDocument = async (e: FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const formData = new FormData(e.currentTarget);
    const response = await fetch('/api/vehicle-documents', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to add document');
    }
  } catch (err: any) {
    console.error('Error:', err);
    setError(err.message || 'Ошибка добавления документа');
  }
};
```

**Проблемы:**
- Ручная обработка FormData
- Нет использования `usePostFormData` хука
- Потеря structured error информации

#### Паттерн 4: Server Components с Page.tsx (10% файлов)
**Пример:** `penalties/[id]/edit/page.tsx`

```typescript
// ❌ ТЕКУЩИЙ КОД (Server Action)
async function updatePenalty(formData: FormData) {
  'use server';

  const { error } = await supabase
    .from('penalties')
    .update({ ... })
    .eq('id', id);

  if (error) {
    console.error('Error updating penalty:', error);
    return; // Ошибка не показывается пользователю!
  }
}
```

**Проблемы:**
- Server actions не показывают ошибки пользователю
- Нужно переносить на client components с API routes

### 2.2 Статистика использования ошибок

| Паттерн | Количество файлов | Процент |
|---------|------------------|---------|
| `console.error` | 21 файл | 25% |
| `alert()` | 18 файлов | 22% |
| Custom error div | 32 файла | 39% |
| Прямой Supabase | 47 файлов | 57% |
| `fetch()` без хуков | 28 файлов | 34% |

### 2.3 Категоризация компонентов

#### Высокий приоритет (частые операции)
1. **Vehicles** (7 файлов)
   - `VehicleForm.tsx` - создание/редактирование
   - `DeleteVehicleButton.tsx` - удаление
   - `VehicleDocuments.tsx` - документы
   - `VehicleAssignments.tsx` - назначения
   - `vehicles/page.tsx` - список
   - `vehicles/[id]/page.tsx` - детали
   - `vehicles/[id]/edit/page.tsx` - редактирование

2. **Penalties** (6 файлов)
   - `PenaltyForm.tsx` - создание
   - `DeletePenaltyButton.tsx` - удаление
   - `PenaltyPaymentForm.tsx` - оплата
   - `penalties/page.tsx` - список
   - `penalties/[id]/page.tsx` - детали
   - `penalties/[id]/edit/page.tsx` - редактирование

3. **Expenses** (4 файла)
   - `ExpenseForm.tsx` - создание
   - `expenses/page.tsx` - список
   - `expenses/new/page.tsx` - новый

4. **CarExpenses** (4 файла)
   - `CarExpenseForm.tsx` - создание
   - `car-expenses/page.tsx` - список
   - `car-expenses/[id]/edit/page.tsx` - редактирование
   - `car-expenses/new/page.tsx` - новый

#### Средний приоритет
5. **Maintenance** (5 файлов)
   - `MaintenanceForm.tsx` - создание
   - `maintenance/page.tsx` - список
   - `maintenance/[id]/page.tsx` - детали
   - `maintenance/[id]/edit/page.tsx` - редактирование
   - `maintenance/new/page.tsx` - новый

6. **Documents** (2 файла)
   - `DocumentsTable.tsx` - таблица
   - `documents/page.tsx` - список

7. **Teams** (7 файлов)
   - `TeamForm.tsx` - создание
   - `TeamMembers.tsx` - участники
   - `TeamVehicles.tsx` - автомобили
   - `teams/page.tsx` - список
   - `teams/[id]/page.tsx` - детали
   - `teams/[id]/edit/page.tsx` - редактирование
   - `teams/new/page.tsx` - новый

#### Низкий приоритет
8. **Users** (6 файлов)
   - `UserForm.tsx` - создание
   - `UserDocuments.tsx` - документы
   - `users/page.tsx` - список
   - `users/[id]/page.tsx` - детали
   - `users/[id]/edit/page.tsx` - редактирование
   - `users/new/page.tsx` - новый

9. **TeamMembers** (4 файла)
   - `MemberDocuments.tsx` - документы
   - `team-members/page.tsx` - список
   - `team-members/[id]/page.tsx` - детали

---

## 3. Детальный план интеграции

### 3.1 Высокий приоритет: Vehicles (7 файлов)

#### 3.1.1 VehicleForm.tsx
**Путь:** `/Volumes/T7/dn/FahrzeugVerfolgung/nextjs-app/app/dashboard/vehicles/VehicleForm.tsx`

**Текущие проблемы:**
- Строка 44: `const [error, setError] = useState('');`
- Строка 173: `console.error('❌ Error saving vehicle:', err);`
- Строка 191: `setError(errorMessage);`
- Строки 200-204: Custom error div

**План интеграции:**

```typescript
// ✅ НОВЫЙ КОД
import { useApi } from '@/lib/api-client';
import { ErrorAlert } from '@/components/ErrorAlert';
import { AppError } from '@/lib/errors';

export function VehicleForm({ vehicle, isEdit = false }: VehicleFormProps) {
  const router = useRouter();
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

  // Используем хук useApi для управления состоянием
  const {
    loading,
    error,
    execute,
    clearError
  } = useApi({
    onSuccess: () => {
      router.push('/dashboard/vehicles');
      router.refresh();
    }
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { /* ... */ },
  });

  const onSubmit = async (data: VehicleFormData) => {
    clearError(); // Очищаем предыдущие ошибки

    await execute(async () => {
      // Загружаем фото
      let photoUrls: string[] = [];
      if (photoFiles.length > 0) {
        const orgId = await getOrganizationIdClient();
        photoUrls = await uploadMultipleFiles(photoFiles, 'vehicles', orgId);
      }

      // Формируем FormData
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('license_plate', data.license_plate || '');
      // ... остальные поля

      if (photoUrls.length > 0) {
        formData.append('photo_urls', photoUrls.join(';'));
      }

      // Вызываем API
      const url = isEdit
        ? `/api/vehicles/${vehicle.id}`
        : '/api/vehicles';

      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
      });

      return await handleApiResponse(response);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* ErrorAlert компонент вместо custom div */}
      <ErrorAlert error={error} onDismiss={clearError} />

      {/* Остальные поля формы... */}

      <div className="flex gap-4 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : isEdit ? '💾 Сохранить' : '✅ Добавить'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/vehicles')}
          disabled={loading}
        >
          ❌ Отмена
        </Button>
      </div>
    </form>
  );
}
```

**Изменения:**
1. ✅ Убрать `useState<string>` для error
2. ✅ Добавить `useApi` хук
3. ✅ Заменить custom error div на `<ErrorAlert>`
4. ✅ Убрать `console.error`
5. ✅ Использовать `handleApiResponse` из api-client

**Время:** 30 минут

---

#### 3.1.2 DeleteVehicleButton.tsx
**Путь:** `/Volumes/T7/dn/FahrzeugVerfolgung/nextjs-app/app/dashboard/vehicles/[id]/DeleteVehicleButton.tsx`

**Текущие проблемы:**
- Строки 26-27: `alert('Ошибка при удалении автомобиля');`

**План интеграции:**

```typescript
// ✅ НОВЫЙ КОД
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDelete } from '@/lib/api-client';
import { ErrorAlert } from '@/components/ErrorAlert';

export default function DeleteVehicleButton({
  vehicleId,
  vehicleName
}: {
  vehicleId: string;
  vehicleName: string;
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    loading,
    error,
    deleteItem,
    clearError
  } = useDelete(`/api/vehicles/${vehicleId}`, {
    onSuccess: () => {
      router.push('/dashboard/vehicles');
      router.refresh();
    }
  });

  const handleDelete = async () => {
    if (!confirm(`Вы уверены, что хотите удалить автомобиль "${vehicleName}"?`)) {
      return;
    }

    await deleteItem();
  };

  return (
    <div className="space-y-4">
      <ErrorAlert error={error} onDismiss={clearError} />

      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
      >
        {loading ? 'Удаление...' : 'Удалить'}
      </button>
    </div>
  );
}
```

**Изменения:**
1. ✅ Заменить `alert()` на `<ErrorAlert>`
2. ✅ Использовать `useDelete` хук
3. ✅ Убрать `try/catch` блоки
4. ✅ Добавить `clearError` функцию

**Время:** 15 минут

---

#### 3.1.3 VehicleDocuments.tsx
**Путь:** `/Volumes/T7/dn/FahrzeugVerfolgung/nextjs-app/app/dashboard/vehicles/[id]/VehicleDocuments.tsx`

**Текущие проблемы:**
- Строка 61: `const [error, setError] = useState('');`
- Строки 129-133: Custom error handling с `console.error`
- Строки 141-154: Прямой Supabase запрос для delete
- Строки 382-386: Custom error div

**План интеграции:**

```typescript
// ✅ НОВЫЙ КОД
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePostFormData, useApi } from '@/lib/api-client';
import { ErrorAlert } from '@/components/ErrorAlert';

export function VehicleDocuments({ vehicle, initialDocuments }: VehicleDocumentsProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string } | null>(null);

  // Хук для добавления документа
  const addDocumentApi = usePostFormData('/api/vehicle-documents', {
    onSuccess: (data) => {
      setDocuments([...documents, data.document]);
      setDocumentFiles([]);
      router.refresh();
    }
  });

  // Хук для удаления документа
  const deleteDocumentApi = useApi({
    onSuccess: (data) => {
      setDocuments(documents.filter((doc) => doc.id !== data.documentId));
      router.refresh();
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocumentFiles(files);
  };

  const handleAddDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    formData.append('vehicle_id', vehicle.id);

    // Добавляем все файлы
    documentFiles.forEach((file) => {
      formData.append('files', file);
    });

    await addDocumentApi.post(formData);

    if (!addDocumentApi.error) {
      (e.target as HTMLFormElement).reset();
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Удалить этот документ?')) return;

    await deleteDocumentApi.execute(async () => {
      const response = await fetch(`/api/vehicle-documents/${docId}`, {
        method: 'DELETE',
      });

      return await handleApiResponse(response);
    });
  };

  // Объединяем ошибки от обоих API
  const combinedError = addDocumentApi.error || deleteDocumentApi.error;
  const clearCombinedError = () => {
    addDocumentApi.clearError();
    deleteDocumentApi.clearError();
  };

  return (
    <div className="space-y-6">
      {/* Общий ErrorAlert для всех ошибок */}
      <ErrorAlert error={combinedError} onDismiss={clearCombinedError} />

      {/* ... остальной код ... */}

      <TabsContent value="add">
        <form onSubmit={handleAddDocument} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* ErrorAlert уже выше, убираем отсюда */}

          <div className="grid grid-cols-2 gap-4">
            {/* ... поля формы ... */}
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button
              type="submit"
              disabled={addDocumentApi.loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addDocumentApi.loading ? 'Сохранение...' : '✅ Добавить документ'}
            </Button>
          </div>
        </form>
      </TabsContent>

      {/* ... остальной код ... */}
    </div>
  );
}
```

**Изменения:**
1. ✅ Заменить `useState<string>` на `usePostFormData` и `useApi`
2. ✅ Убрать прямые Supabase запросы
3. ✅ Добавить `<ErrorAlert>` компонент
4. ✅ Убрать `console.error` и `alert`
5. ✅ Объединить ошибки от разных API в один ErrorAlert

**Время:** 45 минут

---

### 3.2 Высокий приоритет: Penalties (6 файлов)

#### 3.2.1 PenaltyForm.tsx
**Путь:** `/Volumes/T7/dn/FahrzeugVerfolgung/nextjs-app/app/dashboard/penalties/new/PenaltyForm.tsx`

**План интеграции:**

```typescript
// ✅ НОВЫЙ КОД
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePostFormData } from '@/lib/api-client';
import { ErrorAlert } from '@/components/ErrorAlert';

export function PenaltyForm({ vehicles, users }: PenaltyFormProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PenaltyFormData>({
    resolver: zodResolver(penaltySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      status: 'open',
    },
  });

  // Хук для создания штрафа
  const {
    loading,
    error,
    post,
    clearError
  } = usePostFormData('/api/penalties', {
    onSuccess: () => {
      router.push('/dashboard/penalties');
      router.refresh();
    }
  });

  const onSubmit = async (data: PenaltyFormData) => {
    clearError();

    const formData = new FormData();
    formData.append('vehicle_id', data.vehicle_id);
    formData.append('user_id', data.user_id || '');
    formData.append('amount', data.amount.toString());
    formData.append('date', data.date);
    formData.append('description', data.description || '');
    formData.append('status', data.status);

    if (selectedFile) {
      formData.append('photo', selectedFile);
    }

    await post(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-6">
      <ErrorAlert error={error} onDismiss={clearError} />

      <div className="grid grid-cols-2 gap-4">
        {/* ... поля формы ... */}
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : '💾 Добавить штраф'}
        </Button>
        <Link href="/dashboard/penalties">
          <Button variant="outline" type="button">
            ❌ Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}
```

**Время:** 25 минут

---

#### 3.2.2 DeletePenaltyButton.tsx
**Путь:** `/Volumes/T7/dn/FahrzeugVerfolgung/nextjs-app/app/dashboard/penalties/[id]/DeletePenaltyButton.tsx`

**План интеграции:**

```typescript
// ✅ НОВЫЙ КОД
'use client';

import { useRouter } from 'next/navigation';
import { useDelete } from '@/lib/api-client';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Button } from '@/components/ui/button';

export default function DeletePenaltyButton({ penaltyId }: DeletePenaltyButtonProps) {
  const router = useRouter();

  const {
    loading,
    error,
    deleteItem,
    clearError
  } = useDelete(`/api/penalties/${penaltyId}`, {
    onSuccess: () => {
      router.push('/dashboard/penalties');
      router.refresh();
    }
  });

  const handleDelete = async () => {
    if (!confirm('Удалить этот штраф? / Diese Strafe löschen?')) {
      return;
    }

    await deleteItem();
  };

  return (
    <div className="space-y-4">
      <ErrorAlert error={error} onDismiss={clearError} />

      <Button variant="outline" onClick={handleDelete} disabled={loading}>
        {loading ? 'Удаление...' : '🗑️ Удалить'}
      </Button>
    </div>
  );
}
```

**Время:** 15 минут

---

#### 3.2.3 PenaltyPaymentForm.tsx
**Путь:** `/Volumes/T7/dn/FahrzeugVerfolgung/nextjs-app/app/dashboard/penalties/[id]/PenaltyPaymentForm.tsx`

**Нужно прочитать файл для анализа:**

**Время:** 20 минут

---

### 3.3 Средний приоритет: Expenses, Maintenance, Teams

#### 3.3.1 ExpenseForm.tsx
Аналогичный подход как в PenaltyForm - **20 минут**

#### 3.3.2 MaintenanceForm.tsx
Аналогичный подход - **25 минут**

#### 3.3.3 TeamForm.tsx
Простая форма - **15 минут**

#### 3.3.4 TeamMembers.tsx
Компонент с add/delete - **30 минут**

---

### 3.4 Низкий приоритет: Users, Documents

#### 3.4.1 UserForm.tsx
Форма с валидацией паролей - **25 минут**

#### 3.4.2 UserDocuments.tsx
Аналогично VehicleDocuments - **35 минут**

---

## 4. Приоритеты и оценка времени

### 4.1 Разбивка по приоритетам

| Приоритет | Модуль | Файлов | Время (мин) | Время (часы) |
|-----------|--------|--------|-------------|--------------|
| **ВЫСОКИЙ** | **Vehicles** | 7 | 185 | 3.1 |
| | VehicleForm.tsx | 1 | 30 | 0.5 |
| | DeleteVehicleButton.tsx | 1 | 15 | 0.25 |
| | VehicleDocuments.tsx | 1 | 45 | 0.75 |
| | VehicleAssignments.tsx | 1 | 35 | 0.6 |
| | vehicles/page.tsx (список) | 1 | 20 | 0.3 |
| | vehicles/[id]/page.tsx | 1 | 20 | 0.3 |
| | vehicles/[id]/edit/page.tsx | 1 | 20 | 0.3 |
| **ВЫСОКИЙ** | **Penalties** | 6 | 140 | 2.3 |
| | PenaltyForm.tsx | 1 | 25 | 0.4 |
| | DeletePenaltyButton.tsx | 1 | 15 | 0.25 |
| | PenaltyPaymentForm.tsx | 1 | 20 | 0.3 |
| | penalties/[id]/edit/page.tsx | 1 | 30 | 0.5 |
| | penalties/page.tsx | 1 | 25 | 0.4 |
| | penalties/[id]/page.tsx | 1 | 25 | 0.4 |
| **ВЫСОКИЙ** | **Expenses** | 4 | 90 | 1.5 |
| **ВЫСОКИЙ** | **CarExpenses** | 4 | 95 | 1.6 |
| **СРЕДНИЙ** | **Maintenance** | 5 | 115 | 1.9 |
| **СРЕДНИЙ** | **Teams** | 7 | 150 | 2.5 |
| **СРЕДНИЙ** | **Documents** | 2 | 40 | 0.7 |
| **НИЗКИЙ** | **Users** | 6 | 140 | 2.3 |
| **НИЗКИЙ** | **TeamMembers** | 4 | 90 | 1.5 |
| **ИТОГО** | | **45** | **1045 мин** | **~17.4 часов** |

### 4.2 Рекомендуемый порядок выполнения

#### Фаза 1: Критические формы (День 1-2)
**Цель:** Интегрировать высокоприоритетные формы создания/редактирования

1. VehicleForm.tsx - 30 мин
2. PenaltyForm.tsx - 25 мин
3. ExpenseForm.tsx - 20 мин
4. CarExpenseForm.tsx - 25 мин

**Итого:** 100 минут (~2 часа)

#### Фаза 2: DELETE операции (День 2)
**Цель:** Заменить все `alert()` на ErrorAlert

5. DeleteVehicleButton.tsx - 15 мин
6. DeletePenaltyButton.tsx - 15 мин
7. Остальные DELETE кнопки - 60 мин

**Итого:** 90 минут (~1.5 часа)

#### Фаза 3: Document upload компоненты (День 3)
**Цель:** Интегрировать usePostFormData для загрузки файлов

8. VehicleDocuments.tsx - 45 мин
9. UserDocuments.tsx - 35 мин
10. MemberDocuments.tsx - 30 мин

**Итого:** 110 минут (~2 часа)

#### Фаза 4: Team и Assignment компоненты (День 4)
**Цель:** Интегрировать сложные компоненты с multiple operations

11. TeamMembers.tsx - 30 мин
12. VehicleAssignments.tsx - 35 мин
13. TeamVehicles.tsx - 25 мин

**Итого:** 90 минут (~1.5 часа)

#### Фаза 5: Maintenance и Users (День 5)
**Цель:** Завершить средний и низкий приоритет

14. MaintenanceForm.tsx - 25 мин
15. UserForm.tsx - 25 мин
16. TeamForm.tsx - 15 мин
17. Остальные формы - 120 мин

**Итого:** 185 минут (~3 часа)

#### Фаза 6: Server Components → Client (День 6)
**Цель:** Переписать Server Actions на Client Components с API

18. penalties/[id]/edit/page.tsx - 30 мин
19. users/[id]/edit/page.tsx - 30 мин
20. teams/[id]/edit/page.tsx - 30 мин
21. Остальные edit pages - 90 мин

**Итого:** 180 минут (~3 часа)

#### Фаза 7: Testing и рефакторинг (День 7)
**Цель:** Тестирование всех форм, исправление багов

22. Manual testing всех форм - 120 мин
23. Исправление багов - 60 мин
24. Code review - 30 мин

**Итого:** 210 минут (~3.5 часа)

---

### 4.3 Общая оценка

| Этап | Время |
|------|-------|
| Фаза 1: Критические формы | 2 часа |
| Фаза 2: DELETE операции | 1.5 часа |
| Фаза 3: Document uploads | 2 часа |
| Фаза 4: Teams & Assignments | 1.5 часа |
| Фаза 5: Maintenance & Users | 3 часа |
| Фаза 6: Server → Client | 3 часа |
| Фаза 7: Testing | 3.5 часа |
| **ИТОГО** | **~16.5 часов** |

**Рекомендация:** 7 рабочих дней по 2-3 часа в день

---

## 5. Риски и рекомендации

### 5.1 Технические риски

#### Риск 1: Breaking changes в формах
**Проблема:** Изменение логики форм может сломать существующий функционал

**Решение:**
- ✅ Тестировать каждую форму после интеграции
- ✅ Сохранить старый код в комментариях на время тестирования
- ✅ Использовать feature flags для постепенного rollout

#### Риск 2: Server Components vs Client Components
**Проблема:** Некоторые страницы используют Server Actions, которые не совместимы с useApi хуками

**Решение:**
- ✅ Конвертировать Server Actions в API routes
- ✅ Перенести логику на client components
- ✅ Документировать изменения

**Пример конвертации:**

```typescript
// ❌ СТАРЫЙ КОД (Server Action)
// app/dashboard/penalties/[id]/edit/page.tsx
async function updatePenalty(formData: FormData) {
  'use server';

  const { error } = await supabase
    .from('penalties')
    .update({ ... })
    .eq('id', id);

  if (error) {
    console.error('Error:', error);
    return;
  }

  redirect(`/dashboard/penalties/${id}`);
}

// ✅ НОВЫЙ КОД (Client Component + API Route)
// app/api/penalties/[id]/route.ts
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const authError = checkAuthentication(user);
  if (authError) return authError;

  const { orgId, error: orgError } = checkOrganizationId(user);
  if (orgError) return orgError;

  const body = await request.json();

  const { error } = await supabase
    .from('penalties')
    .update(body)
    .eq('id', params.id)
    .eq('organization_id', orgId);

  if (error) {
    return apiErrorFromUnknown(error, { context: 'updating penalty' });
  }

  return apiSuccess({ success: true });
}

// app/dashboard/penalties/[id]/edit/page.tsx (Client Component)
'use client';

export default function EditPenaltyPage({ params }: { params: { id: string } }) {
  const { loading, error, execute, clearError } = useApi({
    onSuccess: () => {
      router.push(`/dashboard/penalties/${params.id}`);
      router.refresh();
    }
  });

  const onSubmit = async (data: PenaltyFormData) => {
    await execute(() => putJSON(`/api/penalties/${params.id}`, data));
  };

  // ...
}
```

#### Риск 3: FileUpload с Supabase Storage
**Проблема:** Текущий код использует `uploadFile` и `uploadMultipleFiles` которые возвращают URLs напрямую

**Решение:**
- ✅ Обернуть `uploadFile` в try/catch с `formatError`
- ✅ Передавать ошибки загрузки через ErrorAlert
- ✅ Добавить type `FILE_UPLOAD` для специфичных ошибок

**Пример:**

```typescript
// lib/storage.ts - обновить функции
export async function uploadFile(
  file: File,
  bucket: string,
  orgId: string
): Promise<string> {
  try {
    // Валидация размера файла
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw createFileUploadError(
        'Файл слишком большой',
        `Максимальный размер: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Валидация типа файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw createFileUploadError(
        'Неподдерживаемый тип файла',
        `Разрешены: ${allowedTypes.join(', ')}`
      );
    }

    // Загрузка...
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    if (error) {
      throw createFileUploadError('Ошибка загрузки файла', error.message);
    }

    return url;
  } catch (error) {
    throw formatError(error);
  }
}
```

#### Риск 4: Race conditions при множественных API вызовах
**Проблема:** Компоненты типа VehicleDocuments делают несколько API запросов (add, delete)

**Решение:**
- ✅ Использовать отдельные `useApi` хуки для каждой операции
- ✅ Объединять ошибки в один ErrorAlert
- ✅ Блокировать UI пока идет операция

---

### 5.2 UX риски

#### Риск 1: Потеря текста формы при ошибке
**Проблема:** После ошибки пользователь может потерять введенные данные

**Решение:**
- ✅ `react-hook-form` сохраняет состояние формы
- ✅ Не делать `reset()` после ошибки
- ✅ Показывать ErrorAlert над формой, не скрывая поля

#### Риск 2: Непонятные ошибки для пользователя
**Проблема:** Технические ошибки БД могут быть непонятны

**Решение:**
- ✅ Использовать `parseSupabaseError` для человекочитаемых сообщений
- ✅ Показывать `details` в ErrorAlert для debugging
- ✅ Добавить `field` подсветку в формах

**Пример интеграции field errors:**

```typescript
// VehicleForm.tsx
<ErrorAlert error={error} onDismiss={clearError} />

{/* Если ошибка связана с конкретным полем */}
<Input
  id="license_plate"
  {...register('license_plate')}
  className={cn(
    errors.license_plate && 'border-red-500',
    error?.field === 'license_plate' && 'border-red-500' // API ошибка
  )}
/>
{errors.license_plate && (
  <p className="text-sm text-red-600 mt-1">{errors.license_plate.message}</p>
)}
{error?.field === 'license_plate' && (
  <p className="text-sm text-red-600 mt-1">{error.message}</p>
)}
```

---

### 5.3 Рекомендации по реализации

#### 1. Создать вспомогательные хуки

**lib/hooks/useFormApi.ts:**
```typescript
/**
 * Комбинированный хук для форм с валидацией и API
 */
export function useFormApi<T>(
  apiUrl: string,
  options?: {
    method?: 'POST' | 'PUT';
    onSuccess?: (data: any) => void;
  }
) {
  const { loading, error, execute, clearError } = useApi(options);

  const submitForm = useCallback(
    async (data: T, formData?: FormData) => {
      clearError();

      const body = formData || JSON.stringify(data);
      const headers = formData
        ? {}
        : { 'Content-Type': 'application/json' };

      return await execute(async () => {
        const response = await fetch(apiUrl, {
          method: options?.method || 'POST',
          headers,
          body,
        });

        return await handleApiResponse(response);
      });
    },
    [apiUrl, execute, clearError, options?.method]
  );

  return {
    loading,
    error,
    submitForm,
    clearError,
  };
}
```

**Использование:**
```typescript
// VehicleForm.tsx
const { loading, error, submitForm, clearError } = useFormApi('/api/vehicles', {
  method: isEdit ? 'PUT' : 'POST',
  onSuccess: () => router.push('/dashboard/vehicles'),
});

const onSubmit = async (data: VehicleFormData) => {
  const formData = new FormData();
  // ... заполнение formData

  await submitForm(data, formData);
};
```

#### 2. Создать переиспользуемый DeleteButton

**components/DeleteButton.tsx:**
```typescript
'use client';

import { useDelete } from '@/lib/api-client';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Button } from '@/components/ui/button';

interface DeleteButtonProps {
  itemId: string;
  itemName: string;
  apiUrl: string;
  redirectUrl: string;
  confirmMessage?: string;
  buttonText?: string;
}

export function DeleteButton({
  itemId,
  itemName,
  apiUrl,
  redirectUrl,
  confirmMessage,
  buttonText = 'Удалить'
}: DeleteButtonProps) {
  const router = useRouter();

  const { loading, error, deleteItem, clearError } = useDelete(apiUrl, {
    onSuccess: () => {
      router.push(redirectUrl);
      router.refresh();
    }
  });

  const handleDelete = async () => {
    const message = confirmMessage || `Вы уверены, что хотите удалить "${itemName}"?`;
    if (!confirm(message)) return;

    await deleteItem();
  };

  return (
    <div className="space-y-4">
      <ErrorAlert error={error} onDismiss={clearError} />

      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? 'Удаление...' : buttonText}
      </Button>
    </div>
  );
}
```

**Использование:**
```typescript
// vehicles/[id]/page.tsx
<DeleteButton
  itemId={vehicle.id}
  itemName={vehicle.name}
  apiUrl={`/api/vehicles/${vehicle.id}`}
  redirectUrl="/dashboard/vehicles"
  confirmMessage="Вы уверены, что хотите удалить этот автомобиль?"
  buttonText="🗑️ Удалить автомобиль"
/>
```

#### 3. Стандартизировать структуру форм

**Шаблон для всех форм:**
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFormApi } from '@/lib/hooks/useFormApi';
import { ErrorAlert } from '@/components/ErrorAlert';
import { Button } from '@/components/ui/button';

export function [EntityName]Form({ /* props */ }) {
  const router = useRouter();

  // 1. Хук для формы
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<[EntityName]FormData>({
    resolver: zodResolver([entityName]Schema),
    defaultValues: { /* ... */ },
  });

  // 2. Хук для API
  const { loading, error, submitForm, clearError } = useFormApi(
    '/api/[entities]',
    {
      onSuccess: () => {
        router.push('/dashboard/[entities]');
        router.refresh();
      }
    }
  );

  // 3. Submit handler
  const onSubmit = async (data: [EntityName]FormData) => {
    clearError();

    // Подготовка данных (если нужно)
    const formData = new FormData();
    // ... или просто data

    await submitForm(data, formData);
  };

  // 4. JSX
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* ErrorAlert всегда первым */}
      <ErrorAlert error={error} onDismiss={clearError} />

      {/* Поля формы с валидацией */}
      <div className="grid grid-cols-2 gap-4">
        {/* ... */}
      </div>

      {/* Кнопки внизу */}
      <div className="flex gap-4 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
```

#### 4. Документировать каждое изменение

**Создать CHANGELOG для интеграции:**
```markdown
# Error Handling Integration Changelog

## 2025-10-10 - VehicleForm.tsx
- ✅ Заменен useState<string> на useFormApi
- ✅ Добавлен ErrorAlert компонент
- ✅ Убран console.error
- ✅ Тестирование: создание ✓, редактирование ✓, ошибки ✓

## 2025-10-10 - DeleteVehicleButton.tsx
- ✅ Заменен alert() на ErrorAlert
- ✅ Использован useDelete хук
- ✅ Тестирование: удаление ✓, ошибки ✓
```

---

## 6. Чеклист для каждого файла

При интеграции каждого компонента проверять:

### ✅ Code Changes
- [ ] Убраны `useState<string>` для errors
- [ ] Добавлены хуки из `lib/api-client.ts`
- [ ] Заменен custom error div на `<ErrorAlert>`
- [ ] Убраны `console.error()` и `alert()`
- [ ] Убраны прямые вызовы Supabase (где возможно)
- [ ] Добавлен `clearError()` на submit
- [ ] Использованы правильные типы (AppError)

### ✅ Testing
- [ ] Форма отправляется корректно
- [ ] Ошибки валидации отображаются
- [ ] Ошибки API отображаются в ErrorAlert
- [ ] Loading state работает (disabled buttons)
- [ ] Success redirect работает
- [ ] Error dismissal работает
- [ ] Field-specific errors выделяются

### ✅ UX
- [ ] Ошибки понятны пользователю (не технические)
- [ ] ErrorAlert не перекрывает форму
- [ ] Кнопки disabled во время loading
- [ ] Форма не очищается при ошибке
- [ ] Можно закрыть ErrorAlert

### ✅ Documentation
- [ ] Обновлен CHANGELOG
- [ ] Добавлены комментарии (если сложная логика)
- [ ] TypeScript errors исправлены

---

## 7. Примеры кода для быстрой интеграции

### 7.1 Простая форма (POST)

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePostJSON } from '@/lib/api-client';
import { ErrorAlert } from '@/components/ErrorAlert';

export function SimpleForm({ /* props */ }) {
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const { loading, error, post, clearError } = usePostJSON('/api/endpoint', {
    onSuccess: () => {
      router.push('/dashboard/list');
      router.refresh();
    }
  });

  const onSubmit = async (data) => {
    clearError();
    await post(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <ErrorAlert error={error} onDismiss={clearError} />
      {/* поля */}
      <Button type="submit" disabled={loading}>
        {loading ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </form>
  );
}
```

### 7.2 Форма с файлами (FormData)

```typescript
const { loading, error, post, clearError } = usePostFormData('/api/endpoint', {
  onSuccess: () => router.push('/dashboard/list')
});

const onSubmit = async (data) => {
  clearError();

  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('file', selectedFile);

  await post(formData);
};
```

### 7.3 DELETE кнопка

```typescript
const { loading, error, deleteItem, clearError } = useDelete(`/api/endpoint/${id}`, {
  onSuccess: () => {
    router.push('/dashboard/list');
    router.refresh();
  }
});

return (
  <>
    <ErrorAlert error={error} onDismiss={clearError} />
    <Button onClick={deleteItem} disabled={loading}>
      {loading ? 'Удаление...' : 'Удалить'}
    </Button>
  </>
);
```

### 7.4 Множественные операции

```typescript
// Для компонента с add и delete
const addApi = usePostJSON('/api/items', {
  onSuccess: (data) => setItems([...items, data])
});

const deleteApi = useApi({
  onSuccess: (data) => setItems(items.filter(i => i.id !== data.id))
});

// Объединить ошибки
const error = addApi.error || deleteApi.error;
const clearError = () => {
  addApi.clearError();
  deleteApi.clearError();
};

return (
  <>
    <ErrorAlert error={error} onDismiss={clearError} />
    {/* UI */}
  </>
);
```

---

## 8. Следующие шаги

### Немедленные действия (сегодня)
1. ✅ Создать ветку `feature/frontend-error-integration`
2. ✅ Создать `lib/hooks/useFormApi.ts`
3. ✅ Создать `components/DeleteButton.tsx`
4. ✅ Начать с Фазы 1: VehicleForm.tsx

### Краткосрочные (эта неделя)
1. ✅ Завершить Фазу 1-2 (критические формы и DELETE)
2. ✅ Manual testing всех измененных форм
3. ✅ Создать CHANGELOG.md

### Среднесрочные (следующая неделя)
1. ✅ Завершить Фазы 3-6 (все компоненты)
2. ✅ Comprehensive testing
3. ✅ Code review
4. ✅ Merge в main

### Долгосрочные (будущее)
1. ✅ Добавить unit тесты для хуков
2. ✅ Добавить E2E тесты для критических форм
3. ✅ Настроить error tracking (Sentry)
4. ✅ Создать error monitoring dashboard

---

## 9. Контакты и поддержка

### При возникновении проблем:
1. Проверить документацию в `/lib/api-client.ts`
2. Посмотреть примеры в этом документе
3. Проверить существующие интегрированные компоненты
4. Создать issue с описанием проблемы

### Полезные ссылки:
- TypeScript errors: `/lib/errors.ts`
- API client: `/lib/api-client.ts`
- Error component: `/components/ErrorAlert.tsx`
- API response helpers: `/lib/api-response.ts`

---

**Дата создания:** 2025-10-10
**Автор:** Claude
**Версия:** 1.0
**Статус:** Готов к выполнению
