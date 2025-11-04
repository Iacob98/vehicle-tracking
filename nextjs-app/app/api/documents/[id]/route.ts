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
 * DELETE /api/documents/[id]
 * Удаление документа (только admin и manager)
 */
export async function DELETE(
  _request: Request,
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
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав доступа (только admin и manager могут удалять documents)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на удаление документов');
    }

    const userContext = getUserQueryContext(user);

    // Verify document belongs to user's organization
    const { data: document } = await supabase
      .from('vehicle_documents')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!document || !canAccessResource(userContext, document.organization_id)) {
      return apiForbidden('У вас нет доступа к этому документу');
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('vehicle_documents')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting document', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/documents/[id]' });
  }
}
