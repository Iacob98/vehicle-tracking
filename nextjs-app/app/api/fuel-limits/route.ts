import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';
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
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Получаем URL параметры
    const { searchParams } = new URL(request.url);
    const fuelCardId = searchParams.get('fuel_card_id');

    // Если указана конкретная карта, возвращаем лимит для неё
    if (fuelCardId) {
      const { data: limit, error } = await supabase
        .from('fuel_limits')
        .select('*')
        .eq('organization_id', orgId)
        .eq('fuel_card_id', fuelCardId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        return apiErrorFromUnknown(error, { context: 'fetching fuel limit for card', orgId, fuelCardId });
      }

      // Если лимита для карты нет, возвращаем общий лимит организации или дефолт
      if (!limit) {
        const { data: defaultLimit } = await supabase
          .from('fuel_limits')
          .select('*')
          .eq('organization_id', orgId)
          .is('fuel_card_id', null)
          .single();

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
    const { data: limits, error } = await supabase
      .from('fuel_limits')
      .select('*')
      .eq('organization_id', orgId)
      .order('fuel_card_id', { ascending: true, nullsFirst: true });

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
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав (только admin и manager)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageFraudLimits(userRole)) {
      return apiForbidden('У вас нет прав на создание лимитов');
    }

    // Получаем данные
    const body = await request.json();
    const { fuel_card_id, daily_limit, weekly_limit, monthly_limit } = body;

    // Валидация
    if (!daily_limit || !weekly_limit || !monthly_limit) {
      return apiBadRequest('Все лимиты обязательны');
    }

    if (daily_limit < 0 || weekly_limit < 0 || monthly_limit < 0) {
      return apiBadRequest('Лимиты не могут быть отрицательными');
    }

    // Создаем новую запись
    const { data, error } = await supabase
      .from('fuel_limits')
      .insert({
        organization_id: orgId,
        fuel_card_id: fuel_card_id || null,
        daily_limit: parseFloat(daily_limit),
        weekly_limit: parseFloat(weekly_limit),
        monthly_limit: parseFloat(monthly_limit),
      })
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, { context: 'creating fuel limit', orgId, fuel_card_id });
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
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав (только admin и manager)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageFraudLimits(userRole)) {
      return apiForbidden('У вас нет прав на изменение лимитов');
    }

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
    const { data, error } = await supabase
      .from('fuel_limits')
      .update({
        fuel_card_id: fuel_card_id || null,
        daily_limit: parseFloat(daily_limit),
        weekly_limit: parseFloat(weekly_limit),
        monthly_limit: parseFloat(monthly_limit),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

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
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав (только admin)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (userRole !== 'admin' && userRole !== 'owner') {
      return apiForbidden('Только администратор может удалять лимиты');
    }

    // Получаем параметры
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiBadRequest('ID лимита обязателен');
    }

    // Удаляем запись
    const { error } = await supabase
      .from('fuel_limits')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting fuel limit', orgId, id });
    }

    return apiSuccess({ message: 'Лимит удалён' });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/fuel-limits' });
  }
}
