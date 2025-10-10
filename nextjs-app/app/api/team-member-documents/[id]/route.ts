import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiErrorFromUnknown, checkAuthentication } from '@/lib/api-response';

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

    const { error } = await supabase
      .from('team_member_documents')
      .delete()
      .eq('id', id);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting team member document', id });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/team-member-documents/[id]' });
  }
}
