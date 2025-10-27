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
 * Получение лимитов топлива для организации
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

    // Получаем лимиты
    const { data: limits, error } = await supabase
      .from('fuel_limits')
      .select('*')
      .eq('organization_id', orgId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      return apiErrorFromUnknown(error, { context: 'fetching fuel limits', orgId });
    }

    // Если лимитов нет, возвращаем дефолтные значения
    const result = limits || {
      organization_id: orgId,
      daily_limit: 400,
      weekly_limit: 800,
      monthly_limit: 1800,
    };

    return apiSuccess({ limits: result });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'GET /api/fuel-limits' });
  }
}

/**
 * PUT /api/fuel-limits
 * Обновление лимитов топлива (только admin и manager)
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
    const { daily_limit, weekly_limit, monthly_limit } = body;

    // Валидация
    if (!daily_limit || !weekly_limit || !monthly_limit) {
      return apiBadRequest('Все лимиты обязательны');
    }

    if (daily_limit < 0 || weekly_limit < 0 || monthly_limit < 0) {
      return apiBadRequest('Лимиты не могут быть отрицательными');
    }

    // Проверяем существование записи
    const { data: existing } = await supabase
      .from('fuel_limits')
      .select('id')
      .eq('organization_id', orgId)
      .single();

    let result;

    if (existing) {
      // Обновляем существующую запись
      const { data, error } = await supabase
        .from('fuel_limits')
        .update({
          daily_limit: parseFloat(daily_limit),
          weekly_limit: parseFloat(weekly_limit),
          monthly_limit: parseFloat(monthly_limit),
        })
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) {
        return apiErrorFromUnknown(error, { context: 'updating fuel limits', orgId });
      }

      result = data;
    } else {
      // Создаем новую запись
      const { data, error } = await supabase
        .from('fuel_limits')
        .insert({
          organization_id: orgId,
          daily_limit: parseFloat(daily_limit),
          weekly_limit: parseFloat(weekly_limit),
          monthly_limit: parseFloat(monthly_limit),
        })
        .select()
        .single();

      if (error) {
        return apiErrorFromUnknown(error, { context: 'creating fuel limits', orgId });
      }

      result = data;
    }

    return apiSuccess({ limits: result });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'PUT /api/fuel-limits' });
  }
}
