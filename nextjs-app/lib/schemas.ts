/**
 * Zod Schemas for Form Validation
 * Централизованные схемы валидации для всех форм приложения
 */

import { z } from 'zod';

// ============================================================================
// VEHICLE SCHEMAS
// ============================================================================

export const VEHICLE_STATUS_OPTIONS = [
  { value: 'active', label: 'Активен / Aktiv' },
  { value: 'inactive', label: 'Неактивен / Inaktiv' },
  { value: 'maintenance', label: 'На обслуживании / In Wartung' },
  { value: 'repair', label: 'В ремонте / In Reparatur' },
] as const;

export const vehicleSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  license_plate: z.string().min(1, 'Гос. номер обязателен'),
  vin: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'repair']),
  is_rental: z.boolean(),
  rental_start_date: z.string().optional(),
  rental_end_date: z.string().optional(),
  rental_monthly_price: z.number().positive().optional(),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

// ============================================================================
// PENALTY SCHEMAS
// ============================================================================

export const penaltySchema = z.object({
  vehicle_id: z.string().min(1, 'Автомобиль обязателен'),
  user_id: z.string().optional().nullable(),
  amount: z.number().positive('Сумма должна быть положительной'),
  date: z.string().min(1, 'Дата обязательна'),
  description: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  status: z.enum(['open', 'paid', 'contested', 'cancelled']).default('open'),
});

export type PenaltyFormData = z.infer<typeof penaltySchema>;

// ============================================================================
// EXPENSE SCHEMAS
// ============================================================================

export const EXPENSE_TYPE_OPTIONS = [
  { value: 'vehicle', label: 'Расход на автомобиль' },
  { value: 'team', label: 'Расход на бригаду' },
  { value: 'general', label: 'Общий расход' },
] as const;

export const expenseSchema = z.object({
  type: z.enum(['vehicle', 'team', 'general']),
  vehicle_id: z.string().optional(),
  team_id: z.string().optional(),
  amount: z.number().positive('Сумма должна быть положительной'),
  date: z.string().min(1, 'Дата обязательна'),
  description: z.string().optional().nullable(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

// ============================================================================
// CAR EXPENSE SCHEMAS
// ============================================================================

export const CAR_EXPENSE_CATEGORY_OPTIONS = [
  { value: 'fuel', label: '⛽ Топливо / Kraftstoff' },
  { value: 'maintenance', label: '🔧 Обслуживание / Wartung' },
  { value: 'repair', label: '🛠️ Ремонт / Reparatur' },
  { value: 'insurance', label: '📄 Страховка / Versicherung' },
  { value: 'tax', label: '💰 Налог / Steuer' },
  { value: 'parking', label: '🅿️ Парковка / Parkplatz' },
  { value: 'toll', label: '🛣️ Дорожный сбор / Maut' },
  { value: 'wash', label: '🧼 Мойка / Autowäsche' },
  { value: 'other', label: '📦 Другое / Sonstiges' },
] as const;

export const carExpenseSchema = z.object({
  vehicle_id: z.string().min(1, 'Автомобиль обязателен'),
  category: z.enum(['fuel', 'maintenance', 'repair', 'insurance', 'tax', 'parking', 'toll', 'wash', 'other']),
  amount: z.number().positive('Сумма должна быть положительной'),
  date: z.string().min(1, 'Дата обязательна'),
  description: z.string().optional().nullable(),
  mileage: z.number().int().positive().optional().nullable(),
  maintenance_id: z.string().optional().nullable(),
  receipt_url: z.string().optional().nullable(),
});

export type CarExpenseFormData = z.infer<typeof carExpenseSchema>;

// ============================================================================
// MAINTENANCE SCHEMAS
// ============================================================================

export const MAINTENANCE_TYPE_OPTIONS = [
  { value: 'scheduled', label: 'Плановое / Geplant' },
  { value: 'repair', label: 'Ремонт / Reparatur' },
  { value: 'inspection', label: 'Осмотр / Inspektion' },
] as const;

export const maintenanceSchema = z.object({
  vehicle_id: z.string().min(1, 'Автомобиль обязателен'),
  type: z.enum(['scheduled', 'repair', 'inspection']),
  description: z.string().min(1, 'Описание обязательно'),
  scheduled_date: z.string().min(1, 'Дата обязательна'),
  completed_date: z.string().optional().nullable(),
  cost: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

// ============================================================================
// TEAM SCHEMAS
// ============================================================================

export const teamSchema = z.object({
  name: z.string().min(1, 'Название бригады обязательно'),
  description: z.string().optional().nullable(),
});

export type TeamFormData = z.infer<typeof teamSchema>;

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const createUserSchema = z.object({
  email: z.string().email('Некорректный email'),
  first_name: z.string().min(1, 'Имя обязательно'),
  last_name: z.string().min(1, 'Фамилия обязательна'),
  role: z.enum(['admin', 'manager', 'user']).default('user'),
  phone: z.string().optional().nullable(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
