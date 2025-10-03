import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DeleteVehicleButton from './DeleteVehicleButton';

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .single();

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.name}</h1>
          <p className="text-gray-600">Детали автомобиля</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/vehicles/${vehicle.id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Редактировать
          </Link>
          <DeleteVehicleButton vehicleId={vehicle.id} vehicleName={vehicle.name} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Название</h3>
            <p className="text-lg text-gray-900">{vehicle.name}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Статус</h3>
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
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
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Номер</h3>
            <p className="text-lg text-gray-900">{vehicle.license_plate || '-'}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">VIN</h3>
            <p className="text-lg text-gray-900 font-mono">{vehicle.vin || '-'}</p>
          </div>
        </div>

        {vehicle.is_rental && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация об аренде</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Цена в месяц</h4>
                <p className="text-lg text-gray-900">{vehicle.rental_monthly_price || 0} €</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Дата начала</h4>
                <p className="text-lg text-gray-900">
                  {vehicle.rental_start_date || '-'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Дата окончания</h4>
                <p className="text-lg text-gray-900">
                  {vehicle.rental_end_date || '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Создан</h4>
          <p className="text-gray-900">
            {new Date(vehicle.created_at).toLocaleString('ru-RU')}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/dashboard/vehicles"
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          ← Назад к списку
        </Link>
      </div>
    </div>
  );
}
