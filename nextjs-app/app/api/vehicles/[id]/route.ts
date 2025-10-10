import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiForbidden, apiErrorFromUnknown, checkAuthentication, checkOrganizationId } from '@/lib/api-response';

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

    // Verify vehicle belongs to user's organization
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!vehicle || vehicle.organization_id !== orgId) {
      return apiForbidden('У вас нет доступа к этому автомобилю');
    }

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting vehicle', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/vehicles/[id]' });
  }
}
