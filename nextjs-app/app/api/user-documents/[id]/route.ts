import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiErrorFromUnknown, checkAuthentication, checkOwnerOrOrganizationId } from '@/lib/api-response';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

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
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    const userContext = getUserQueryContext(user);

    // Soft delete - set is_active to false
    let query = supabase
      .from('user_documents')
      .update({ is_active: false })
      .eq('id', id);

    query = applyOrgFilter(query, userContext);

    const { error: deleteError } = await query;

    if (deleteError) {
      return apiErrorFromUnknown(deleteError, { context: 'soft deleting user document', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/user-documents/[id]' });
  }
}
