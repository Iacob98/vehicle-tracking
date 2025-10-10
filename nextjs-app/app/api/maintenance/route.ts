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
 * - type: 'scheduled' | 'repair' | 'inspection' (required)
 * - scheduled_date: string (required)
 * - description: string (optional)
 * - notes: string (optional)
 * - completed_date: string (optional)
 * - cost: number (optional)
 * - mileage: number (optional)
 * - next_maintenance_date: string (optional)
 * - next_maintenance_mileage: number (optional)
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
      scheduled_date,
      description,
      notes,
      completed_date,
      cost,
      mileage,
      next_maintenance_date,
      next_maintenance_mileage,
    } = body;

    // Валидация обязательных полей
    if (!vehicle_id || !type || !scheduled_date) {
      return apiBadRequest('Автомобиль, тип и дата обязательны');
    }

    // Подготовка данных для вставки
    const maintenanceData = {
      organization_id: orgId,
      vehicle_id,
      type,
      scheduled_date,
      description: description || null,
      notes: notes || null,
      completed_date: completed_date || null,
      cost: cost ? parseFloat(cost) : null,
      mileage: mileage ? parseInt(mileage) : null,
      next_maintenance_date: next_maintenance_date || null,
      next_maintenance_mileage: next_maintenance_mileage ? parseInt(next_maintenance_mileage) : null,
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
