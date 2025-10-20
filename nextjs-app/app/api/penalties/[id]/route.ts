import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiForbidden, apiErrorFromUnknown, checkAuthentication, checkOrganizationId } from '@/lib/api-response';
import { Permissions, type UserRole } from '@/lib/types/roles';

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

    // Проверка прав доступа (только admin и manager могут удалять штрафы)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на удаление штрафов');
    }

    // Delete penalty
    const { error: deleteError } = await supabase
      .from('penalties')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (deleteError) {
      return apiErrorFromUnknown(deleteError, { context: 'deleting penalty', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/penalties/[id]' });
  }
}
