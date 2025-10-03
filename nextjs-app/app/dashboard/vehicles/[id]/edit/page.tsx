import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
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

  async function updateVehicle(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.user_metadata?.organization_id;

    const vehicleData = {
      name: formData.get('name') as string,
      license_plate: formData.get('license_plate') as string || null,
      vin: formData.get('vin') as string || null,
      status: (formData.get('status') as string) || 'active',
      is_rental: formData.get('is_rental') === 'on',
      rental_monthly_price: formData.get('rental_monthly_price') 
        ? parseFloat(formData.get('rental_monthly_price') as string) 
        : null,
      rental_start_date: formData.get('rental_start_date') as string || null,
      rental_end_date: formData.get('rental_end_date') as string || null,
    };

    const { error } = await supabase
      .from('vehicles')
      .update(vehicleData)
      .eq('id', params.id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error updating vehicle:', error);
      return;
    }

    revalidatePath(`/dashboard/vehicles/${params.id}`);
    redirect(`/dashboard/vehicles/${params.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Редактировать автомобиль</h1>

      <form action={updateVehicle} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название *
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={vehicle.name}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Номер
            </label>
            <input
              type="text"
              name="license_plate"
              defaultValue={vehicle.license_plate || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VIN
            </label>
            <input
              type="text"
              name="vin"
              defaultValue={vehicle.vin || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Статус
          </label>
          <select
            name="status"
            defaultValue={vehicle.status}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="active">Активен</option>
            <option value="repair">Ремонт</option>
            <option value="unavailable">Недоступен</option>
            <option value="rented">Арендован</option>
          </select>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              name="is_rental"
              id="is_rental"
              defaultChecked={vehicle.is_rental}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_rental" className="ml-2 block text-sm text-gray-900">
              Автомобиль в аренде
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Цена в месяц (€)
              </label>
              <input
                type="number"
                name="rental_monthly_price"
                step="0.01"
                defaultValue={vehicle.rental_monthly_price || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата начала
              </label>
              <input
                type="date"
                name="rental_start_date"
                defaultValue={vehicle.rental_start_date || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата окончания
              </label>
              <input
                type="date"
                name="rental_end_date"
                defaultValue={vehicle.rental_end_date || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Сохранить
          </button>
          <a
            href={`/dashboard/vehicles/${vehicle.id}`}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Отмена
          </a>
        </div>
      </form>
    </div>
  );
}
