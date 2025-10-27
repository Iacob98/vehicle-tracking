import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RefuelForm } from './RefuelForm';
import Link from 'next/link';
import { getFuelLimits, calculateFuelUsage } from '@/lib/fuel-limits';

export default async function NewRefuelPage() {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Получаем информацию о водителе с fuel_card_id
  const { data: user } = await supabase
    .from('users')
    .select('id, team_id, fuel_card_id, organization_id')
    .eq('id', authUser.id)
    .single();

  if (!user?.team_id) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard/driver"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Назад на главную
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            ⛽ Добавить заправку
          </h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 text-lg">
                Вы не назначены в бригаду
              </h3>
              <p className="text-yellow-700 mt-2">
                Для добавления расходов необходимо быть в бригаде с назначенным автомобилем.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Получаем авто водителя через бригаду
  const { data: assignment } = await supabase
    .from('vehicle_assignments')
    .select('vehicle_id, vehicles(id, name, license_plate)')
    .eq('team_id', user.team_id)
    .is('end_date', null)
    .single();

  if (!assignment || !assignment.vehicles) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard/driver"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Назад на главную
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            ⛽ Добавить заправку
          </h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 text-lg">
                Автомобиль не назначен
              </h3>
              <p className="text-yellow-700 mt-2">
                Для добавления расходов необходимо, чтобы на вашу бригаду был назначен автомобиль.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const vehicle = assignment.vehicles as any;

  // Получаем лимиты и текущие расходы
  const orgId = user.organization_id;
  const fuelCardId = user.fuel_card_id;

  const limits = await getFuelLimits(orgId, fuelCardId);
  const usage = await calculateFuelUsage(orgId, fuelCardId);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="mb-6">
        <Link
          href="/dashboard/driver"
          className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
        >
          ← Назад на главную
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          ⛽ Добавить заправку
        </h1>
        <p className="text-gray-600 mt-2">
          Зарегистрируйте расход на топливо
        </p>
      </div>

      {/* Карточка с лимитами и расходами */}
      {limits && (
        <div className="bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">📊</div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Ваши расходы на топливо
              </h2>
              {fuelCardId && (
                <p className="text-sm text-gray-600">
                  Карта: <span className="font-mono font-semibold">{fuelCardId}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Дневной лимит */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-600 mb-1">📅 Сегодня</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${
                  usage.daily > limits.daily_limit ? 'text-red-600' : 'text-green-600'
                }`}>
                  €{usage.daily.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">/ €{limits.daily_limit}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.daily > limits.daily_limit ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((usage.daily / limits.daily_limit) * 100, 100)}%` }}
                />
              </div>
              {usage.daily > limits.daily_limit && (
                <p className="text-xs text-red-600 mt-1 font-semibold">
                  Превышение: €{(usage.daily - limits.daily_limit).toFixed(2)}
                </p>
              )}
            </div>

            {/* Недельный лимит */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-600 mb-1">📆 Эта неделя</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${
                  usage.weekly > limits.weekly_limit ? 'text-red-600' : 'text-green-600'
                }`}>
                  €{usage.weekly.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">/ €{limits.weekly_limit}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.weekly > limits.weekly_limit ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((usage.weekly / limits.weekly_limit) * 100, 100)}%` }}
                />
              </div>
              {usage.weekly > limits.weekly_limit && (
                <p className="text-xs text-red-600 mt-1 font-semibold">
                  Превышение: €{(usage.weekly - limits.weekly_limit).toFixed(2)}
                </p>
              )}
            </div>

            {/* Месячный лимит */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-600 mb-1">🗓️ Этот месяц</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${
                  usage.monthly > limits.monthly_limit ? 'text-red-600' : 'text-green-600'
                }`}>
                  €{usage.monthly.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">/ €{limits.monthly_limit}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    usage.monthly > limits.monthly_limit ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((usage.monthly / limits.monthly_limit) * 100, 100)}%` }}
                />
              </div>
              {usage.monthly > limits.monthly_limit && (
                <p className="text-xs text-red-600 mt-1 font-semibold">
                  Превышение: €{(usage.monthly - limits.monthly_limit).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Предупреждение о превышении */}
          {(usage.daily > limits.daily_limit || usage.weekly > limits.weekly_limit || usage.monthly > limits.monthly_limit) && (
            <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="text-xl">⚠️</div>
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold">Внимание: Превышен лимит!</p>
                  <p className="mt-1">
                    Вы можете продолжить заправку, но превышение будет зафиксировано и передано менеджеру.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <RefuelForm vehicleId={vehicle.id} vehicleName={vehicle.name} fuelCardId={fuelCardId} />
    </div>
  );
}
