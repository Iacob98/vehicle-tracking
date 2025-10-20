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
 * DELETE /api/car-expenses/[id]
 * Удаление расхода на автомобиль
 *
 * Проверяет:
 * - Авторизацию
 * - Принадлежность расхода к организации
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

    // Проверка прав доступа (только admin и manager могут удалять расходы)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на удаление расходов');
    }

    // Verify expense belongs to user's organization
    const { data: expense } = await supabase
      .from('car_expenses')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!expense || expense.organization_id !== orgId) {
      return apiForbidden('У вас нет доступа к этому расходу');
    }

    const { error } = await supabase
      .from('car_expenses')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting car expense', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/car-expenses/[id]' });
  }
}
