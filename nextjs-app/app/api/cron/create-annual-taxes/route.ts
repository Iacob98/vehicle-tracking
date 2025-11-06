import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiErrorFromUnknown } from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * GET /api/cron/create-annual-taxes
 *
 * Cron job для автоматического создания записей о ежегодном налоге
 *
 * Логика:
 * 1. Находит все автомобили с annual_tax_amount и tax_due_date
 * 2. Проверяет, что tax_due_date наступила или прошла
 * 3. Проверяет, что запись за текущий год еще не создана (last_tax_created_date)
 * 4. Создает car_expense с category='tax'
 * 5. Обновляет last_tax_created_date и tax_due_date (добавляет 1 год)
 *
 * Защита:
 * - Проверка Authorization header (Vercel Cron Secret)
 * - Идемпотентность: не создаст дубликатов за один год
 */
export async function GET(request: Request) {
  try {
    // Проверка авторизации для cron job
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServerClient();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const currentYear = new Date().getFullYear();

    // Найти автомобили с налогом, где:
    // 1. annual_tax_amount установлен
    // 2. tax_due_date наступила или прошла
    // 3. Запись за текущий год еще не создана
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .not('annual_tax_amount', 'is', null)
      .not('tax_due_date', 'is', null)
      .lte('tax_due_date', today)
      .or(`last_tax_created_date.is.null,last_tax_created_date.lt.${currentYear}-01-01`);

    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesError);
      return apiErrorFromUnknown(vehiclesError, { context: 'fetching vehicles for tax creation' });
    }

    if (!vehicles || vehicles.length === 0) {
      return apiSuccess({
        message: 'No vehicles found requiring tax expense creation',
        processed: 0,
      });
    }

    console.log(`Found ${vehicles.length} vehicles requiring tax expenses`);

    const results = {
      success: [] as string[],
      failed: [] as { vehicle_id: string; error: string }[],
    };

    // Обработать каждый автомобиль
    for (const vehicle of vehicles) {
      try {
        // Создать car_expense
        const { data: expense, error: expenseError } = await supabase
          .from('car_expenses')
          .insert({
            organization_id: vehicle.organization_id,
            vehicle_id: vehicle.id,
            category: 'tax',
            amount: vehicle.annual_tax_amount,
            date: vehicle.tax_due_date,
            description: `Автоматически созданный ежегодный налог для ${vehicle.name} (${vehicle.license_plate})`,
          })
          .select()
          .single();

        if (expenseError) {
          console.error(`Error creating expense for vehicle ${vehicle.id}:`, expenseError);
          results.failed.push({
            vehicle_id: vehicle.id,
            error: expenseError.message,
          });
          continue;
        }

        // Вычислить новую дату налога (добавить 1 год)
        const nextTaxDate = new Date(vehicle.tax_due_date);
        nextTaxDate.setFullYear(nextTaxDate.getFullYear() + 1);
        const nextTaxDateStr = nextTaxDate.toISOString().split('T')[0];

        // Обновить vehicle: last_tax_created_date и tax_due_date
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({
            last_tax_created_date: today,
            tax_due_date: nextTaxDateStr,
          })
          .eq('id', vehicle.id);

        if (updateError) {
          console.error(`Error updating vehicle ${vehicle.id}:`, updateError);
          results.failed.push({
            vehicle_id: vehicle.id,
            error: `Expense created but failed to update vehicle: ${updateError.message}`,
          });
          continue;
        }

        results.success.push(vehicle.id);
        console.log(`✅ Created tax expense for vehicle ${vehicle.id} (${vehicle.name})`);
      } catch (error: any) {
        console.error(`Unexpected error processing vehicle ${vehicle.id}:`, error);
        results.failed.push({
          vehicle_id: vehicle.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    return apiSuccess({
      message: `Processed ${vehicles.length} vehicles`,
      total: vehicles.length,
      succeeded: results.success.length,
      failed: results.failed.length,
      details: results,
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return apiErrorFromUnknown(error, { context: 'cron job: create-annual-taxes' });
  }
}
