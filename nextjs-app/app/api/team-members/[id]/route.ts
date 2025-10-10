import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiForbidden, apiErrorFromUnknown, checkAuthentication, checkOrganizationId } from '@/lib/api-response';

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

    // Проверка organization_id
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Verify team member belongs to user's organization
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!teamMember || teamMember.organization_id !== orgId) {
      return apiForbidden('У вас нет доступа к этому члену бригады');
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting team member', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/team-members/[id]' });
  }
}
