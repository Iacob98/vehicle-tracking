import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiForbidden,
  apiBadRequest,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';
import { uploadMultipleFiles } from '@/lib/storage';

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

    // Проверка organization_id
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Проверка что vehicle принадлежит организации пользователя
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingVehicle || existingVehicle.organization_id !== orgId) {
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
        newPhotoUrls = await uploadMultipleFiles(photoFiles, 'vehicles', orgId);
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
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'updating vehicle',
        id,
        orgId,
      });
    }

    return apiSuccess({ vehicle });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'PUT /api/vehicles/[id]' });
  }
}

export async function DELETE(
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

    // Проверка organization_id
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    // Verify vehicle belongs to user's organization
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (!vehicle || vehicle.organization_id !== orgId) {
      return apiForbidden('У вас нет доступа к этому автомобилю');
    }

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return apiErrorFromUnknown(error, { context: 'deleting vehicle', id, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'DELETE /api/vehicles/[id]' });
  }
}
