import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, canAccessResource } from '@/lib/query-helpers';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * DELETE /api/teams/[id]
 * Удаление бригады
 *
 * Проверяет:
 * - Авторизацию
 * - Принадлежность бригады к организации
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав доступа (только admin и manager могут удалять бригады)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageTeams(userRole)) {
      return apiForbidden('У вас нет прав на удаление бригад');
    }

    // Получаем контекст пользователя
    const userContext = getUserQueryContext(user);

    // Verify team belongs to user's organization
    const { data: team } = await supabase
      .from('teams')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!team) {
      return apiForbidden('Бригада не найдена');
    }

    // Проверка доступа с учетом owner роли
    if (!canAccessResource(userContext, team.organization_id)) {
      return apiForbidden('У вас нет доступа к этой бригаде');
    }

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting team', id, orgId: team.organization_id });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/teams/[id]' });
  }
}
