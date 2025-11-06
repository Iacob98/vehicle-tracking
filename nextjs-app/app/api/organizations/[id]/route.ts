import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiNotFound,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext } from '@/lib/query-helpers';
import { isSuperAdmin } from '@/lib/auth-helpers';
import { Permissions, type UserRole } from '@/lib/types/roles';
import { updateOrganizationSchema } from '@/lib/schemas/organizations.schema';

/**
 * GET /api/organizations/[id]
 * Получение информации об организации
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    if (!user) {
      return apiForbidden('User not authenticated');
    }

    const { id } = await params;

    // Проверяем является ли пользователь super admin
    const userForCheck = {
      id: user.id,
      email: user.email!,
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      role: user.user_metadata?.role || 'viewer',
      organization_id: user.user_metadata?.organization_id || null,
      phone: user.user_metadata?.phone || null
    };

    // Super admin может получить любую организацию
    if (isSuperAdmin(userForCheck)) {
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !organization) {
        return apiNotFound('Организация не найдена');
      }

      return apiSuccess(organization);
    }

    // Остальные могут получить только свою организацию
    const { orgId, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    if (id !== orgId) {
      return apiForbidden('У вас нет доступа к этой организации');
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !organization) {
      return apiNotFound('Организация не найдена');
    }

    return apiSuccess(organization);
  } catch (error) {
    return apiErrorFromUnknown(error, {
      context: 'GET /api/organizations/[id]',
    });
  }
}

/**
 * PUT /api/organizations/[id]
 * Обновление организации
 * - Owner может обновить любую организацию
 * - Admin может обновить только свою организацию
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    if (!user) {
      return apiForbidden('User not authenticated');
    }

    const { id } = await params;
    const userRole = (user.user_metadata?.role || 'viewer') as UserRole;

    // Проверка прав - owner или admin
    if (userRole !== 'owner' && userRole !== 'admin') {
      return apiForbidden('У вас нет прав на редактирование организаций');
    }

    // Admin может редактировать только свою организацию
    if (userRole === 'admin') {
      const { orgId, error: orgError } = checkOwnerOrOrganizationId(user);
      if (orgError) return orgError;

      if (id !== orgId) {
        return apiForbidden('Вы можете редактировать только свою организацию');
      }
    }

    // Проверка существования организации
    const { data: existingOrg, error: checkError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingOrg) {
      return apiNotFound('Организация не найдена');
    }

    // Получение и валидация данных
    const body = await request.json();
    const validationResult = updateOrganizationSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return apiBadRequest(errorMessages);
    }

    const updateData = validationResult.data;

    // Обновление организации
    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'updating organization',
        id,
      });
    }

    return apiSuccess(organization);
  } catch (error) {
    return apiErrorFromUnknown(error, {
      context: 'PUT /api/organizations/[id]',
    });
  }
}

/**
 * DELETE /api/organizations/[id]
 * Удаление организации
 * Только для owner
 * Блокирует удаление если есть связанные данные
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    if (!user) {
      return apiForbidden('User not authenticated');
    }

    const { id } = await params;
    const userRole = (user.user_metadata?.role || 'viewer') as UserRole;

    // Проверка прав - только owner
    if (!Permissions.canManageOrganizations(userRole)) {
      return apiForbidden('Только owner может удалять организации');
    }

    // Проверка существования организации
    const { data: existingOrg, error: checkError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError || !existingOrg) {
      return apiNotFound('Организация не найдена');
    }

    // Проверка на наличие пользователей
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', id)
      .limit(1);

    if (usersError) {
      return apiErrorFromUnknown(usersError, {
        context: 'checking users',
      });
    }

    if (users && users.length > 0) {
      return apiBadRequest(
        'Невозможно удалить организацию: в ней есть пользователи. Сначала удалите всех пользователей.'
      );
    }

    // Проверка на наличие автомобилей
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('organization_id', id)
      .limit(1);

    if (vehiclesError) {
      return apiErrorFromUnknown(vehiclesError, {
        context: 'checking vehicles',
      });
    }

    if (vehicles && vehicles.length > 0) {
      return apiBadRequest(
        'Невозможно удалить организацию: в ней есть автомобили. Сначала удалите все автомобили.'
      );
    }

    // Проверка на наличие расходов
    const { data: expenses, error: expensesError } = await supabase
      .from('car_expenses')
      .select('id')
      .eq('organization_id', id)
      .limit(1);

    if (expensesError) {
      return apiErrorFromUnknown(expensesError, {
        context: 'checking expenses',
      });
    }

    if (expenses && expenses.length > 0) {
      return apiBadRequest(
        'Невозможно удалить организацию: в ней есть расходы. Сначала удалите все данные.'
      );
    }

    // Удаление организации
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return apiErrorFromUnknown(deleteError, {
        context: 'deleting organization',
        id,
      });
    }

    return apiSuccess({ id, message: `Организация "${existingOrg.name}" успешно удалена` });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      context: 'DELETE /api/organizations/[id]',
    });
  }
}
