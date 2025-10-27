import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiBadRequest,
  apiForbidden,
  apiErrorFromUnknown,
  checkAuthentication,
  checkOrganizationId,
} from '@/lib/api-response';
import { createFileUploadError } from '@/lib/errors';
import { Permissions, type UserRole } from '@/lib/types/roles';
import { checkFuelLimits } from '@/lib/fuel-limits';

// Create Supabase client with Service Role key for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

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

    // Проверка прав доступа (admin, manager и driver могут создавать расходы)
    const userRole = (user!.user_metadata?.role || 'viewer') as UserRole;
    if (!Permissions.canAddExpenses(userRole)) {
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

    // Проверка лимитов для топлива
    const amountNum = parseFloat(amount);
    let limitWarnings: string[] = [];

    if (category === 'fuel') {
      const limitCheck = await checkFuelLimits(orgId, amountNum);
      limitWarnings = limitCheck.warnings;
      // Не блокируем операцию, только предупреждаем
    }

    // Загружаем фото чека если есть
    const receiptFile = formData.get('receipt') as File | null;
    let receiptUrl: string | null = null;

    if (receiptFile && receiptFile.size > 0) {
      try {
        // Generate file path
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${orgId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload file using Service Role client (bypasses RLS)
        const { data, error: uploadError } = await supabaseAdmin.storage
          .from('expenses')
          .upload(fileName, receiptFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          const fileError = createFileUploadError('Ошибка загрузки фото чека', uploadError.message);
          return apiErrorFromUnknown(fileError, { context: 'uploading receipt photo', bucket: 'expenses', orgId });
        }

        // Get signed URL for private bucket (expires in 1 year)
        const { data: signedData, error: signError } = await supabaseAdmin.storage
          .from('expenses')
          .createSignedUrl(data.path, 31536000); // 1 year in seconds

        if (signError) {
          const fileError = createFileUploadError('Ошибка создания signed URL', signError.message);
          return apiErrorFromUnknown(fileError, { context: 'creating signed URL', bucket: 'expenses', orgId });
        }

        receiptUrl = signedData.signedUrl;
      } catch (error) {
        return apiErrorFromUnknown(error, { context: 'uploading receipt photo' });
      }
    }

    // Подготовка данных для вставки
    const carExpenseData = {
      organization_id: orgId,
      vehicle_id: vehicleId,
      category,
      amount: amountNum,
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

    // Возвращаем результат с предупреждениями о лимитах
    return apiSuccess({
      carExpense,
      warnings: limitWarnings.length > 0 ? limitWarnings : undefined
    });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/car-expenses' });
  }
}
