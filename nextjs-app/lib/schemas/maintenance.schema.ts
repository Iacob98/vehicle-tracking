import { z } from 'zod';

/**
 * Maintenance Schema - Form Validation
 *
 * Matches database requirements:
 * - date: required
 * - vehicle_id: required (FK)
 * - type: required
 */

// Maintenance type enum (matches database maintenance_type enum)
export const maintenanceTypeSchema = z.enum([
  'inspection',
  'repair',
]);

// Main maintenance schema
export const maintenanceSchema = z.object({
  vehicle_id: z
    .string().min(1, 'Выберите автомобиль')
    .uuid('Некорректный ID автомобиля'),

  date: z
    .string().min(1, 'Дата обслуживания обязательна')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD'),

  type: maintenanceTypeSchema,

  description: z
    .string()
    .max(1000, 'Описание слишком длинное (максимум 1000 символов)')
    .nullable()
    .optional(),
});

// Type inference
export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

// Schema for maintenance creation
export const createMaintenanceSchema = maintenanceSchema;

// Schema for maintenance update
export const updateMaintenanceSchema = maintenanceSchema.partial().required({ vehicle_id: true, date: true, type: true });

// Export type options (matches database maintenance_type enum)
export const MAINTENANCE_TYPE_OPTIONS = [
  { value: 'inspection', label: '🔍 Техосмотр / TÜV' },
  { value: 'repair', label: '🔧 Ремонт / Reparatur' },
] as const;
