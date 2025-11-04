import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiForbidden,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOwnerOrOrganizationId,
} from '@/lib/api-response';
import { getUserQueryContext, canAccessResource } from '@/lib/query-helpers';
import { uploadMultipleFiles } from '@/lib/storage';
import { Permissions, type UserRole } from '@/lib/types/roles';

/**
 * PUT /api/vehicles/[id]
 * Обновление существующего автомобиля
 *
 * Принимает FormData с полями (все опциональные):
 * - name, license_plate, vin, model, year, status
 * - is_rental, rental_start_date, rental_end_date, rental_monthly_price
 * - photos: File[] (новые фотографии для добавления)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав доступа (только admin и manager могут редактировать vehicles)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на редактирование автомобилей');
    }

    // Получаем контекст пользователя
    const userContext = getUserQueryContext(user);

    // Проверка что vehicle принадлежит организации пользователя
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingVehicle) {
      return apiForbidden('Автомобиль не найден');
    }

    // Проверка доступа с учетом owner роли
    if (!canAccessResource(userContext, existingVehicle.organization_id)) {
      return apiForbidden('У вас нет доступа к этому автомобилю');
    }

    // Получаем FormData
    const formData = await request.formData();

    // Валидация обязательных полей
    const name = formData.get('name') as string;
    const licensePlate = formData.get('license_plate') as string;

    if (!name || !licensePlate) {
      return apiBadRequest('Название и гос. номер обязательны');
    }

    // Загружаем новые фотографии если есть
    const photoFiles = formData.getAll('photos') as File[];
    let newPhotoUrls: string[] = [];

    if (photoFiles.length > 0 && photoFiles[0].size > 0) {
      try {
        newPhotoUrls = await uploadMultipleFiles(photoFiles, 'vehicles', existingVehicle.organization_id);
      } catch (error) {
        return apiErrorFromUnknown(error, { context: 'uploading vehicle photos' });
      }
    }

    // Объединяем существующие и новые фото
    let finalPhotoUrl: string | null = existingVehicle.photo_url;
    if (newPhotoUrls.length > 0) {
      const existingUrls = existingVehicle.photo_url
        ? existingVehicle.photo_url.split(';')
        : [];
      finalPhotoUrl = [...existingUrls, ...newPhotoUrls].join(';');
    }

    // Подготовка данных для обновления
    const updateData = {
      name,
      license_plate: licensePlate,
      vin: formData.get('vin') as string || null,
      model: formData.get('model') as string || null,
      year: formData.get('year') ? parseInt(formData.get('year') as string) : null,
      status: formData.get('status') as string || 'active',
      photo_url: finalPhotoUrl,
      is_rental: formData.get('is_rental') === 'true',
      rental_monthly_price: formData.get('rental_monthly_price')
        ? parseFloat(formData.get('rental_monthly_price') as string)
        : null,
      rental_start_date: formData.get('rental_start_date') as string || null,
      rental_end_date: formData.get('rental_end_date') as string || null,
    };

    // Обновление в базе данных
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'updating vehicle',
        id,
        orgId: existingVehicle.organization_id,
      });
    }

    return apiSuccess({ vehicle });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'PUT /api/vehicles/[id]' });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Проверка прав доступа (только admin и manager могут удалять vehicles)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canManageVehicles(userRole)) {
      return apiForbidden('У вас нет прав на удаление автомобилей');
    }

    // Получаем контекст пользователя
    const userContext = getUserQueryContext(user);

    // Verify vehicle belongs to user's organization
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!vehicle) {
      return apiForbidden('Автомобиль не найден');
    }

    // Проверка доступа с учетом owner роли
    if (!canAccessResource(userContext, vehicle.organization_id)) {
      return apiForbidden('У вас нет доступа к этому автомобилю');
    }

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting vehicle', id, orgId: vehicle.organization_id });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/vehicles/[id]' });
  }
}
