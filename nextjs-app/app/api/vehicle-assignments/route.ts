import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';

/**
 * POST /api/vehicle-assignments
 * Create a new vehicle assignment to a team
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const authError = checkAuthentication(user);
    if (authError) return authError;

    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    const body = await request.json();
    const { vehicle_id, team_id, start_date, end_date } = body;

    // Валидация обязательных полей
    if (!vehicle_id || !team_id || !start_date) {
      return apiBadRequest('Автомобиль, бригада и дата начала обязательны');
    }

    // Проверка что автомобиль принадлежит организации
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', vehicle_id)
      .eq('organization_id', orgId)
      .single();

    if (!vehicle) {
      return apiBadRequest('Автомобиль не найден');
    }

    // Проверка что бригада принадлежит организации
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('id', team_id)
      .eq('organization_id', orgId)
      .single();

    if (!team) {
      return apiBadRequest('Бригада не найдена');
    }

    // Проверка что нет активного назначения (без end_date)
    const { data: activeAssignment } = await supabase
      .from('vehicle_assignments')
      .select('id')
      .eq('vehicle_id', vehicle_id)
      .is('end_date', null)
      .single();

    if (activeAssignment) {
      return apiBadRequest('У автомобиля уже есть активное назначение. Завершите текущее назначение перед созданием нового.');
    }

    // Создать назначение
    const { data: assignment, error } = await supabase
      .from('vehicle_assignments')
      .insert({
        vehicle_id,
        team_id,
        start_date,
        end_date: end_date || null,
        organization_id: orgId,
      })
      .select(`
        *,
        team:teams(name)
      `)
      .single();

    if (error) {
      return apiErrorFromUnknown(error, { context: 'creating vehicle assignment', vehicle_id, team_id });
    }

    return apiSuccess({ assignment });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/vehicle-assignments' });
  }
}
