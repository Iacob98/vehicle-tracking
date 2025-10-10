import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';

/**
 * POST /api/maintenance
 * Создание новой записи обслуживания
 *
 * Принимает JSON с полями:
 * - vehicle_id: string (required)
 * - type: maintenance_type (required)
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
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Получаем JSON
    const body = await request.json();
    const {
      vehicle_id,
      type,
      date,
      description,
    } = body;

    // Валидация обязательных полей
    if (!vehicle_id || !type || !date) {
      return apiBadRequest('Автомобиль, тип и дата обязательны');
    }

    // Подготовка данных для вставки
    const maintenanceData = {
      organization_id: orgId,
      vehicle_id,
      type,
      date,
      description: description || null,
    };

    // Вставка в базу данных
    const { data: maintenance, error } = await supabase
      .from('maintenances')
      .insert(maintenanceData)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating maintenance',
        orgId,
        vehicle_id,
      });
    }

    return apiSuccess({ maintenance });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/maintenance' });
  }
}
