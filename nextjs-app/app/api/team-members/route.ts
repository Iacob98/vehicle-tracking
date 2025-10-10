import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiUnauthorized, apiBadRequest, apiErrorFromUnknown, checkAuthentication } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    const body = await request.json();
    const { team_id, organization_id, first_name, last_name, phone, category } = body;

    // Валидация обязательных полей
    if (!first_name || !last_name) {
      return apiBadRequest('First name and last name are required');
    }

    const { data: member, error } = await supabase
      .from('team_members')
      .insert({
        team_id,
        organization_id,
        first_name,
        last_name,
        phone: phone || null,
        category: category || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, { context: 'creating team member' });
    }

    return apiSuccess({ member });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/team-members' });
  }
}
