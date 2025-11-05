import { z } from 'zod';

/**
 * Vehicle Type Schema
 * Defines expected fuel consumption for a type of vehicle
 */
export const vehicleTypeSchema = z.object({
  id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  name: z.string()
    .min(1, 'Название типа обязательно')
    .max(100, 'Название не должно превышать 100 символов')
    .trim(),
  fuel_consumption_per_100km: z.number()
    .positive('Расход топлива должен быть больше 0')
    .max(99.99, 'Расход не может превышать 99.99 л/100км')
    .refine(
      (val) => {
        // Check that we have at most 2 decimal places
        const decimalPlaces = (val.toString().split('.')[1] || '').length;
        return decimalPlaces <= 2;
      },
      { message: 'Максимум 2 знака после запятой' }
    ),
  tank_capacity: z.number()
    .int('Емкость бака должна быть целым числом')
    .positive('Емкость бака должна быть больше 0')
    .max(1000, 'Емкость бака не может превышать 1000 литров')
    .nullable()
    .optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

/**
 * Create Vehicle Type Schema
 * Used when creating a new vehicle type
 */
export const createVehicleTypeSchema = vehicleTypeSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

/**
 * Update Vehicle Type Schema
 * Used when updating an existing vehicle type
 */
export const updateVehicleTypeSchema = vehicleTypeSchema
  .omit({
    id: true,
    organization_id: true,
    created_at: true,
    updated_at: true,
  })
  .partial();

/**
 * TypeScript types derived from Zod schemas
 */
export type VehicleType = z.infer<typeof vehicleTypeSchema>;
export type CreateVehicleTypeData = z.infer<typeof createVehicleTypeSchema>;
export type UpdateVehicleTypeData = z.infer<typeof updateVehicleTypeSchema>;

/**
 * Form data type for vehicle type forms
 */
export type VehicleTypeFormData = {
  name: string;
  fuel_consumption_per_100km: number;
  tank_capacity?: number | null;
};
