import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';
import { FuelAnomaliesAlert } from '@/components/FuelAnomaliesAlert';
import { DriverAnomalyBanner } from '@/components/DriverAnomalyBanner';
import { RentalAnalyticsWidget } from '@/components/RentalAnalyticsWidget';
import { type UserRole } from '@/lib/types/roles';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const user = await getCurrentUser();

  // Получаем контекст пользователя для правильной фильтрации
  const userContext = getUserQueryContext(user);
  const userRole = (user?.role || 'viewer') as UserRole;
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch fuel anomalies with vehicle info using JOIN (unchecked first)
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
      anomaly_checked_at,
      vehicles (
        name,
        license_plate
      )
    `)
    .eq('category', 'fuel')
    .eq('has_anomaly', true)
    .order('anomaly_checked_by', { ascending: true, nullsFirst: true })
    .order('date', { ascending: false });
  anomaliesQuery = applyOrgFilter(anomaliesQuery, userContext);
  const { data: anomaliesData } = await anomaliesQuery;

  // Enrich anomalies with driver information
  const anomalies = await Promise.all(
    (anomaliesData || []).map(async (anomaly: any) => {
      const vehicle = anomaly.vehicles;

      let driverName = null;
      // Get driver through vehicle_assignments -> team -> users
      const { data: assignment } = await supabase
        .from('vehicle_assignments')
        .select('team_id')
        .eq('vehicle_id', anomaly.vehicle_id)
        .is('end_date', null)
        .single();

      if (assignment?.team_id) {
        // Get users from the team (there might be multiple, we take the first one)
        const { data: teamUsers } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('team_id', assignment.team_id)
          .limit(1);

        if (teamUsers && teamUsers.length > 0) {
          const driver = teamUsers[0];
          driverName = `${driver.first_name} ${driver.last_name}`;
        }
      }

      return {
        id: anomaly.id,
        date: anomaly.date,
        amount: anomaly.amount,
        liters: anomaly.liters,
        odometer_reading: anomaly.odometer_reading,
        previous_odometer_reading: anomaly.previous_odometer_reading,
        distance_traveled: anomaly.distance_traveled,
        expected_consumption: anomaly.expected_consumption,
        actual_consumption: anomaly.actual_consumption,
        consumption_difference: anomaly.consumption_difference,
        vehicle_id: anomaly.vehicle_id,
        anomaly_checked_by: anomaly.anomaly_checked_by,
        anomaly_checked_at: anomaly.anomaly_checked_at,
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

  // Fetch rental analytics data
  // Only fetch if user has permission to view rental analytics
  let rentalVehiclesQuery = supabase
    .from('vehicles')
    .select('id, rental_monthly_price, rental_start_date, rental_end_date')
    .eq('is_rental', true);
  rentalVehiclesQuery = applyOrgFilter(rentalVehiclesQuery, userContext);
  const { data: rentalVehiclesData } = await rentalVehiclesQuery;

  const rentalVehicles = rentalVehiclesData || [];
  const rentalVehiclesCount = rentalVehicles.length;

  // Calculate monthly rental cost (sum of all rental_monthly_price)
  const monthlyRentalCost = rentalVehicles.reduce(
    (sum, vehicle) => sum + (vehicle.rental_monthly_price || 0),
    0
  );

  // Calculate total rental cost (from start date to now or end date)
  const now = new Date();
  const totalRentalCost = rentalVehicles.reduce((sum, vehicle) => {
    if (!vehicle.rental_start_date || !vehicle.rental_monthly_price) return sum;
    const start = new Date(vehicle.rental_start_date);
    const end = vehicle.rental_end_date ? new Date(vehicle.rental_end_date) : now;
    const effectiveEnd = end < now ? end : now;
    if (effectiveEnd < start) return sum;
    const months =
      (effectiveEnd.getFullYear() - start.getFullYear()) * 12 +
      (effectiveEnd.getMonth() - start.getMonth()) +
      (effectiveEnd.getDate() >= start.getDate() ? 1 : 0);
    return sum + Math.max(0, months) * vehicle.rental_monthly_price;
  }, 0);

  // Calculate expiring contracts (within 30 days)
  const expiringContracts = rentalVehicles.filter((vehicle) => {
    if (!vehicle.rental_end_date) return false;
    const endDate = new Date(vehicle.rental_end_date);
    const now = new Date();
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return endDate >= now && endDate <= thirtyDaysLater;
  }).length;

  // Fetch last month rental expenses from car_expenses
  const lastMonthStart = new Date();
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  lastMonthStart.setDate(1);
  lastMonthStart.setHours(0, 0, 0, 0);
  const lastMonthEnd = new Date();
  lastMonthEnd.setDate(0);
  lastMonthEnd.setHours(23, 59, 59, 999);

  let rentalExpensesQuery = supabase
    .from('car_expenses')
    .select('amount')
    .eq('category', 'rental')
    .gte('date', lastMonthStart.toISOString().split('T')[0])
    .lte('date', lastMonthEnd.toISOString().split('T')[0]);
  rentalExpensesQuery = applyOrgFilter(rentalExpensesQuery, userContext);
  const { data: rentalExpensesData } = await rentalExpensesQuery;

  const lastMonthRentalExpenses = (rentalExpensesData || []).reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

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

      {/* Rental Analytics Widget - For Admins and Managers */}
      {['owner', 'admin', 'manager'].includes(userRole) && (
        <RentalAnalyticsWidget
          rentalVehicles={rentalVehiclesCount}
          monthlyRentalCost={monthlyRentalCost}
          totalRentalCost={totalRentalCost}
          lastMonthRentalExpenses={lastMonthRentalExpenses}
          expiringContracts={expiringContracts}
        />
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
        </div>
      </div>
    </div>
  );
}
