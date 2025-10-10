import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';
import { createHash } from 'crypto';

/**
 * POST /api/users
 * Создание нового пользователя
 *
 * Принимает JSON с полями:
 * - email: string (required)
 * - password: string (required)
 * - first_name: string (required)
 * - last_name: string (required)
 * - phone: string (optional)
 * - position: string (optional)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Получаем JSON
    const body = await request.json();
    const { email, password, first_name, last_name, phone, position } = body;

    // Валидация обязательных полей
    if (!email || !password || !first_name || !last_name) {
      return apiBadRequest('Email, пароль, имя и фамилия обязательны');
    }

    // Валидация пароля
    if (password.length < 8) {
      return apiBadRequest('Пароль должен содержать минимум 8 символов');
    }

    // Хешируем пароль на сервере (безопасно!)
    const passwordHash = createHash('sha256')
      .update(password + 'fleet_management_salt_2025')
      .digest('hex');

    // Подготовка данных для вставки
    const userData = {
      organization_id: orgId,
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      phone: phone || null,
      position: position || null,
      created_at: new Date().toISOString(),
    };

    // Вставка в базу данных
    const { data: newUser, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      // Обработка уникального ограничения email
      if (error.code === '23505' && error.message.includes('email')) {
        return apiBadRequest('Пользователь с таким email уже существует в вашей организации');
      }

      return apiErrorFromUnknown(error, {
        context: 'creating user',
        orgId,
        email,
      });
    }

    return apiSuccess({ user: newUser });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/users' });
  }
}
