import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate } from '@/lib/query-helpers';
import { Permissions, type UserRole } from '@/lib/types/roles';

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

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав доступа (только admin и manager могут создавать записи обслуживания)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на создание записей обслуживания');
    }

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

    // Получаем контекст пользователя и определяем organization_id для создания
    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, body.organization_id);

    // Owner должен явно указать organization_id
    if (!finalOrgId) {
      return apiBadRequest('Organization ID обязателен для создания записи обслуживания');
    }

    // Подготовка данных для вставки
    const maintenanceData = {
      organization_id: finalOrgId,
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
        orgId: finalOrgId,
        vehicle_id,
      });
    }

    return apiSuccess({ maintenance });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/maintenance' });
  }
}
