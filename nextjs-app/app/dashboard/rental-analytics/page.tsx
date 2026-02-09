import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';
import Link from 'next/link';

export default async function RentalAnalyticsPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  // Get rental vehicles
  let rentalVehiclesQuery = supabase
    .from('vehicles')
    .select('id, name, license_plate, rental_monthly_price, rental_start_date, rental_end_date, is_rental, organization_id')
    .eq('is_rental', true)
    .order('rental_end_date', { ascending: true, nullsFirst: false });
  rentalVehiclesQuery = applyOrgFilter(rentalVehiclesQuery, userContext);
  const { data: rentalVehicles } = await rentalVehiclesQuery;

  // Get rental expenses
  let rentalExpensesQuery = supabase
    .from('car_expenses')
    .select('id, vehicle_id, amount, date, description')
    .eq('category', 'rental')
    .order('date', { ascending: false });
  rentalExpensesQuery = applyOrgFilter(rentalExpensesQuery, userContext);
  const { data: rentalExpenses } = await rentalExpensesQuery;

  // Calculate statistics
  const totalMonthlyRentalCost = rentalVehicles?.reduce(
    (sum, v) => sum + (v.rental_monthly_price || 0),
    0
  ) || 0;

  const totalRentalExpenses = rentalExpenses?.reduce(
    (sum, e) => sum + parseFloat(e.amount?.toString() || '0'),
    0
  ) || 0;

  // Calculate total rental cost from start date to now (or end date)
  const calculateRentalMonths = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : now;
    const effectiveEnd = end < now ? end : now;
    if (effectiveEnd < start) return 0;
    const months =
      (effectiveEnd.getFullYear() - start.getFullYear()) * 12 +
      (effectiveEnd.getMonth() - start.getMonth()) +
      (effectiveEnd.getDate() >= start.getDate() ? 1 : 0);
    return Math.max(0, months);
  };

  const totalRentalCost = rentalVehicles?.reduce((sum, v) => {
    if (!v.rental_start_date || !v.rental_monthly_price) return sum;
    const months = calculateRentalMonths(v.rental_start_date, v.rental_end_date);
    return sum + months * v.rental_monthly_price;
  }, 0) || 0;

  // Group expenses by month
  const expensesByMonth = new Map<string, number>();
  rentalExpenses?.forEach(expense => {
    const month = expense.date.substring(0, 7); // YYYY-MM
    expensesByMonth.set(month, (expensesByMonth.get(month) || 0) + parseFloat(expense.amount?.toString() || '0'));
  });

  // Group expenses by vehicle
  const expensesByVehicle = new Map<string, { total: number; count: number; expenses: any[] }>();
  rentalExpenses?.forEach(expense => {
    const current = expensesByVehicle.get(expense.vehicle_id) || { total: 0, count: 0, expenses: [] };
    current.total += parseFloat(expense.amount?.toString() || '0');
    current.count += 1;
    current.expenses.push(expense);
    expensesByVehicle.set(expense.vehicle_id, current);
  });

  // Calculate expiring contracts
  const now = new Date();
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringContracts = rentalVehicles?.filter(v => {
    if (!v.rental_end_date) return false;
    const endDate = new Date(v.rental_end_date);
    return endDate >= now && endDate <= thirtyDaysLater;
  }) || [];

  const expiredContracts = rentalVehicles?.filter(v => {
    if (!v.rental_end_date) return false;
    const endDate = new Date(v.rental_end_date);
    return endDate < now;
  }) || [];

  // Calculate last month expenses
  const lastMonthStart = new Date();
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  lastMonthStart.setDate(1);
  const lastMonthKey = lastMonthStart.toISOString().substring(0, 7);
  const lastMonthExpenses = expensesByMonth.get(lastMonthKey) || 0;

  // Calculate variance
  const variance = lastMonthExpenses - totalMonthlyRentalCost;
  const variancePercent = totalMonthlyRentalCost > 0
    ? ((variance / totalMonthlyRentalCost) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🏢 Аналитика аренды автомобилей</h1>
          <p className="text-gray-600">Fahrzeugmiete Analyse</p>
        </div>
        <Link
          href="/dashboard/vehicles?filter=rental"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Управление арендой
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
          <p className="text-sm text-gray-600">Арендованных авто</p>
          <p className="text-3xl font-bold text-purple-600">{rentalVehicles?.length || 0}</p>
        </div>
        <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
          <p className="text-sm text-gray-600">Плановый расход/мес</p>
          <p className="text-3xl font-bold text-blue-600">
            €{totalMonthlyRentalCost.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white border-2 border-indigo-200 rounded-lg p-6">
          <p className="text-sm text-gray-600">Всего за аренду</p>
          <p className="text-3xl font-bold text-indigo-600">
            €{totalRentalCost.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">с начала аренды</p>
        </div>
        <div className="bg-white border-2 border-green-200 rounded-lg p-6">
          <p className="text-sm text-gray-600">Факт за прошлый месяц</p>
          <p className="text-3xl font-bold text-green-600">
            €{lastMonthExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`bg-white border-2 ${variance < 0 ? 'border-green-200' : 'border-orange-200'} rounded-lg p-6`}>
          <p className="text-sm text-gray-600">Отклонение</p>
          <p className={`text-3xl font-bold ${variance < 0 ? 'text-green-600' : 'text-orange-600'}`}>
            {variance >= 0 ? '+' : ''}€{variance.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-sm ${variance < 0 ? 'text-green-600' : 'text-orange-600'}`}>
            {variance >= 0 ? '+' : ''}{variancePercent}%
          </p>
        </div>
      </div>

      {/* Alerts */}
      {expiringContracts.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-orange-900">
                Истекает {expiringContracts.length} {expiringContracts.length === 1 ? 'договор' : 'договора'} аренды
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Следующие автомобили имеют истекающие контракты в течение 30 дней:
              </p>
              <ul className="mt-2 space-y-1">
                {expiringContracts.map(v => (
                  <li key={v.id} className="text-sm text-orange-800">
                    <strong>{v.name}</strong> ({v.license_plate}) - истекает {new Date(v.rental_end_date!).toLocaleDateString('de-DE')}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {expiredContracts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <h3 className="font-bold text-red-900">
                Истекло {expiredContracts.length} {expiredContracts.length === 1 ? 'договор' : 'договора'} аренды
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Следующие автомобили имеют истекшие контракты:
              </p>
              <ul className="mt-2 space-y-1">
                {expiredContracts.map(v => (
                  <li key={v.id} className="text-sm text-red-800">
                    <strong>{v.name}</strong> ({v.license_plate}) - истек {new Date(v.rental_end_date!).toLocaleDateString('de-DE')}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Expenses Chart */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">📈 Расходы на аренду по месяцам</h2>
        {expensesByMonth.size > 0 ? (
          <div className="space-y-3">
            {Array.from(expensesByMonth.entries())
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([month, amount]) => {
                const percent = totalMonthlyRentalCost > 0
                  ? (amount / totalMonthlyRentalCost) * 100
                  : 0;
                return (
                  <div key={month}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{month}</span>
                      <span className="text-sm font-bold">
                        €{amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-gray-500">Нет данных по расходам</p>
        )}
      </div>

      {/* Rental Vehicles Table */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">🚗 Арендованные автомобили</h2>
        {rentalVehicles && rentalVehicles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Автомобиль</th>
                  <th className="text-left py-3 px-4">Гос. номер</th>
                  <th className="text-right py-3 px-4">Аренда/мес</th>
                  <th className="text-right py-3 px-4">Всего за аренду</th>
                  <th className="text-right py-3 px-4">Факт расходы</th>
                  <th className="text-left py-3 px-4">Начало</th>
                  <th className="text-left py-3 px-4">Окончание</th>
                  <th className="text-center py-3 px-4">Статус</th>
                </tr>
              </thead>
              <tbody>
                {rentalVehicles.map(vehicle => {
                  const expenses = expensesByVehicle.get(vehicle.id);
                  const totalExpenses = expenses?.total || 0;
                  const endDate = vehicle.rental_end_date ? new Date(vehicle.rental_end_date) : null;
                  const isExpiring = endDate && endDate >= now && endDate <= thirtyDaysLater;
                  const isExpired = endDate && endDate < now;
                  const rentalMonths = vehicle.rental_start_date
                    ? calculateRentalMonths(vehicle.rental_start_date, vehicle.rental_end_date)
                    : 0;
                  const vehicleTotalRentalCost = rentalMonths * (vehicle.rental_monthly_price || 0);

                  return (
                    <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{vehicle.name}</td>
                      <td className="py-3 px-4">{vehicle.license_plate}</td>
                      <td className="py-3 px-4 text-right">
                        €{vehicle.rental_monthly_price?.toLocaleString('de-DE', { minimumFractionDigits: 2 }) || '0.00'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-indigo-600">
                          €{vehicleTotalRentalCost.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">({rentalMonths} мес.)</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        €{totalExpenses.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                        {expenses && expenses.count > 0 && (
                          <span className="text-xs text-gray-500 ml-1">({expenses.count})</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {vehicle.rental_start_date
                          ? new Date(vehicle.rental_start_date).toLocaleDateString('de-DE')
                          : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {vehicle.rental_end_date
                          ? new Date(vehicle.rental_end_date).toLocaleDateString('de-DE')
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isExpired ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            Истек
                          </span>
                        ) : isExpiring ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                            Истекает
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Активный
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Нет арендованных автомобилей</p>
        )}
      </div>

      {/* Recent Rental Expenses */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">💶 Последние расходы на аренду</h2>
        {rentalExpenses && rentalExpenses.length > 0 ? (
          <div className="space-y-3">
            {rentalExpenses.slice(0, 10).map(expense => {
              const vehicle = rentalVehicles?.find(v => v.id === expense.vehicle_id);
              return (
                <div key={expense.id} className="flex justify-between items-center border-b pb-3 last:border-b-0">
                  <div>
                    <p className="font-medium">{vehicle?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(expense.date).toLocaleDateString('de-DE')}
                    </p>
                    {expense.description && (
                      <p className="text-sm text-gray-500 mt-1">{expense.description}</p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-purple-600">
                    €{parseFloat(expense.amount?.toString() || '0').toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Нет расходов на аренду</p>
        )}
      </div>
    </div>
  );
}
