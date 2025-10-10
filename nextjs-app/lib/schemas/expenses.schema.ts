import { z } from 'zod';

/**
 * Expense Schema - Form Validation
 *
 * Matches database constraints from migration 007:
 * - amount: positive (> 0)
 * - date: required
 * - type: required (vehicle or team)
 * - vehicle_id: required when type = 'vehicle'
 * - team_id: required when type = 'team'
 */

// Expense type enum
export const expenseTypeSchema = z.enum(['vehicle', 'team'], {
  errorMap: () => ({ message: 'Выберите тип расхода' }),
});

// Main expense schema
export const expenseSchema = z
  .object({
    type: expenseTypeSchema,

    vehicle_id: z
      .string()
      .uuid('Некорректный ID автомобиля')
      .nullable()
      .optional(),

    team_id: z
      .string()
      .uuid('Некорректный ID бригады')
      .nullable()
      .optional(),

    date: z
      .string({ required_error: 'Дата расхода обязательна' })
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
      .number({
        required_error: 'Сумма расхода обязательна',
        invalid_type_error: 'Сумма должна быть числом',
      })
      .positive('Сумма расхода должна быть положительной')
      .max(999999.99, 'Сумма расхода слишком большая (максимум 999,999.99€)'),

    description: z
      .string()
      .max(1000, 'Описание слишком длинное (максимум 1000 символов)')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // If type is 'vehicle', vehicle_id is required
      if (data.type === 'vehicle') {
        return !!data.vehicle_id;
      }
      return true;
    },
    {
      message: 'Выберите автомобиль для расхода на автомобиль',
      path: ['vehicle_id'],
    }
  )
  .refine(
    (data) => {
      // If type is 'team', team_id is required
      if (data.type === 'team') {
        return !!data.team_id;
      }
      return true;
    },
    {
      message: 'Выберите бригаду для расхода на бригаду',
      path: ['team_id'],
    }
  );

// Type inference
export type ExpenseFormData = z.infer<typeof expenseSchema>;

// Schema for expense creation
export const createExpenseSchema = expenseSchema;

// Schema for expense update
export const updateExpenseSchema = expenseSchema.partial().required({ type: true, date: true, amount: true });

// Export type options
export const EXPENSE_TYPE_OPTIONS = [
  { value: 'vehicle', label: '🚗 На автомобиль / Fahrzeug' },
  { value: 'team', label: '👥 На бригаду / Team' },
] as const;
