import { createClient } from '@supabase/supabase-js';
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
 * - fuel_card_id: string (optional) - для категории fuel
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

    // После проверки авторизации user точно не null
    if (!user) {
      return apiForbidden('User not authenticated');
    }

    // Проверка organization_id с поддержкой owner роли
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
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
    const fuelCardId = formData.get('fuel_card_id') as string || null;

    if (!vehicleId || !category || !amount || !date) {
      return apiBadRequest('Автомобиль, категория, сумма и дата обязательны');
    }

    // Получаем контекст пользователя и определяем organization_id для создания
    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, formData.get('organization_id') as string | null);

    // Owner должен явно указать organization_id
    if (!finalOrgId) {
      return apiBadRequest('Organization ID обязателен для создания расхода');
    }

    // Проверка лимитов для топлива
    const amountNum = parseFloat(amount);
    let limitWarnings: string[] = [];

    // Variables for fuel consumption tracking
    let litersNum: number | null = null;
    let pricePerLiter: number | null = null;
    let odometerReading: number | null = null;
    let previousOdometerReading: number | null = null;
    let distanceTraveled: number | null = null;
    let expectedConsumption: number | null = null;
    let actualConsumption: number | null = null;
    let consumptionDifference: number | null = null;
    let hasAnomaly = false;

    if (category === 'fuel') {
      // Get liters and odometer reading (required for fuel)
      const litersStr = formData.get('liters') as string;
      const odometerStr = formData.get('odometer_reading') as string;

      if (!litersStr || !odometerStr) {
        return apiBadRequest('Для заправки обязательно указать литры и показания одометра');
      }

      litersNum = parseFloat(litersStr);
      odometerReading = parseInt(odometerStr, 10);

      if (isNaN(litersNum) || litersNum <= 0) {
        return apiBadRequest('Количество литров должно быть положительным числом');
      }

      if (isNaN(odometerReading) || odometerReading < 0) {
        return apiBadRequest('Показания одометра должны быть положительным числом');
      }

      // Calculate price per liter
      pricePerLiter = amountNum / litersNum;

      // Validate price per liter (sanity check)
      if (pricePerLiter < 0.5 || pricePerLiter > 5) {
        limitWarnings.push(`⚠️ Цена за литр ${pricePerLiter.toFixed(2)} EUR кажется необычной (обычно 0.5-5 EUR)`);
      }

      // Get last refuel for this vehicle to check odometer
      const { data: lastRefuel, error: lastRefuelError } = await supabase
        .from('car_expenses')
        .select('odometer_reading, date')
        .eq('vehicle_id', vehicleId)
        .eq('category', 'fuel')
        .not('odometer_reading', 'is', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastRefuelError) {
        console.error('Error fetching last refuel:', lastRefuelError);
      }

      // Validate odometer reading
      if (lastRefuel && lastRefuel.odometer_reading) {
        previousOdometerReading = lastRefuel.odometer_reading;

        if (odometerReading < previousOdometerReading) {
          return apiBadRequest(
            `Показания одометра (${odometerReading} км) не могут быть меньше предыдущего значения (${previousOdometerReading} км)`
          );
        }

        distanceTraveled = odometerReading - previousOdometerReading;

        // Sanity check: distance traveled should be reasonable
        if (distanceTraveled > 5000) {
          limitWarnings.push(
            `⚠️ Пройденное расстояние ${distanceTraveled} км кажется очень большим. Проверьте показания одометра.`
          );
        }
      }

      // Get vehicle type to calculate expected consumption
      if (distanceTraveled !== null && distanceTraveled > 0) {
        const { data: vehicle, error: vehicleError } = await supabase
          .from('vehicles')
          .select(`
            id,
            name,
            vehicle_type_id,
            vehicle_types (
              fuel_consumption_per_100km,
              tank_capacity
            )
          `)
          .eq('id', vehicleId)
          .single();

        if (vehicleError) {
          console.error('Error fetching vehicle:', vehicleError);
        } else if (vehicle && vehicle.vehicle_types) {
          const vehicleType = vehicle.vehicle_types as any;
          const fuelConsumptionPer100km = vehicleType.fuel_consumption_per_100km;
          const tankCapacity = vehicleType.tank_capacity;

          // Calculate expected consumption
          expectedConsumption = (distanceTraveled / 100) * fuelConsumptionPer100km;
          actualConsumption = litersNum;
          consumptionDifference = actualConsumption - expectedConsumption;

          // Check for anomaly (actual > expected * 1.15)
          const threshold = expectedConsumption * 1.15; // 15% амортизация
          hasAnomaly = actualConsumption > threshold;

          if (hasAnomaly) {
            const percentageOver = ((consumptionDifference / expectedConsumption) * 100).toFixed(1);
            limitWarnings.push(
              `⚠️ АНОМАЛИЯ: Заправлено ${actualConsumption.toFixed(1)}л, ожидалось ${expectedConsumption.toFixed(1)}л (+${consumptionDifference.toFixed(1)}л, +${percentageOver}%)`
            );
          }

          // Check tank capacity if specified
          if (tankCapacity && litersNum > tankCapacity) {
            limitWarnings.push(
              `⚠️ Заправлено ${litersNum}л больше емкости бака (${tankCapacity}л)`
            );
          }
        }
      }

      // Check fuel spending limits
      const limitCheck = await checkFuelLimits(finalOrgId, amountNum, fuelCardId);
      limitWarnings.push(...limitCheck.warnings);
    }

    // Загружаем фото чека если есть
    const receiptFile = formData.get('receipt') as File | null;
    let receiptUrl: string | null = null;

    if (receiptFile && receiptFile.size > 0) {
      try {
        // Generate file path
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${finalOrgId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload file using Service Role client (bypasses RLS)
        const { data, error: uploadError } = await supabaseAdmin.storage
          .from('expenses')
          .upload(fileName, receiptFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          const fileError = createFileUploadError('Ошибка загрузки фото чека', uploadError.message);
          return apiErrorFromUnknown(fileError, { context: 'uploading receipt photo', bucket: 'expenses', orgId: finalOrgId });
        }

        // Get signed URL for private bucket (expires in 1 year)
        const { data: signedData, error: signError } = await supabaseAdmin.storage
          .from('expenses')
          .createSignedUrl(data.path, 31536000); // 1 year in seconds

        if (signError) {
          const fileError = createFileUploadError('Ошибка создания signed URL', signError.message);
          return apiErrorFromUnknown(fileError, { context: 'creating signed URL', bucket: 'expenses', orgId: finalOrgId });
        }

        receiptUrl = signedData.signedUrl;
      } catch (error) {
        return apiErrorFromUnknown(error, { context: 'uploading receipt photo' });
      }
    }

    // Подготовка данных для вставки
    const carExpenseData: any = {
      organization_id: finalOrgId,
      vehicle_id: vehicleId,
      category,
      amount: amountNum,
      date,
      description: formData.get('description') as string || null,
      maintenance_id: formData.get('maintenance_id') as string || null,
      receipt_url: receiptUrl,
      created_by_user_id: user.id, // Сохраняем ID пользователя создавшего расход
      fuel_card_id: fuelCardId, // Сохраняем номер заправочной карты
    };

    // Add fuel tracking data if this is a fuel expense
    if (category === 'fuel') {
      carExpenseData.liters = litersNum;
      carExpenseData.price_per_liter = pricePerLiter;
      carExpenseData.odometer_reading = odometerReading;
      carExpenseData.previous_odometer_reading = previousOdometerReading;
      carExpenseData.distance_traveled = distanceTraveled;
      carExpenseData.expected_consumption = expectedConsumption;
      carExpenseData.actual_consumption = actualConsumption;
      carExpenseData.consumption_difference = consumptionDifference;
      carExpenseData.has_anomaly = hasAnomaly;
    }

    // Вставка в базу данных
    const { data: carExpense, error } = await supabase
      .from('car_expenses')
      .insert(carExpenseData)
      .select()
      .single();

    if (error) {
      return apiErrorFromUnknown(error, {
        context: 'creating car expense',
        orgId: finalOrgId,
        vehicleId,
      });
    }

    // Возвращаем результат с предупреждениями о лимитах и информацией об аномалии
    return apiSuccess({
      carExpense,
      warnings: limitWarnings.length > 0 ? limitWarnings : undefined,
      has_anomaly: hasAnomaly,
    });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/car-expenses' });
  }
}
