import Link from 'next/link';

interface RentalAnalyticsWidgetProps {
  rentalVehicles: number;
  monthlyRentalCost: number;
  lastMonthRentalExpenses: number;
  expiringContracts: number;
}

export function RentalAnalyticsWidget({
  rentalVehicles,
  monthlyRentalCost,
  lastMonthRentalExpenses,
  expiringContracts,
}: RentalAnalyticsWidgetProps) {
  // Если нет арендованных автомобилей, не показываем виджет
  if (rentalVehicles === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-md p-6 border border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🏢 Аренда автомобилей / Fahrzeugmiete
        </h2>
        <Link
          href="/dashboard/rental-analytics"
          className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline"
        >
          Подробнее →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active rental vehicles */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Арендовано</p>
          <p className="text-2xl font-bold text-purple-600">{rentalVehicles}</p>
          <p className="text-xs text-gray-500 mt-1">автомобилей</p>
        </div>

        {/* Monthly rental cost (from vehicle settings) */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">План. расход</p>
          <p className="text-2xl font-bold text-blue-600">
            {monthlyRentalCost.toLocaleString('de-DE', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}€
          </p>
          <p className="text-xs text-gray-500 mt-1">в месяц</p>
        </div>

        {/* Last month actual expenses */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Факт. расход</p>
          <p className="text-2xl font-bold text-green-600">
            {lastMonthRentalExpenses.toLocaleString('de-DE', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}€
          </p>
          <p className="text-xs text-gray-500 mt-1">за прошлый месяц</p>
        </div>

        {/* Expiring contracts (within 30 days) */}
        <Link href="/dashboard/vehicles?filter=expiring_rental" className="block">
          <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer">
            <p className="text-xs text-gray-600 mb-1">Истекает</p>
            <p className={`text-2xl font-bold ${expiringContracts > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
              {expiringContracts}
            </p>
            <p className="text-xs text-gray-500 mt-1">в течение 30 дней</p>
          </div>
        </Link>
      </div>

      {/* Warning if there are expiring contracts */}
      {expiringContracts > 0 && (
        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
          <span className="text-orange-600 text-lg">⚠️</span>
          <div className="text-sm">
            <p className="font-medium text-orange-900">
              {expiringContracts === 1
                ? 'Истекает 1 договор аренды'
                : `Истекает ${expiringContracts} договора аренды`}
            </p>
            <p className="text-orange-700 mt-1">
              Проверьте даты окончания и продлите договоры при необходимости.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
