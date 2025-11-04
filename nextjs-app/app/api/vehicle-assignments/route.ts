import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate, applyOrgFilter } from '@/lib/query-helpers';

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

    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    const body = await request.json();
    const { vehicle_id, team_id, start_date, end_date } = body;

    // Валидация обязательных полей
    if (!vehicle_id || !team_id || !start_date) {
      return apiBadRequest('Автомобиль, бригада и дата начала обязательны');
    }

    // Получаем контекст пользователя и определяем organization_id для создания
    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, body.organization_id);

    // Owner должен явно указать organization_id
    if (!finalOrgId) {
      return apiBadRequest('Organization ID обязателен для создания назначения');
    }

    // Проверка что автомобиль существует (owner может использовать любой автомобиль)
    let vehicleQuery = supabase
      .from('vehicles')
      .select('id')
      .eq('id', vehicle_id);

    vehicleQuery = applyOrgFilter(vehicleQuery, userContext);
    const { data: vehicle } = await vehicleQuery.single();

    if (!vehicle) {
      return apiBadRequest('Автомобиль не найден');
    }

    // Проверка что бригада существует (owner может использовать любую бригаду)
    let teamQuery = supabase
      .from('teams')
      .select('id')
      .eq('id', team_id);

    teamQuery = applyOrgFilter(teamQuery, userContext);
    const { data: team } = await teamQuery.single();

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
        organization_id: finalOrgId,
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
