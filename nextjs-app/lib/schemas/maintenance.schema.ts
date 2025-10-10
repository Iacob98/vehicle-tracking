import { z } from 'zod';

/**
 * Maintenance Schema - Form Validation
 *
 * Matches database requirements:
 * - date: required
 * - vehicle_id: required (FK)
 * - type: required
 */

// Maintenance type enum
export const maintenanceTypeSchema = z.enum([
  'inspection',
  'oil_change',
  'tire_change',
  'brake_service',
  'filter_replacement',
  'battery_replacement',
  'other',
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

// Export type options
export const MAINTENANCE_TYPE_OPTIONS = [
  { value: 'inspection', label: '🔍 Техосмотр / TÜV' },
  { value: 'oil_change', label: '🛢️ Замена масла / Ölwechsel' },
  { value: 'tire_change', label: '🛞 Замена шин / Reifenwechsel' },
  { value: 'brake_service', label: '🛑 Обслуживание тормозов / Bremsendienst' },
  { value: 'filter_replacement', label: '🔧 Замена фильтров / Filterwechsel' },
  { value: 'battery_replacement', label: '🔋 Замена аккумулятора / Batteriewechsel' },
  { value: 'other', label: '📦 Прочее / Sonstiges' },
] as const;
