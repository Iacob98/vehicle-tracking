import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

export default async function AnalyticsPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  // Get vehicle expenses statistics
  let carExpensesQuery = supabase
    .from('car_expenses')
    .select('vehicle_id, category, amount, created_by_user_id, liters, date');
  carExpensesQuery = applyOrgFilter(carExpensesQuery, userContext);
  const { data: carExpenses } = await carExpensesQuery;

  // Get penalties statistics
  let penaltiesQuery = supabase
    .from('penalties')
    .select('vehicle_id, amount, status');
  penaltiesQuery = applyOrgFilter(penaltiesQuery, userContext);
  const { data: penalties } = await penaltiesQuery;

  // Calculate totals by vehicle
  const vehicleStats = new Map();
  carExpenses?.forEach(expense => {
    const current = vehicleStats.get(expense.vehicle_id) || { total: 0, count: 0, byCategory: {} };
    current.total += parseFloat(expense.amount || 0);
    current.count += 1;
    current.byCategory[expense.category] = (current.byCategory[expense.category] || 0) + parseFloat(expense.amount || 0);
    vehicleStats.set(expense.vehicle_id, current);
  });

  // Add penalties to vehicle stats
  penalties?.forEach(penalty => {
    if (penalty.vehicle_id) {
      const current = vehicleStats.get(penalty.vehicle_id) || { total: 0, count: 0, byCategory: {} };
      current.total += parseFloat(penalty.amount || 0);
      current.count += 1;
      vehicleStats.set(penalty.vehicle_id, current);
    }
  });

  // Get vehicle names
  const vehicleIds = Array.from(vehicleStats.keys());
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, name, license_plate')
    .in('id', vehicleIds);

  const vehiclesWithStats = vehicles?.map(v => ({
    ...v,
    stats: vehicleStats.get(v.id)
  })).sort((a, b) => (b.stats?.total || 0) - (a.stats?.total || 0));

  // Overall statistics
  const totalCarExpenses = carExpenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
  const totalPenalties = penalties?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
  const openPenalties = penalties?.filter(p => p.status === 'open').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

  // Calculate driver fuel expenses statistics
  const driverFuelStats = new Map();
  carExpenses?.forEach(expense => {
    if (expense.category === 'fuel' && expense.created_by_user_id) {
      const current = driverFuelStats.get(expense.created_by_user_id) || {
        totalAmount: 0,
        totalLiters: 0,
        count: 0,
        expenses: []
      };
      current.totalAmount += parseFloat(expense.amount || 0);
      current.totalLiters += parseFloat(expense.liters || 0);
      current.count += 1;
      current.expenses.push(expense);
      driverFuelStats.set(expense.created_by_user_id, current);
    }
  });

  // Get driver names
  const driverIds = Array.from(driverFuelStats.keys()).filter(id => id);
  const { data: drivers } = driverIds.length > 0
    ? await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', driverIds)
    : { data: [] };

  const driversWithStats = drivers?.map(d => ({
    ...d,
    stats: driverFuelStats.get(d.id)
  })).sort((a, b) => (b.stats?.totalAmount || 0) - (a.stats?.totalAmount || 0));

  // Calculate rental statistics
  const rentalExpenses = carExpenses?.filter(e => e.category === 'rental') || [];
  const totalRentalExpenses = rentalExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // Group rental expenses by date (month)
  const rentalByMonth = new Map<string, number>();
  rentalExpenses.forEach(expense => {
    const month = expense.date.substring(0, 7); // YYYY-MM
    rentalByMonth.set(month, (rentalByMonth.get(month) || 0) + parseFloat(expense.amount || 0));
  });

  // Get rental vehicles info
  let rentalVehiclesQuery = supabase
    .from('vehicles')
    .select('id, name, license_plate, rental_monthly_price, rental_start_date, rental_end_date, is_rental')
    .eq('is_rental', true);
  rentalVehiclesQuery = applyOrgFilter(rentalVehiclesQuery, userContext);
  const { data: rentalVehicles } = await rentalVehiclesQuery;

  const totalMonthlyRentalCost = rentalVehicles?.reduce(
    (sum, v) => sum + (v.rental_monthly_price || 0),
    0
  ) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📊 Аналитика расходов / Ausgabenanalyse</h1>
        <p className="text-gray-600">Статистика и анализ расходов</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600">Расходы на авто / Auto-Ausgaben</p>
          <p className="text-3xl font-bold mt-2">€{totalCarExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600">Всего штрафов / Strafen gesamt</p>
          <p className="text-3xl font-bold mt-2">€{totalPenalties.toFixed(2)}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600">Штрафы к оплате / Offene Strafen</p>
          <p className="text-3xl font-bold mt-2 text-red-600">€{openPenalties.toFixed(2)}</p>
        </div>
      </div>

      {/* Vehicle Expenses */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">🚗 Расходы по автомобилям</h2>
        {vehiclesWithStats && vehiclesWithStats.length > 0 ? (
          <div className="space-y-4">
            {vehiclesWithStats.map(vehicle => (
              <div key={vehicle.id} className="border-b pb-4 last:border-b-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{vehicle.name} ({vehicle.license_plate})</h3>
                    <p className="text-sm text-gray-600">{vehicle.stats?.count} расходов</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">€{vehicle.stats?.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      Среднее: €{(vehicle.stats?.total / vehicle.stats?.count).toFixed(2)}
                    </p>
                  </div>
                </div>
                {vehicle.stats?.byCategory && (
                  <div className="mt-2 flex gap-4 text-sm">
                    {Object.entries(vehicle.stats.byCategory).map(([cat, amount]) => (
                      <span key={cat} className="text-gray-600">
                        {cat}: €{(amount as number).toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Нет данных по расходам на авто</p>
        )}
      </div>

      {/* Penalties Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">🚧 Сводка по штрафам</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Всего штрафов</p>
            <p className="text-2xl font-bold">{penalties?.length || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Общая сумма</p>
            <p className="text-2xl font-bold">€{totalPenalties.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">К оплате</p>
            <p className="text-2xl font-bold text-red-600">€{openPenalties.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Driver Fuel Expenses */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">⛽ Расходы водителей на топливо / Kraftstoffkosten nach Fahrern</h2>
        {driversWithStats && driversWithStats.length > 0 ? (
          <div className="space-y-4">
            {driversWithStats.map(driver => (
              <div key={driver.id} className="border-b pb-4 last:border-b-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">
                      {driver.first_name} {driver.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{driver.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {driver.stats?.count} заправок
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      €{driver.stats?.totalAmount.toFixed(2)}
                    </p>
                    {driver.stats?.totalLiters > 0 && (
                      <p className="text-sm text-gray-600">
                        {driver.stats?.totalLiters.toFixed(2)} л
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      Среднее: €{(driver.stats?.totalAmount / driver.stats?.count).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Нет данных по расходам водителей на топливо</p>
        )}
      </div>

      {/* Rental Analytics Section */}
      {rentalVehicles && rentalVehicles.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">🏢 Аналитика аренды / Mietanalyse</h2>
            <a
              href="/dashboard/rental-analytics"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline"
            >
              Подробнее →
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Арендованных авто</p>
              <p className="text-2xl font-bold text-purple-600">{rentalVehicles.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Плановый расход/мес</p>
              <p className="text-2xl font-bold text-blue-600">€{totalMonthlyRentalCost.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Всего расходов на аренду</p>
              <p className="text-2xl font-bold text-green-600">€{totalRentalExpenses.toFixed(2)}</p>
            </div>
          </div>

          {rentalByMonth.size > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold mb-3">Расходы на аренду по месяцам</h3>
              <div className="space-y-2">
                {Array.from(rentalByMonth.entries())
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .slice(0, 6)
                  .map(([month, amount]) => (
                    <div key={month} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{month}</span>
                      <span className="font-semibold">€{amount.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {rentalVehicles.length > 0 && (
            <div className="bg-white rounded-lg p-4 mt-4">
              <h3 className="font-semibold mb-3">Арендованные автомобили</h3>
              <div className="space-y-2">
                {rentalVehicles.slice(0, 5).map(vehicle => (
                  <div key={vehicle.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{vehicle.name}</span>
                      <span className="text-gray-600 ml-2">({vehicle.license_plate})</span>
                    </div>
                    <span className="text-purple-600 font-semibold">
                      €{vehicle.rental_monthly_price?.toFixed(2) || '0.00'}/мес
                    </span>
                  </div>
                ))}
                {rentalVehicles.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ...и еще {rentalVehicles.length - 5} автомобилей
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
