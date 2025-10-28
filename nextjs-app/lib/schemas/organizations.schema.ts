import { z } from 'zod';

/**
 * Zod schema для создания организации
 */
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Название организации обязательно')
    .max(255, 'Название слишком длинное (максимум 255 символов)')
    .trim(),
  telegram_chat_id: z
    .string()
    .max(255, 'Telegram Chat ID слишком длинный')
    .optional()
    .nullable(),
  subscription_status: z
    .enum(['active', 'inactive', 'suspended', 'trial'])
    .default('active')
    .optional(),
  subscription_expires_at: z
    .string()
    .datetime()
    .optional()
    .nullable(),
});

/**
 * Zod schema для обновления организации
 */
export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Название организации обязательно')
    .max(255, 'Название слишком длинное (максимум 255 символов)')
    .trim()
    .optional(),
  telegram_chat_id: z
    .string()
    .max(255, 'Telegram Chat ID слишком длинный')
    .optional()
    .nullable(),
  subscription_status: z
    .enum(['active', 'inactive', 'suspended', 'trial'])
    .optional(),
  subscription_expires_at: z
    .string()
    .datetime()
    .optional()
    .nullable(),
});

/**
 * TypeScript типы из Zod схем
 */
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
