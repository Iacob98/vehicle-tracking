import { z } from 'zod';

/**
 * Penalty Schema - Form Validation
 *
 * Matches database constraints from migration 007:
 * - amount: positive (> 0)
 * - date: required
 * - status: NOT NULL (default: 'open')
 * - vehicle_id: required (FK)
 * - user_id: optional (FK)
 */

// Penalty status enum
export const penaltyStatusSchema = z.enum(['open', 'paid', 'contested', 'cancelled'], {
  errorMap: () => ({ message: 'Выберите корректный статус штрафа' }),
});

// Main penalty schema
export const penaltySchema = z.object({
  vehicle_id: z
    .string({ required_error: 'Выберите автомобиль' })
    .uuid('Некорректный ID автомобиля'),

  user_id: z
    .string()
    .uuid('Некорректный ID пользователя')
    .nullable()
    .optional(),

  date: z
    .string({ required_error: 'Дата штрафа обязательна' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
      },
      { message: 'Дата штрафа не может быть в будущем' }
    ),

  amount: z
    .number({
      required_error: 'Сумма штрафа обязательна',
      invalid_type_error: 'Сумма должна быть числом',
    })
    .positive('Сумма штрафа должна быть положительной')
    .max(99999.99, 'Сумма штрафа слишком большая (максимум 99,999.99€)'),

  description: z
    .string()
    .max(1000, 'Описание слишком длинное (максимум 1000 символов)')
    .nullable()
    .optional(),

  photo_url: z
    .string()
    .url('Некорректный URL файла штрафа')
    .nullable()
    .optional(),

  status: penaltyStatusSchema.default('open'),
});

// Type inference
export type PenaltyFormData = z.infer<typeof penaltySchema>;

// Schema for penalty creation
export const createPenaltySchema = penaltySchema;

// Schema for penalty update
export const updatePenaltySchema = penaltySchema.partial().required({ vehicle_id: true, date: true, amount: true });

// Export status options
export const PENALTY_STATUS_OPTIONS = [
  { value: 'open', label: '🔴 Открыт' },
  { value: 'paid', label: '✅ Оплачен' },
  { value: 'contested', label: '⚠️ Оспаривается' },
  { value: 'cancelled', label: '❌ Отменен' },
] as const;
