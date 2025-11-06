import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';
import { DriverAnomalyBanner } from '@/components/DriverAnomalyBanner';

export default async function DriverDashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const userContext = getUserQueryContext(authUser);

  // Получаем информацию о водителе и его авто
  const { data: user } = await supabase
    .from('users')
    .select('id, team_id')
    .eq('id', authUser.id)
    .single();

  // Получаем авто водителя через бригаду
  let vehicleName = 'Не назначено';
  let vehicleId: string | null = null;

  if (user?.team_id) {
    // Получаем активное назначение авто на бригаду
    const { data: assignment } = await supabase
      .from('vehicle_assignments')
      .select('vehicle_id, vehicles(name, license_plate)')
      .eq('team_id', user.team_id)
      .is('end_date', null)
      .single();

    if (assignment && assignment.vehicles) {
      const vehicle = assignment.vehicles as any;
      vehicleName = vehicle.name;
      vehicleId = assignment.vehicle_id;
    }
  }

  // Получаем аномалии топлива для этого водителя
  let driverAnomalies: any[] = [];
  if (vehicleId) {
    const { data: anomaliesData } = await supabase
      .from('car_expenses')
      .select(`
        id,
        date,
        amount,
        liters,
        expected_consumption,
        actual_consumption,
        consumption_difference,
        distance_traveled,
        anomaly_checked_by
      `)
      .eq('vehicle_id', vehicleId)
      .eq('category', 'fuel')
      .eq('has_anomaly', true)
      .is('anomaly_checked_by', null)
      .order('date', { ascending: false })
      .limit(5);

    driverAnomalies = anomaliesData || [];
  }

  // Подсчитываем штрафы водителя
  let penaltiesQuery = supabase
    .from('penalties')
    .select('id', { count: 'exact', head: true });
  penaltiesQuery = applyOrgFilter(penaltiesQuery, userContext);
  penaltiesQuery = penaltiesQuery
    .eq('user_id', authUser.id)
    .eq('status', 'open');
  const { count: penaltiesCount } = await penaltiesQuery;

  return (
    <div className="space-y-6">
      {/* Приветствие */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Добро пожаловать! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          {vehicleId
            ? `Ваш автомобиль: ${vehicleName}`
            : 'Автомобиль пока не назначен. Обратитесь к менеджеру.'}
        </p>
      </div>

      {/* Уведомления об аномалиях для водителя */}
      {driverAnomalies.length > 0 && (
        <DriverAnomalyBanner anomalies={driverAnomalies} vehicleName={vehicleName} />
      )}

      {/* Карточки быстрых действий */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Мой автомобиль */}
        <Link
          href="/dashboard/driver/my-vehicle"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl mb-3">🚗</div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition">
                Мой автомобиль
              </h2>
              <p className="text-gray-600 text-sm mt-1">{vehicleName}</p>
              <p className="text-gray-500 text-xs mt-1">
                Документы и информация
              </p>
            </div>
          </div>
        </Link>

        {/* Заправиться */}
        <Link
          href="/dashboard/driver/refuel/new"
          className={`bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 hover:shadow-lg transition text-white ${
            !vehicleId ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl mb-3">⛽</div>
              <h2 className="text-xl font-bold">Заправиться</h2>
              <p className="text-green-100 text-sm mt-1">
                Добавить расход на топливо
              </p>
            </div>
          </div>
        </Link>

        {/* Мои штрафы */}
        <Link
          href="/dashboard/driver/penalties"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group relative"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl mb-3">🚧</div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition">
                Мои штрафы
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                {penaltiesCount
                  ? `${penaltiesCount} неоплачен${penaltiesCount === 1 ? '' : 'о'}`
                  : 'Нет неоплаченных'}
              </p>
            </div>
            {penaltiesCount !== null && penaltiesCount > 0 && (
              <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                {penaltiesCount}
              </div>
            )}
          </div>
        </Link>

        {/* Мой профиль */}
        <Link
          href="/dashboard/driver/profile"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition group"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl mb-3">👤</div>
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition">
                Мой профиль
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Настройки и данные
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Заправочная карта
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Информационное сообщение если нет авто */}
      {!vehicleId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800">
                Автомобиль не назначен
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                Для добавления расходов и просмотра документов необходимо, чтобы
                менеджер назначил вам автомобиль через бригаду.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* История заправок */}
      {vehicleId && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              📊 Последние действия
            </h2>
            <Link
              href="/dashboard/driver/refuel"
              className="text-green-600 hover:text-green-700 text-sm font-medium"
            >
              Все заправки →
            </Link>
          </div>
          <p className="text-gray-600 text-sm">
            История ваших заправок и расходов на топливо
          </p>
        </div>
      )}
    </div>
  );
}
