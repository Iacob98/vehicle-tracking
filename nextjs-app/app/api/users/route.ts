import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate } from '@/lib/query-helpers';
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
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
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

    // Owner может создавать супер-админов БЕЗ organization_id (только для owner/admin ролей)
    // Для остальных ролей (manager/driver/viewer) organization_id обязателен
    if (!finalOrgId) {
      // Для owner/admin разрешаем NULL organization_id (супер-админ)
      if (role !== 'owner' && role !== 'admin') {
        return apiBadRequest('Organization ID обязателен для ролей manager, driver и viewer');
      }
      // Для owner/admin без organization_id - это нормально (супер-админ)
    }

    // Создаем Supabase Admin client для создания пользователя в auth.users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Создаем пользователя через Supabase Auth Admin API
    // Это создаст пользователя в auth.users с правильным bcrypt хешем пароля
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Автоматически подтверждаем email
      user_metadata: {
        first_name,
        last_name,
        role: role || 'viewer',
        organization_id: finalOrgId || null, // Явно устанавливаем null для супер-админа
        phone: phone || null,
      }
    });

    if (createUserError) {
      console.error('❌ Error creating auth user:', createUserError);

      // Обработка ошибки дублирования email
      if (createUserError.message?.includes('already registered') || createUserError.message?.includes('User already registered')) {
        return apiBadRequest('Пользователь с таким email уже существует');
      }

      return apiErrorFromUnknown(createUserError, {
        context: 'creating auth user',
        email,
      });
    }

    console.log('✅ User created successfully in auth.users:', authUser.user.id);

    // Теперь создаем запись в public.users
    // Trigger sync_auth_users_to_public должен автоматически создать запись,
    // но мы можем создать её явно для надежности
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.user.id)
      .single();

    if (publicError) {
      // Если trigger не сработал, создаем вручную
      console.log('⚠️  Public user not found, creating manually...');

      const { data: newPublicUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          organization_id: finalOrgId,
          email,
          first_name,
          last_name,
          role: role || 'viewer',
          phone: phone || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating public user:', insertError);
        return apiErrorFromUnknown(insertError, {
          context: 'creating public user record',
          authUserId: authUser.user.id,
        });
      }

      return apiSuccess({ user: newPublicUser });
    }

    return apiSuccess({ user: publicUser });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/users' });
  }
}
