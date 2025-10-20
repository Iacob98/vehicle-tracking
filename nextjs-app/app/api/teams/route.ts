import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * POST /api/teams
 * Создание новой бригады
 *
 * Принимает JSON с полями:
 * - name: string (required)
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

    // Проверка прав доступа (только admin и manager могут создавать бригады)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageTeams(userRole)) {
      return apiForbidden('У вас нет прав на создание бригад');
    }

    // Получаем JSON
    const body = await request.json();
    const { name } = body;

    // Валидация обязательных полей
    if (!name) {
      return apiBadRequest('Название бригады обязательно');
    }

    // Подготовка данных для вставки
    const teamData = {
      organization_id: orgId,
      name,
      created_at: new Date().toISOString(),
    };

    // Вставка в базу данных
    const { data: team, error } = await supabase
      .from('teams')
      .insert(teamData)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating team',
        orgId,
        name,
      });
    }

    return apiSuccess({ team });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/teams' });
  }
}
