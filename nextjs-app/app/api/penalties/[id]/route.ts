import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiForbidden, apiErrorFromUnknown, checkAuthentication, checkOwnerOrOrganizationId } from '@/lib/api-response';
import { getUserQueryContext, canAccessResource } from '@/lib/query-helpers';
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

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав доступа (только admin и manager могут удалять штрафы)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на удаление штрафов');
    }

    // Получаем контекст пользователя
    const userContext = getUserQueryContext(user);

    // Verify penalty belongs to user's organization
    const { data: penalty } = await supabase
      .from('penalties')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!penalty) {
      return apiForbidden('Штраф не найден');
    }

    // Проверка доступа с учетом owner роли
    if (!canAccessResource(userContext, penalty.organization_id)) {
      return apiForbidden('У вас нет доступа к этому штрафу');
    }

    // Delete penalty
    const { error: deleteError } = await supabase
      .from('penalties')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return apiErrorFromUnknown(deleteError, { context: 'deleting penalty', id, orgId: penalty.organization_id });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/penalties/[id]' });
  }
}
