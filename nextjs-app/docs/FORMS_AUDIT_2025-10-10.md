# Аудит форм vs База данных - Полный отчет

**Дата:** 10 октября 2025
**Объём:** Все формы, схемы и API routes проверены против реальной структуры БД
**Цель:** Найти несоответствия полей, которые могут вызвать ошибки

---

## 📊 Краткая сводка

**Всего форм проверено:** 6
**Форм с проблемами:** 3 (50%)
**Форм без проблем:** 3 (50%)

### 🔴 Критичные проблемы найдены:

1. **users** - API НЕ записывает поле `role` в БД (КРИТИЧНО!)
2. **car_expenses** - Поле `mileage` не существует в БД
3. **teams** - Поле `description` не существует в БД
4. **users** - Поле `position` не существует в БД

---

## 🔍 Детальные находки

### 1. VEHICLES ✅ КОРРЕКТНО

**Поля в БД:**
```
id, organization_id, name, license_plate, vin, status, created_at
is_rental, rental_start_date, rental_end_date, rental_monthly_price
model, year, photo_url
```

**Поля в Zod schema:**
```
name, license_plate, vin, model, year, status, photo_url
is_rental, rental_start_date, rental_end_date, rental_monthly_price
```

**Поля в форме:**
```
name, license_plate, vin, model, year, status, photos (file upload)
is_rental, rental_start_date, rental_end_date, rental_monthly_price
```

**Поля в API:**
```
name, license_plate, vin, model, year, status, photo_url
is_rental, rental_start_date, rental_end_date, rental_monthly_price
```

**Статус:** ✅ **ВСЕ ПОЛЯ СОВПАДАЮТ** - Проблем не найдено

**Файлы:**
- `lib/schemas/vehicles.schema.ts`
- `app/dashboard/vehicles/VehicleForm.tsx`
- `app/api/vehicles/route.ts`

---

### 2. PENALTIES ✅ КОРРЕКТНО

**Поля в БД:**
```
id, organization_id, vehicle_id, user_id, date, amount
photo_url, status, description
```

**Поля в Zod schema:**
```
vehicle_id, user_id, date, amount, description, photo_url, status
```

**Поля в форме:**
```
vehicle_id, user_id, date, amount, description, photo (file upload), status
```

**Поля в API:**
```
vehicle_id, user_id, amount, date, description, photo_url, status
```

**Статус:** ✅ **ВСЕ ПОЛЯ СОВПАДАЮТ** - Проблем не найдено

**Файлы:**
- `lib/schemas/penalties.schema.ts`
- `app/dashboard/penalties/new/PenaltyForm.tsx`
- `app/api/penalties/route.ts`

---

### 3. EXPENSES ✅ КОРРЕКТНО

**Поля в БД:**
```
id, organization_id, type, vehicle_id, team_id, date
amount, description, receipt_url
```

**Поля в Zod schema:**
```
type, vehicle_id, team_id, date, amount, description
```

**Поля в форме:**
```
type, vehicle_id, team_id, date, amount, description
```

**Поля в API:**
```
type, vehicle_id, team_id, amount, date, description
```

**Статус:** ✅ **ВСЕ ПОЛЯ СОВПАДАЮТ** - Проблем не найдено

**Примечание:** Schema не включает `receipt_url`, которое есть в БД, но форма его не использует, так что практической проблемы нет.

**Файлы:**
- `lib/schemas/expenses.schema.ts`
- `app/dashboard/expenses/new/ExpenseForm.tsx`
- `app/api/expenses/route.ts`

---

### 4. CAR_EXPENSES ❌ ЕСТЬ НЕСООТВЕТСТВИЯ

**Поля в БД:**
```
id, organization_id, vehicle_id, date, category, amount
description, receipt_url, maintenance_id, created_at
```

**Поля в Zod schema:**
```
vehicle_id, maintenance_id, date, amount, category, description
receipt_url, mileage ⚠️
```

**Поля в форме:**
```
vehicle_id, category, date, amount, mileage ⚠️, description
```

**Поля в API:**
```
vehicle_id, category, amount, date, description, mileage ⚠️
maintenance_id, receipt_url
```

#### ❌ ПРОБЛЕМА: Поле `mileage`

- **Schema:** Имеет поле `mileage` (number, optional)
- **Форма:** Имеет input поле для mileage
- **API:** Пытается вставить `mileage` в БД
- **База данных:** **НЕТ КОЛОНКИ `mileage`**

**Влияние:** 🟠 ВЫСОКОЕ - Будет вызывать ошибки БД когда пользователи вводят пробег

**Что исправить:**
1. Либо добавить колонку `mileage` в таблицу `car_expenses`
2. Либо удалить `mileage` из schema, формы и API route

**Рекомендация:** Удалить `mileage` из кода, так как его нет в дизайне БД

**Файлы для исправления:**
- `lib/schemas/car-expenses.schema.ts` - удалить mileage из schema
- `app/dashboard/car-expenses/new/CarExpenseForm.tsx` - удалить input поле mileage
- `app/api/car-expenses/route.ts` - удалить обработку mileage

---

### 5. TEAMS ❌ ЕСТЬ НЕСООТВЕТСТВИЯ

**Поля в БД:**
```
id, organization_id, name, lead_id, created_at
```

**Поля в Zod schema:**
```
name, description ⚠️
```

**Поля в форме:**
```
name, description ⚠️
```

**Поля в API:**
```
name, description ⚠️
```

#### ❌ ПРОБЛЕМА 1: Поле `description`

- **Schema:** Имеет поле `description` (string, optional)
- **Форма:** Имеет textarea поле для description
- **API:** Пытается вставить `description` в БД
- **База данных:** **НЕТ КОЛОНКИ `description`**

**Влияние:** 🟠 ВЫСОКОЕ - Будет вызывать ошибки БД когда пользователи добавляют описание

#### ❌ ПРОБЛЕМА 2: Отсутствует поле `lead_id`

- **База данных:** Имеет колонку `lead_id` (FK к таблице users)
- **Schema:** НЕТ поля `lead_id`
- **Форма:** НЕТ селектора для выбора руководителя
- **API:** НЕ обрабатывает `lead_id`

**Влияние:** 🟡 СРЕДНЕЕ - Пользователи не могут назначить руководителя команды при создании

**Что исправить:**
1. Удалить `description` из schema, формы и API
2. Добавить `lead_id` поле в schema, форму и API для назначения руководителя команды

**Файлы для исправления:**
- `lib/schemas/teams.schema.ts` - удалить description, добавить lead_id
- `app/dashboard/teams/new/TeamForm.tsx` - удалить description field, добавить lead selector
- `app/api/teams/route.ts` - удалить description, добавить lead_id

---

### 6. USERS ❌ ЕСТЬ КРИТИЧНЫЕ НЕСООТВЕТСТВИЯ

**Поля в БД:**
```
id, organization_id, email, password_hash, first_name, last_name
phone, team_id, created_at, role
```

**Поля в Zod schema:**
```
email, first_name, last_name, phone
position ⚠️, photo_url ⚠️
role (в createUserSchema), password + confirmPassword (для создания)
```

**Поля в форме:**
```
email, password, confirmPassword, role, first_name, last_name
phone, position ⚠️
```

**Поля в API:**
```
email, password (хешированный), first_name, last_name, phone
position ⚠️
⚠️ НЕТ ПОЛЯ role!
```

#### 🔴 КРИТИЧНО: Поле `role` НЕ записывается в БД!

- **Schema:** Имеет поле `role` в createUserSchema
- **Форма:** Имеет селектор для выбора роли
- **API:** **НЕ ВСТАВЛЯЕТ `role` В БАЗУ ДАННЫХ!**
- **База данных:** Имеет колонку `role`

**Влияние:** 🔴 **КРИТИЧНО** - Все новые пользователи создаются БЕЗ ролей! Это вызовет проблемы с авторизацией!

#### ❌ ПРОБЛЕМА 2: Поле `position`

- **Schema:** Имеет поле `position` (string, optional)
- **Форма:** Имеет input поле для должности
- **API:** Пытается вставить `position` в БД
- **База данных:** **НЕТ КОЛОНКИ `position`**

**Влияние:** 🟠 ВЫСОКОЕ - Будет вызывать ошибки БД когда пользователи вводят должность

#### ❌ ПРОБЛЕМА 3: Поле `photo_url` в schema

- **Schema:** Имеет поле `photo_url` (string, optional)
- **Форма:** НЕ использует (хорошо!)
- **API:** НЕ отправляет (хорошо!)
- **База данных:** **НЕТ КОЛОНКИ `photo_url`**

**Влияние:** 🟢 НИЗКОЕ - Schema определяет, но никогда не используется, так что runtime ошибки нет. Просто лишнее определение.

#### ❌ ПРОБЛЕМА 4: Отсутствует поле `team_id`

- **База данных:** Имеет колонку `team_id` (FK к таблице teams)
- **Schema:** НЕТ поля `team_id`
- **Форма:** НЕТ селектора для выбора команды
- **API:** НЕ обрабатывает `team_id`

**Влияние:** 🟡 СРЕДНЕЕ - Пользователи не могут быть назначены в команду при создании

**Что исправить:**
1. **🔴 КРИТИЧНО:** Добавить вставку `role` в API route
2. Удалить `position` из schema, формы и API
3. Удалить `photo_url` из schema (или добавить колонку в БД если нужно)
4. Добавить `team_id` поле в schema, форму и API для назначения в команду

**Файлы для исправления:**
- `lib/schemas/users.schema.ts` - удалить position, photo_url; оставить role
- `app/dashboard/users/new/UserForm.tsx` - удалить position field, добавить team selector
- **`app/api/users/route.ts` (КРИТИЧНО!)** - добавить role в insert, удалить position, добавить team_id

---

## 📋 Сводка проблем по степени важности

### 🔴 КРИТИЧНО (Исправить немедленно)

1. **users API route** - Отсутствует вставка поля `role` - пользователи создаются без ролей!
   - **Файл:** `app/api/users/route.ts`
   - **Действие:** Добавить `role: body.role` в объект вставки

### 🟠 ВЫСОКОЕ (Исправить скоро - Вызовет ошибки)

1. **car_expenses** - Поле `mileage` не существует в БД
   - **Файлы:**
     - `lib/schemas/car-expenses.schema.ts`
     - `app/dashboard/car-expenses/new/CarExpenseForm.tsx`
     - `app/api/car-expenses/route.ts`
   - **Действие:** Удалить все упоминания mileage

2. **teams** - Поле `description` не существует в БД
   - **Файлы:**
     - `lib/schemas/teams.schema.ts`
     - `app/dashboard/teams/new/TeamForm.tsx`
     - `app/api/teams/route.ts`
   - **Действие:** Удалить все упоминания description

3. **users** - Поле `position` не существует в БД
   - **Файлы:**
     - `lib/schemas/users.schema.ts`
     - `app/dashboard/users/new/UserForm.tsx`
     - `app/api/users/route.ts`
   - **Действие:** Удалить все упоминания position

### 🟡 СРЕДНЕЕ (Функция неполная)

1. **teams** - Отсутствует поле `lead_id` - нельзя назначить руководителя команды
   - **Действие:** Добавить lead_id selector в форму и обработку в API

2. **users** - Отсутствует поле `team_id` - нельзя назначить пользователя в команду
   - **Действие:** Добавить team selector в форму и обработку в API

### 🟢 НИЗКОЕ (Cleanup)

1. **users schema** - `photo_url` определен но не используется
   - **Действие:** Удалить из schema

2. **expenses schema** - `receipt_url` есть в БД но не в schema (не используется формой, так что нет проблемы)
   - **Действие:** Опционально добавить в schema для будущего использования

---

## 🎯 Рекомендуемая очередность исправлений

### Приоритет 1 (КРИТИЧНО - Исправить СЕЙЧАС):
```bash
1. app/api/users/route.ts - Добавить вставку role в базу данных
```

### Приоритет 2 (ВЫСОКОЕ - Исправить на этой неделе):
```bash
1. car_expenses - Удалить поле mileage из schema, формы, API
2. teams - Удалить поле description из schema, формы, API
3. users - Удалить поле position из schema, формы, API
```

### Приоритет 3 (СРЕДНЕЕ - Исправить когда возможно):
```bash
1. teams - Добавить поле lead_id в schema, форму, API
2. users - Добавить поле team_id в schema, форму, API
```

### Приоритет 4 (НИЗКОЕ - Cleanup):
```bash
1. users schema - Удалить определение photo_url
2. Рассмотреть добавление receipt_url в expenses schema если нужно в будущем
```

---

## 📁 Файлы для изменения

### Для car_expenses (удалить mileage):
```
lib/schemas/car-expenses.schema.ts
app/dashboard/car-expenses/new/CarExpenseForm.tsx
app/api/car-expenses/route.ts
```

### Для teams (удалить description, добавить lead_id):
```
lib/schemas/teams.schema.ts
app/dashboard/teams/new/TeamForm.tsx
app/api/teams/route.ts
```

### Для users (удалить position, добавить role в API, добавить team_id):
```
lib/schemas/users.schema.ts
app/dashboard/users/new/UserForm.tsx
app/api/users/route.ts (КРИТИЧНО)
```

---

## 💡 Заключение

Из 6 проверенных форм:
- ✅ 3 формы полностью корректны (vehicles, penalties, expenses)
- ❌ 3 формы имеют несоответствия (car_expenses, teams, users)

**Самая критичная проблема** в **API route для users**, которая не вставляет поле `role`, что означает что все вновь созданные пользователи будут иметь NULL роли и столкнутся с проблемами авторизации.

Другие приоритетные проблемы касаются полей, которых нет в базе данных, но которые используются в формах, что приведёт к ошибкам вставки когда пользователи попытаются использовать эти поля.

---

## 🔧 Следующие шаги

1. **НЕМЕДЛЕННО:** Исправить users API - добавить role
2. **Эта неделя:** Удалить несуществующие поля (mileage, description, position)
3. **Когда возможно:** Добавить недостающие поля (lead_id, team_id)
4. **Cleanup:** Удалить неиспользуемые определения schema

---

**Отчет создан:** 2025-10-10
**Автор:** Claude Code
**Источник:** Automated form audit against database schema
**Статус:** ✅ Аудит завершен, проблемы идентифицированы
