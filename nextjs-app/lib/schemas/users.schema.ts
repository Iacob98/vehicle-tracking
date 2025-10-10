import { z } from 'zod';

/**
 * User Schema - Form Validation
 *
 * Matches database constraints from migration 007:
 * - email: NOT NULL, not empty, unique per org
 * - first_name: NOT NULL, not empty
 * - last_name: NOT NULL, not empty
 * - role: admin | manager | driver | viewer (simplified from migration 008)
 */

// Упрощенные роли (migration 008)
export const userRoleSchema = z.enum(['admin', 'manager', 'driver', 'viewer']);

export const userSchema = z.object({
  email: z
    .string().min(1)
    .email('Некорректный формат email')
    .min(1, 'Email не может быть пустым')
    .max(255, 'Email слишком длинный')
    .toLowerCase(),

  first_name: z
    .string().min(1)
    .min(1, 'Имя не может быть пустым')
    .max(100, 'Имя слишком длинное')
    .regex(/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/u, 'Имя может содержать только буквы, пробелы и дефисы'),

  last_name: z
    .string().min(1)
    .min(1, 'Фамилия не может быть пустой')
    .max(100, 'Фамилия слишком длинная')
    .regex(/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/u, 'Фамилия может содержать только буквы, пробелы и дефисы'),

  phone: z
    .string()
    .regex(/^[+]?[\d\s\-()]+$/, 'Некорректный формат телефона')
    .max(20, 'Телефон слишком длинный')
    .nullable()
    .optional(),

  position: z
    .string()
    .max(100, 'Должность слишком длинная')
    .nullable()
    .optional(),

  photo_url: z
    .string()
    .url('Некорректный URL фотографии')
    .nullable()
    .optional(),
});

// Type inference
export type UserFormData = z.infer<typeof userSchema>;

// Schema for user creation (includes password and role)
export const createUserSchema = userSchema.extend({
  role: userRoleSchema,

  password: z
    .string().min(1)
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(100, 'Пароль слишком длинный')
    .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
    .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),

  confirmPassword: z.string().min(1),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

// Schema for user update (password optional)
export const updateUserSchema = userSchema.partial().required({ email: true, first_name: true, last_name: true });

// Schema for password change
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string().min(1)
      .min(8, 'Пароль должен содержать минимум 8 символов')
      .max(100, 'Пароль слишком длинный')
      .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
      .regex(/[a-z]/, 'Пароль должен содержать хотя бы одну строчную букву')
      .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
    confirmNewPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Новый пароль должен отличаться от текущего',
    path: ['newPassword'],
  });
