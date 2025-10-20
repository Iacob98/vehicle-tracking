import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';
import { uploadFile } from '@/lib/storage';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * POST /api/penalties
 * Создание нового штрафа с загрузкой фото
 *
 * Принимает FormData с полями:
 * - vehicle_id: string (required)
 * - user_id: string (optional)
 * - amount: number (required)
 * - date: string (required)
 * - description: string (optional)
 * - status: string (default: 'open')
 * - photo: File (optional)
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

    // Проверка прав доступа (только admin и manager могут создавать штрафы)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на создание штрафов');
    }

    // Получаем FormData
    const formData = await request.formData();

    // Валидация обязательных полей
    const vehicleId = formData.get('vehicle_id') as string;
    const amount = formData.get('amount') as string;
    const date = formData.get('date') as string;

    if (!vehicleId || !amount || !date) {
      return apiBadRequest('Автомобиль, сумма и дата обязательны');
    }

    // Загружаем фото если есть
    const photoFile = formData.get('photo') as File | null;
    let photoUrl: string | null = null;

    if (photoFile && photoFile.size > 0) {
      try {
        photoUrl = await uploadFile(photoFile, 'penalties', orgId);
      } catch (error) {
        return apiErrorFromUnknown(error, { context: 'uploading penalty photo' });
      }
    }

    // Подготовка данных для вставки
    const penaltyData = {
      organization_id: orgId,
      vehicle_id: vehicleId,
      user_id: formData.get('user_id') as string || null,
      amount: parseFloat(amount),
      date,
      description: formData.get('description') as string || null,
      photo_url: photoUrl,
      status: formData.get('status') as string || 'open',
    };

    // Вставка в базу данных
    const { data: penalty, error } = await supabase
      .from('penalties')
      .insert(penaltyData)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating penalty',
        orgId,
        vehicleId,
      });
    }

    return apiSuccess({ penalty });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/penalties' });
  }
}
