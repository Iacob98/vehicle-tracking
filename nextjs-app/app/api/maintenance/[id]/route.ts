import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * DELETE /api/maintenance/[id]
 * Удаление записи о ТО
 *
 * Проверяет:
 * - Авторизацию
 * - Принадлежность ТО к организации
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

    // Проверка organization_id
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав доступа (только admin и manager могут удалять записи обслуживания)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на удаление записей обслуживания');
    }

    // Verify maintenance belongs to user's organization
    const { data: maintenance } = await supabase
      .from('maintenance')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!maintenance || maintenance.organization_id !== orgId) {
      return apiForbidden('У вас нет доступа к этой записи ТО');
    }

    const { error } = await supabase
      .from('maintenance')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting maintenance', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/maintenance/[id]' });
  }
}
