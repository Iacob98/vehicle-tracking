import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function VehiclesPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Автомобили</h1>
          <p className="text-gray-600">Управление автопарком</p>
        </div>
        <Link
          href="/dashboard/vehicles/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Добавить автомобиль
        </Link>
      </div>

      {vehicles && vehicles.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Номер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  VIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Аренда
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{vehicle.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{vehicle.license_plate || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{vehicle.vin || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vehicle.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : vehicle.status === 'repair'
                          ? 'bg-yellow-100 text-yellow-800'
                          : vehicle.status === 'rented'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vehicle.status === 'active' ? 'Активен' :
                       vehicle.status === 'repair' ? 'Ремонт' :
                       vehicle.status === 'rented' ? 'Арендован' : 'Недоступен'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {vehicle.is_rental ? `${vehicle.rental_monthly_price || 0}€/мес` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/dashboard/vehicles/${vehicle.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Просмотр
                    </Link>
                    <Link
                      href={`/dashboard/vehicles/${vehicle.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Редактировать
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Нет автомобилей
          </h3>
          <p className="text-gray-600 mb-6">
            Начните с добавления первого автомобиля в ваш автопарк
          </p>
          <Link
            href="/dashboard/vehicles/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Добавить автомобиль
          </Link>
        </div>
      )}
    </div>
  );
}
