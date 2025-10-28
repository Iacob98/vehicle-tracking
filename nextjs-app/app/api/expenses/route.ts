import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate } from '@/lib/query-helpers';

/**
 * POST /api/expenses
 * Создание нового расхода
 *
 * Принимает JSON с полями:
 * - type: 'vehicle' | 'team' | 'general' (required)
 * - vehicle_id: string (required if type === 'vehicle')
 * - team_id: string (required if type === 'team')
 * - amount: number (required)
 * - date: string (required)
 * - description: string (optional)
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

    // Получаем JSON
    const body = await request.json();
    const { type, vehicle_id, team_id, amount, date, description, organization_id } = body;

    // Валидация обязательных полей
    if (!type || !amount || !date) {
      return apiBadRequest('Тип, сумма и дата обязательны');
    }

    // Валидация связанных полей
    if (type === 'vehicle' && !vehicle_id) {
      return apiBadRequest('Для расхода на автомобиль требуется vehicle_id');
    }

    if (type === 'team' && !team_id) {
      return apiBadRequest('Для расхода на бригаду требуется team_id');
    }

    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, organization_id);

    // Подготовка данных для вставки
    const expenseData = {
      organization_id: finalOrgId,
      type,
      vehicle_id: type === 'vehicle' ? vehicle_id : null,
      team_id: type === 'team' ? team_id : null,
      amount: parseFloat(amount),
      date,
      description: description || null,
    };

    // Вставка в базу данных
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating expense',
        orgId: finalOrgId,
        type,
      });
    }

    return apiSuccess({ expense });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/expenses' });
  }
}
