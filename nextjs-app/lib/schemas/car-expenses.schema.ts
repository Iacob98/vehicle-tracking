import { z } from 'zod';

/**
 * Car Expense Schema - Form Validation
 *
 * Matches database constraints from migration 007:
 * - amount: positive (> 0)
 * - date: required
 * - vehicle_id: required (FK)
 * - maintenance_id: optional (FK)
 */

// Car expense category enum
export const carExpenseCategorySchema = z.enum([
  'fuel',
  'maintenance',
  'repair',
  'insurance',
  'tax',
  'parking',
  'toll',
  'wash',
  'other',
]);

// Main car expense schema
export const carExpenseSchema = z.object({
  vehicle_id: z
    .string()
    .min(1, 'Выберите автомобиль')
    .uuid('Некорректный ID автомобиля'),

  maintenance_id: z
    .string()
    .uuid('Некорректный ID технического обслуживания')
    .nullable()
    .optional(),

  date: z
    .string()
    .min(1, 'Дата расхода обязательна')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },
      { message: 'Дата расхода не может быть в будущем' }
    ),

  amount: z
    .number()
    .positive('Сумма расхода должна быть положительной')
    .max(999999.99, 'Сумма расхода слишком большая (максимум 999,999.99€)'),

  category: carExpenseCategorySchema,

  description: z
    .string()
    .max(1000, 'Описание слишком длинное (максимум 1000 символов)')
    .nullable()
    .optional(),

  receipt_url: z
    .string()
    .url('Некорректный URL чека')
    .nullable()
    .optional(),

  mileage: z
    .number()
    .int('Пробег должен быть целым числом')
    .positive('Пробег должен быть положительным')
    .max(9999999, 'Пробег слишком большой')
    .nullable()
    .optional(),
});

// Type inference
export type CarExpenseFormData = z.infer<typeof carExpenseSchema>;

// Schema for car expense creation
export const createCarExpenseSchema = carExpenseSchema;

// Schema for car expense update
export const updateCarExpenseSchema = carExpenseSchema.partial().required({ vehicle_id: true, date: true, amount: true, category: true });

// Export category options
export const CAR_EXPENSE_CATEGORY_OPTIONS = [
  { value: 'fuel', label: '⛽ Топливо / Kraftstoff' },
  { value: 'maintenance', label: '🔧 ТО / Wartung' },
  { value: 'repair', label: '🛠️ Ремонт / Reparatur' },
  { value: 'insurance', label: '🛡️ Страховка / Versicherung' },
  { value: 'tax', label: '💶 Налог / Steuer' },
  { value: 'parking', label: '🅿️ Парковка / Parken' },
  { value: 'toll', label: '🛣️ Платные дороги / Maut' },
  { value: 'wash', label: '💧 Мойка / Autowäsche' },
  { value: 'other', label: '📦 Прочее / Sonstiges' },
] as const;
