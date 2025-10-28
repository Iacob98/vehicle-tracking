import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, applyOrgFilter, getOrgIdForCreate } from '@/lib/query-helpers';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * GET /api/fuel-limits
 * Получение всех лимитов топлива для организации (по заправочным картам)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    const userContext = getUserQueryContext(user);

    // Получаем URL параметры
    const { searchParams } = new URL(request.url);
    const fuelCardId = searchParams.get('fuel_card_id');

    // Если указана конкретная карта, возвращаем лимит для неё
    if (fuelCardId) {
      let query = supabase
        .from('fuel_limits')
        .select('*')
        .eq('fuel_card_id', fuelCardId);

      query = applyOrgFilter(query, userContext);

      const { data: limit, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        return apiErrorFromUnknown(error, { context: 'fetching fuel limit for card', orgId, fuelCardId });
      }

      // Если лимита для карты нет, возвращаем общий лимит организации или дефолт
      if (!limit) {
        let defaultQuery = supabase
          .from('fuel_limits')
          .select('*')
          .is('fuel_card_id', null);

        defaultQuery = applyOrgFilter(defaultQuery, userContext);

        const { data: defaultLimit } = await defaultQuery.single();

        const result = defaultLimit || {
          organization_id: orgId,
          fuel_card_id: null,
          daily_limit: 400,
          weekly_limit: 800,
          monthly_limit: 1800,
        };

        return apiSuccess({ limit: result });
      }

      return apiSuccess({ limit });
    }

    // Получаем все лимиты организации
    let query = supabase
      .from('fuel_limits')
      .select('*')
      .order('fuel_card_id', { ascending: true, nullsFirst: true });

    query = applyOrgFilter(query, userContext);

    const { data: limits, error } = await query;

    if (error) {
      return apiErrorFromUnknown(error, { context: 'fetching fuel limits', orgId });
    }

    return apiSuccess({ limits: limits || [] });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'GET /api/fuel-limits' });
  }
}

/**
 * POST /api/fuel-limits
 * Создание нового лимита для заправочной карты (только admin и manager)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав (только admin и manager)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageFraudLimits(userRole)) {
      return apiForbidden('У вас нет прав на создание лимитов');
    }

    // Получаем данные
    const body = await request.json();
    const { fuel_card_id, daily_limit, weekly_limit, monthly_limit, organization_id } = body;

    // Валидация
    if (!daily_limit || !weekly_limit || !monthly_limit) {
      return apiBadRequest('Все лимиты обязательны');
    }

    if (daily_limit < 0 || weekly_limit < 0 || monthly_limit < 0) {
      return apiBadRequest('Лимиты не могут быть отрицательными');
    }

    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, organization_id);

    // Создаем новую запись
    const { data, error } = await supabase
      .from('fuel_limits')
      .insert({
        organization_id: finalOrgId,
        fuel_card_id: fuel_card_id || null,
        daily_limit: parseFloat(daily_limit),
        weekly_limit: parseFloat(weekly_limit),
        monthly_limit: parseFloat(monthly_limit),
      })
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, { context: 'creating fuel limit', orgId: finalOrgId, fuel_card_id });
    }

    return apiSuccess({ limit: data });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/fuel-limits' });
  }
}

/**
 * PUT /api/fuel-limits
 * Обновление лимита топлива для заправочной карты (только admin и manager)
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав (только admin и manager)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageFraudLimits(userRole)) {
      return apiForbidden('У вас нет прав на изменение лимитов');
    }

    const userContext = getUserQueryContext(user);

    // Получаем данные
    const body = await request.json();
    const { id, fuel_card_id, daily_limit, weekly_limit, monthly_limit } = body;

    // Валидация
    if (!id) {
      return apiBadRequest('ID лимита обязателен');
    }

    if (!daily_limit || !weekly_limit || !monthly_limit) {
      return apiBadRequest('Все лимиты обязательны');
    }

    if (daily_limit < 0 || weekly_limit < 0 || monthly_limit < 0) {
      return apiBadRequest('Лимиты не могут быть отрицательными');
    }

    // Обновляем запись
    let query = supabase
      .from('fuel_limits')
      .update({
        fuel_card_id: fuel_card_id || null,
        daily_limit: parseFloat(daily_limit),
        weekly_limit: parseFloat(weekly_limit),
        monthly_limit: parseFloat(monthly_limit),
      })
      .eq('id', id);

    query = applyOrgFilter(query, userContext);

    const { data, error } = await query.select().single();

    if (error) {
      return apiErrorFromUnknown(error, { context: 'updating fuel limit', orgId, id });
    }

    return apiSuccess({ limit: data });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'PUT /api/fuel-limits' });
  }
}

/**
 * DELETE /api/fuel-limits
 * Удаление лимита топлива (только admin)
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав (только admin)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (userRole !== 'admin' && userRole !== 'owner') {
      return apiForbidden('Только администратор может удалять лимиты');
    }

    const userContext = getUserQueryContext(user);

    // Получаем параметры
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiBadRequest('ID лимита обязателен');
    }

    // Удаляем запись
    let query = supabase
      .from('fuel_limits')
      .delete()
      .eq('id', id);

    query = applyOrgFilter(query, userContext);

    const { error } = await query;

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting fuel limit', orgId, id });
    }

    return apiSuccess({ message: 'Лимит удалён' });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/fuel-limits' });
  }
}
