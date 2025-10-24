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
 * POST /api/car-expenses
 * Создание нового расхода на автомобиль с загрузкой фото чека
 *
 * Принимает FormData с полями:
 * - vehicle_id: string (required)
 * - category: string (required)
 * - amount: number (required)
 * - date: string (required)
 * - description: string (optional)
 * - maintenance_id: string (optional)
 * - receipt: File (optional)
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

    // Получаем FormData
    const formData = await request.formData();

    // Валидация обязательных полей
    const vehicleId = formData.get('vehicle_id') as string;
    const category = formData.get('category') as string;
    const amount = formData.get('amount') as string;
    const date = formData.get('date') as string;

    if (!vehicleId || !category || !amount || !date) {
      return apiBadRequest('Автомобиль, категория, сумма и дата обязательны');
    }

    // Загружаем фото чека если есть
    const receiptFile = formData.get('receipt') as File | null;
    let receiptUrl: string | null = null;

    if (receiptFile && receiptFile.size > 0) {
      try {
        receiptUrl = await uploadFile(receiptFile, 'expenses', orgId);
      } catch (error) {
        return apiErrorFromUnknown(error, { context: 'uploading receipt photo' });
      }
    }

    // Подготовка данных для вставки
    const carExpenseData = {
      organization_id: orgId,
      vehicle_id: vehicleId,
      category,
      amount: parseFloat(amount),
      date,
      description: formData.get('description') as string || null,
      maintenance_id: formData.get('maintenance_id') as string || null,
      receipt_url: receiptUrl,
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
        vehicleId,
      });
    }

    return apiSuccess({ carExpense });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/car-expenses' });
  }
}
