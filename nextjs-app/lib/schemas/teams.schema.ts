import { z } from 'zod';

/**
 * Team Schema - Form Validation
 *
 * Matches database constraints from migration 007:
 * - name: NOT NULL, not empty, unique per org
 */

export const teamSchema = z.object({
  name: z
    .string().min(1)
    .min(1, 'Название не может быть пустым')
    .max(255, 'Название слишком длинное (максимум 255 символов)')
    .regex(/^[a-zA-Zа-яА-ЯёЁ0-9\s\-._]+$/u, 'Название может содержать только буквы, цифры, пробелы и символы - . _'),
});

// Type inference
export type TeamFormData = z.infer<typeof teamSchema>;

// Schema for team creation
export const createTeamSchema = teamSchema;

// Schema for team update
export const updateTeamSchema = teamSchema.partial().required({ name: true });
