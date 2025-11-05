import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';
import { FuelAnomaliesAlert } from '@/components/FuelAnomaliesAlert';
import { DriverAnomalyBanner } from '@/components/DriverAnomalyBanner';
import { type UserRole } from '@/lib/types/roles';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const user = await getCurrentUser();

  // Получаем контекст пользователя для правильной фильтрации
  const userContext = getUserQueryContext(user);
  const userRole = (user?.role || 'viewer') as UserRole;
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch fuel anomalies (unchecked first)
  let anomaliesQuery = supabase
    .from('car_expenses')
    .select(`
      id,
      date,
      amount,
      liters,
      odometer_reading,
      previous_odometer_reading,
      distance_traveled,
      expected_consumption,
      actual_consumption,
      consumption_difference,
      vehicle_id,
      anomaly_checked_by,
      anomaly_checked_at
    `)
    .eq('category', 'fuel')
    .eq('has_anomaly', true)
    .order('anomaly_checked_by', { ascending: true, nullsFirst: true })
    .order('date', { ascending: false });
  anomaliesQuery = applyOrgFilter(anomaliesQuery, userContext);
  const { data: anomaliesData } = await anomaliesQuery;

  // Enrich anomalies with vehicle and driver information
  const anomalies = await Promise.all(
    (anomaliesData || []).map(async (anomaly) => {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('name, license_plate, current_driver_id')
        .eq('id', anomaly.vehicle_id)
        .single();

      let driverName = null;
      if (vehicle?.current_driver_id) {
        const { data: driver } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', vehicle.current_driver_id)
          .single();

        if (driver) {
          driverName = `${driver.first_name} ${driver.last_name}`;
        }
      }

      return {
        ...anomaly,
        vehicle_name: vehicle?.name || 'Unknown',
        license_plate: vehicle?.license_plate || 'N/A',
        driver_name: driverName,
      };
    })
  );

  // Fetch stats - используем applyOrgFilter для автоматической фильтрации
  // Owner видит все данные всех организаций, остальные только свою организацию
  const [vehiclesCount, teamsCount, penaltiesCount, expiringDocs] = await Promise.all([
    applyOrgFilter(
      supabase.from('vehicles').select('id', { count: 'exact', head: true }),
      userContext
    ),
    applyOrgFilter(
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      userContext
    ),
    applyOrgFilter(
      supabase.from('penalties').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      userContext
    ),
    applyOrgFilter(
      supabase.from('vehicle_documents')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('date_expiry', 'is', null)
        .lte('date_expiry', thirtyDaysFromNow),
      userContext
    ),
  ]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600">Обзор системы управления автопарком</p>
      </div>

      {/* Fuel Anomalies Alert - For Admins and Managers */}
      {anomalies.length > 0 && ['owner', 'admin', 'manager'].includes(userRole) && (
        <FuelAnomaliesAlert anomalies={anomalies} userRole={userRole} />
      )}

      {/* Driver Anomaly Banner - For Drivers */}
      {userRole === 'driver' && anomalies.length > 0 && (
        <DriverAnomalyBanner anomalyCount={anomalies.length} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Автомобили</p>
              <p className="text-3xl font-bold text-gray-900">{vehiclesCount.count || 0}</p>
            </div>
            <div className="text-4xl">🚗</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Бригады</p>
              <p className="text-3xl font-bold text-gray-900">{teamsCount.count || 0}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Открытые штрафы</p>
              <p className="text-3xl font-bold text-red-600">{penaltiesCount.count || 0}</p>
            </div>
            <div className="text-4xl">🚧</div>
          </div>
        </div>

        <a
          href="/dashboard/documents?status=expiring"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Истекающие документы</p>
              <p className="text-3xl font-bold text-orange-600">{expiringDocs.count || 0}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </a>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/dashboard/vehicles"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <div className="text-3xl mb-2">🚗</div>
            <p className="text-sm font-medium">Добавить автомобиль</p>
          </a>
          <a
            href="/dashboard/teams"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm font-medium">Создать бригаду</p>
          </a>
          <a
            href="/dashboard/penalties"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <div className="text-3xl mb-2">💰</div>
            <p className="text-sm font-medium">Добавить штраф</p>
          </a>
          <a
            href="/dashboard/expenses"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <div className="text-3xl mb-2">💵</div>
            <p className="text-sm font-medium">Добавить расход</p>
          </a>
        </div>
      </div>
    </div>
  );
}
