import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';

/**
 * POST /api/team-members
 * Добавление нового участника в бригаду
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id (безопасно!)
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    const body = await request.json();
    const { team_id, first_name, last_name, phone, category } = body;

    // Валидация обязательных полей
    if (!team_id || !first_name || !last_name) {
      return apiBadRequest('Бригада, имя и фамилия обязательны');
    }

    const { data: member, error } = await supabase
      .from('team_members')
      .insert({
        team_id,
        organization_id: orgId, // Используем проверенный orgId с сервера
        first_name,
        last_name,
        phone: phone || null,
        category: category || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating team member',
        orgId,
        team_id,
      });
    }

    return apiSuccess({ member });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/team-members' });
  }
}
