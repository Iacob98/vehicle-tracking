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
 * POST /api/car-expenses
 * Создание нового расхода на автомобиль
 *
 * Принимает JSON с полями:
 * - vehicle_id: string (required)
 * - category: string (required)
 * - amount: number (required)
 * - date: string (required)
 * - description: string (optional)
 * - maintenance_id: string (optional)
 * - receipt_url: string (optional)
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

    // Проверка прав доступа (только admin и manager могут создавать расходы)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на создание расходов');
    }

    // Получаем JSON
    const body = await request.json();
    const {
      vehicle_id,
      category,
      amount,
      date,
      description,
      maintenance_id,
      receipt_url,
    } = body;

    // Валидация обязательных полей
    if (!vehicle_id || !category || !amount || !date) {
      return apiBadRequest('Автомобиль, категория, сумма и дата обязательны');
    }

    // Подготовка данных для вставки
    const carExpenseData = {
      organization_id: orgId,
      vehicle_id,
      category,
      amount: parseFloat(amount),
      date,
      description: description || null,
      maintenance_id: maintenance_id || null,
      receipt_url: receipt_url || null,
    };

    // Вставка в базу данных
    const { data: carExpense, error } = await supabase
      .from('car_expenses')
      .insert(carExpenseData)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating car expense',
        orgId,
        vehicle_id,
      });
    }

    return apiSuccess({ carExpense });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/car-expenses' });
  }
}
