import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiForbidden, apiErrorFromUnknown, checkAuthentication, checkOwnerOrOrganizationId } from '@/lib/api-response';
import { getUserQueryContext, canAccessResource } from '@/lib/query-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Получаем контекст пользователя
    const userContext = getUserQueryContext(user);

    // Verify team member belongs to user's organization
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!teamMember) {
      return apiForbidden('Член бригады не найден');
    }

    // Проверка доступа с учетом owner роли
    if (!canAccessResource(userContext, teamMember.organization_id)) {
      return apiForbidden('У вас нет доступа к этому члену бригады');
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting team member', id, orgId: teamMember.organization_id });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/team-members/[id]' });
  }
}
