import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate } from '@/lib/query-helpers';
import { createHash } from 'crypto';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * POST /api/users
 * Создание нового пользователя
 *
 * Принимает JSON с полями:
 * - email: string (required)
 * - password: string (required)
 * - first_name: string (required)
 * - last_name: string (required)
 * - role: string (required) - user role
 * - phone: string (optional)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав доступа (только admin может создавать пользователей)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageUsers(userRole)) {
      return apiForbidden('У вас нет прав на создание пользователей');
    }

    // Получаем JSON
    const body = await request.json();
    const { email, password, first_name, last_name, role, phone } = body;

    // Валидация обязательных полей
    if (!email || !password || !first_name || !last_name) {
      return apiBadRequest('Email, пароль, имя и фамилия обязательны');
    }

    // Валидация пароля
    if (password.length < 8) {
      return apiBadRequest('Пароль должен содержать минимум 8 символов');
    }

    // Получаем контекст пользователя и определяем organization_id для создания
    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, body.organization_id);

    // Owner должен явно указать organization_id
    if (!finalOrgId) {
      return apiBadRequest('Organization ID обязателен для создания пользователя');
    }

    // Хешируем пароль на сервере (безопасно!)
    const passwordHash = createHash('sha256')
      .update(password + 'fleet_management_salt_2025')
      .digest('hex');

    // Подготовка данных для вставки
    const userData = {
      organization_id: finalOrgId,
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      role: role || 'viewer', // Default role if not provided
      phone: phone || null,
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
        orgId: finalOrgId,
        email,
      });
    }

    return apiSuccess({ user: newUser });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/users' });
  }
}
