import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, applyOrgFilter, getOrgIdForCreate, canAccessResource } from '@/lib/query-helpers';

/**
 * GET /api/vehicle-ownership
 * Получить всю историю владения (с возможностью фильтрации по vehicle_id)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const authError = checkAuthentication(user);
    if (authError) return authError;

    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    const userContext = getUserQueryContext(user);

    // Получить vehicle_id из query params
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicle_id');

    let query = supabase
      .from('vehicle_ownership_history')
      .select('*')
      .order('start_date', { ascending: false });

    query = applyOrgFilter(query, userContext);

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }

    const { data, error } = await query;

    if (error) {
      return apiErrorFromUnknown(error, { context: 'fetching ownership history', vehicleId });
    }

    return apiSuccess({ ownership_history: data });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'GET /api/vehicle-ownership' });
  }
}

/**
 * POST /api/vehicle-ownership
 * Создать новую запись истории владения
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const authError = checkAuthentication(user);
    if (authError) return authError;

    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    const userContext = getUserQueryContext(user);

    const body = await request.json();
    const {
      vehicle_id,
      owner_name,
      owner_type,
      owner_contact,
      owner_address,
      start_date,
      end_date,
      purchase_price,
      sale_price,
      document_number,
      notes,
      organization_id,
    } = body;

    // Валидация обязательных полей
    if (!vehicle_id) {
      return apiBadRequest('vehicle_id обязателен');
    }
    if (!owner_name || owner_name.trim() === '') {
      return apiBadRequest('owner_name не может быть пустым');
    }
    if (!start_date) {
      return apiBadRequest('start_date обязателен');
    }

    const finalOrgId = getOrgIdForCreate(userContext, organization_id);

    // Проверить что автомобиль принадлежит организации
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, organization_id')
      .eq('id', vehicle_id)
      .single();

    if (!vehicle) {
      return apiBadRequest('Автомобиль не найден');
    }

    if (!canAccessResource(userContext, vehicle.organization_id)) {
      return apiBadRequest('У вас нет доступа к этому автомобилю');
    }

    // Если указана end_date, проверить что она >= start_date
    if (end_date && new Date(end_date) < new Date(start_date)) {
      return apiBadRequest('Дата окончания владения не может быть раньше даты начала');
    }

    // Создать запись
    const { data: ownership, error } = await supabase
      .from('vehicle_ownership_history')
      .insert({
        vehicle_id,
        organization_id: finalOrgId,
        owner_name: owner_name.trim(),
        owner_type: owner_type || 'individual',
        owner_contact: owner_contact || null,
        owner_address: owner_address || null,
        start_date,
        end_date: end_date || null,
        purchase_price: purchase_price || null,
        sale_price: sale_price || null,
        document_number: document_number || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, { context: 'creating ownership history', vehicle_id });
    }

    return apiSuccess({ ownership }, 201);
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/vehicle-ownership' });
  }
}
