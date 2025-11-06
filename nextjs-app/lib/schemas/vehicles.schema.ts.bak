import { z } from 'zod';

/**
 * Vehicle Schema - Form Validation
 *
 * Matches database constraints from migration 007:
 * - name: NOT NULL, not empty
 * - license_plate: NOT NULL, not empty, unique per org
 * - vin: unique when provided, not empty
 * - year: 1900 to current_year + 1
 * - rental_monthly_price: positive when provided
 * - rental_dates: logical (end >= start when both present)
 */

// Vehicle status enum (matches database enum)
export const vehicleStatusSchema = z.enum(['active', 'repair', 'unavailable', 'rented'], {
  errorMap: () => ({ message: 'Выберите корректный статус автомобиля' }),
});

// Main vehicle schema
export const vehicleSchema = z
  .object({
    name: z
      .string({ required_error: 'Название обязательно' })
      .min(1, 'Название не может быть пустым')
      .max(255, 'Название слишком длинное (максимум 255 символов)'),

    license_plate: z
      .string({ required_error: 'Госномер обязателен' })
      .min(1, 'Госномер не может быть пустым')
      .max(50, 'Госномер слишком длинный')
      .regex(/^[A-Z0-9\s-]+$/i, 'Госномер может содержать только буквы, цифры, пробелы и дефисы')
      .transform((val) => val.trim().toUpperCase()),

    vin: z
      .string()
      .max(17, 'VIN не может быть длиннее 17 символов')
      .regex(/^[A-HJ-NPR-Z0-9]*$/i, 'VIN содержит недопустимые символы (I, O, Q не используются)')
      .transform((val) => val.trim().toUpperCase())
      .optional()
      .or(z.literal('')),

    model: z
      .string()
      .max(255, 'Модель слишком длинная')
      .optional()
      .or(z.literal('')),

    year: z
      .number({
        invalid_type_error: 'Год должен быть числом',
      })
      .int('Год должен быть целым числом')
      .min(1900, 'Год не может быть раньше 1900')
      .max(new Date().getFullYear() + 1, `Год не может быть больше ${new Date().getFullYear() + 1}`)
      .nullable()
      .optional(),

    status: vehicleStatusSchema.default('active'),

    // Photo URL (stored as semicolon-separated string)
    photo_url: z
      .string()
      .url('Некорректный URL фотографии')
      .nullable()
      .optional(),

    // Rental fields
    is_rental: z.boolean().default(false),

    rental_start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')
      .nullable()
      .optional(),

    rental_end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')
      .nullable()
      .optional(),

    rental_monthly_price: z
      .number({
        invalid_type_error: 'Цена должна быть числом',
      })
      .positive('Цена аренды должна быть положительной')
      .max(999999.99, 'Цена аренды слишком большая')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // If is_rental is false, rental fields should be null/empty
      if (!data.is_rental) {
        return true; // No validation needed
      }
      // If is_rental is true, at least rental_start_date should be present
      return !!data.rental_start_date;
    },
    {
      message: 'Для арендованного автомобиля необходимо указать дату начала аренды',
      path: ['rental_start_date'],
    }
  )
  .refine(
    (data) => {
      // Rental dates logical check: end_date >= start_date
      if (!data.rental_start_date || !data.rental_end_date) {
        return true; // Skip if either is missing
      }
      return new Date(data.rental_end_date) >= new Date(data.rental_start_date);
    },
    {
      message: 'Дата окончания аренды должна быть позже или равна дате начала',
      path: ['rental_end_date'],
    }
  );

// Type inference
export type VehicleFormData = z.infer<typeof vehicleSchema>;

// Schema for vehicle creation (without ID)
export const createVehicleSchema = vehicleSchema;

// Schema for vehicle update (all fields optional except ID)
export const updateVehicleSchema = vehicleSchema.partial().required({ name: true, license_plate: true, status: true });

// Export status options for Select components
export const VEHICLE_STATUS_OPTIONS = [
  { value: 'active', label: '🟢 Активен' },
  { value: 'repair', label: '🔧 Ремонт' },
  { value: 'unavailable', label: '🔴 Недоступен' },
  { value: 'rented', label: '🏢 Аренда' },
] as const;
