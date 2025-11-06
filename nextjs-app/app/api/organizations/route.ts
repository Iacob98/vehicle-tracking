import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiCreated,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext } from '@/lib/query-helpers';
import { isSuperAdmin } from '@/lib/auth-helpers';
import { Permissions, type UserRole } from '@/lib/types/roles';
import { createOrganizationSchema } from '@/lib/schemas/organizations.schema';

/**
 * GET /api/organizations
 * Получение списка организаций
 * - Owner видит все организации
 * - Admin/Manager/Driver видят только свою организацию
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    if (!user) {
      return apiForbidden('User not authenticated');
    }

    // Проверяем является ли пользователь super admin
    // Super admin = owner ИЛИ (admin с organization_id = NULL)
    const userForCheck = {
      id: user.id,
      email: user.email!,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      role: user.user_metadata?.role || 'viewer',
      organization_id: user.user_metadata?.organization_id || null,
      phone: user.user_metadata?.phone || null
    };

    // Super admin видит все организации
    if (isSuperAdmin(userForCheck)) {
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        return apiErrorFromUnknown(error, {
          context: 'fetching all organizations for super admin',
        });
      }

      return apiSuccess(organizations);
    }

    // Остальные видят только свою организацию
    const { orgId, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'fetching user organization',
        orgId,
      });
    }

    // Возвращаем массив с одной организацией для консистентности API
    return apiSuccess([organization]);
  } catch (error) {
    return apiErrorFromUnknown(error, {
      context: 'GET /api/organizations',
    });
  }
}

/**
 * POST /api/organizations
 * Создание новой организации
 * Только для owner
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    if (!user) {
      return apiForbidden('User not authenticated');
    }

    // Проверка прав - только super admin может создавать организации
    const userForCheck = {
      id: user.id,
      email: user.email!,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      role: user.user_metadata?.role || 'viewer',
      organization_id: user.user_metadata?.organization_id || null,
      phone: user.user_metadata?.phone || null
    };
    if (!isSuperAdmin(userForCheck)) {
      return apiForbidden('Только super admin может создавать организации');
    }

    // Получение и валидация данных
    const body = await request.json();
    const validationResult = createOrganizationSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return apiBadRequest(errorMessages);
    }

    const organizationData = validationResult.data;

    // Создание организации
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name: organizationData.name,
        telegram_chat_id: organizationData.telegram_chat_id || null,
        subscription_status: organizationData.subscription_status || 'active',
        subscription_expires_at: organizationData.subscription_expires_at || null,
      })
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating organization',
      });
    }

    return apiCreated(organization);
  } catch (error) {
    return apiErrorFromUnknown(error, {
      context: 'POST /api/organizations',
    });
  }
}
