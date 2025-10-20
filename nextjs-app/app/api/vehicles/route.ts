import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';
import { uploadMultipleFiles } from '@/lib/storage';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * POST /api/vehicles
 * Создание нового автомобиля с загрузкой фотографий
 *
 * Принимает FormData с полями:
 * - name: string (required)
 * - license_plate: string (required)
 * - vin: string
 * - model: string
 * - year: number
 * - status: string
 * - is_rental: boolean
 * - rental_start_date: string
 * - rental_end_date: string
 * - rental_monthly_price: number
 * - photos: File[] (multiple files)
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

    // Проверка прав доступа (только admin и manager могут создавать vehicles)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на создание автомобилей');
    }

    // Получаем FormData
    const formData = await request.formData();

    // Валидация обязательных полей
    const name = formData.get('name') as string;
    const licensePlate = formData.get('license_plate') as string;

    if (!name || !licensePlate) {
      return apiBadRequest('Название и гос. номер обязательны');
    }

    // Загружаем фотографии
    const photoFiles = formData.getAll('photos') as File[];
    let photoUrls: string[] = [];

    if (photoFiles.length > 0 && photoFiles[0].size > 0) {
      try {
        photoUrls = await uploadMultipleFiles(photoFiles, 'vehicles', orgId);
      } catch (error) {
        return apiErrorFromUnknown(error, { context: 'uploading vehicle photos' });
      }
    }

    // Подготовка данных для вставки
    const vehicleData = {
      organization_id: orgId,
      name,
      license_plate: licensePlate,
      vin: formData.get('vin') as string || null,
      model: formData.get('model') as string || null,
      year: formData.get('year') ? parseInt(formData.get('year') as string) : null,
      status: formData.get('status') as string || 'active',
      photo_url: photoUrls.length > 0 ? photoUrls.join(';') : null,
      is_rental: formData.get('is_rental') === 'true',
      rental_monthly_price: formData.get('rental_monthly_price')
        ? parseFloat(formData.get('rental_monthly_price') as string)
        : null,
      rental_start_date: formData.get('rental_start_date') as string || null,
      rental_end_date: formData.get('rental_end_date') as string || null,
    };

    // Вставка в базу данных
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert(vehicleData)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating vehicle',
        orgId,
        name,
      });
    }

    return apiSuccess({ vehicle });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/vehicles' });
  }
}
