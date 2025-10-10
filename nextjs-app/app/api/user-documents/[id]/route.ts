import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiErrorFromUnknown, checkAuthentication, checkOrganizationId } from '@/lib/api-response';

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

    // Soft delete - set is_active to false
    const { error: deleteError } = await supabase
      .from('user_documents')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (deleteError) {
      return apiErrorFromUnknown(deleteError, { context: 'soft deleting user document', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/user-documents/[id]' });
  }
}
