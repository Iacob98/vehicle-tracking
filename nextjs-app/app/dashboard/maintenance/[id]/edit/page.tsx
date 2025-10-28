import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMaintenancePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  // Fetch maintenance
  let maintenanceQuery = supabase
    .from('maintenances')
    .select('*')
    .eq('id', id);
  maintenanceQuery = applyOrgFilter(maintenanceQuery, userContext);
  const { data: maintenance, error } = await maintenanceQuery.single();

  if (error || !maintenance) {
    notFound();
  }

  // Fetch vehicles
  let vehiclesQuery = supabase
    .from('vehicles')
    .select('id, name, license_plate');
  vehiclesQuery = applyOrgFilter(vehiclesQuery, userContext);
  vehiclesQuery = vehiclesQuery.order('name');
  const { data: vehicles } = await vehiclesQuery;

  async function updateMaintenance(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userContext = getUserQueryContext(user);

    const vehicleId = formData.get('vehicle_id') as string;
    const type = formData.get('type') as string;
    const maintenanceDate = formData.get('date') as string;
    const description = formData.get('description') as string;

    if (!vehicleId || !type || !maintenanceDate) {
      return;
    }

    let updateQuery = supabase
      .from('maintenances')
      .update({
        vehicle_id: vehicleId,
        type,
        date: maintenanceDate,
        description: description || null,
      })
      .eq('id', id);
    updateQuery = applyOrgFilter(updateQuery, userContext);
    const { error } = await updateQuery;

    if (error) {
      console.error('Error updating maintenance:', error);
      return;
    }

    revalidatePath('/dashboard/maintenance');
    revalidatePath(`/dashboard/maintenance/${id}`);
    redirect(`/dashboard/maintenance/${id}`);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">✏️ Редактировать обслуживание / Wartung bearbeiten</h1>
        <p className="text-gray-600">Изменить данные обслуживания</p>
      </div>

      <form action={updateMaintenance} className="bg-white rounded-lg border p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              🚗 Автомобиль / Fahrzeug *
            </label>
            <select
              name="vehicle_id"
              required
              defaultValue={maintenance.vehicle_id}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Выберите автомобиль</option>
              {vehicles?.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} ({vehicle.license_plate})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              🔧 Тип обслуживания / Wartungstyp *
            </label>
            <select
              name="type"
              required
              defaultValue={maintenance.type}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="inspection">🔍 Осмотр / Inspektion</option>
              <option value="repair">🔧 Ремонт / Reparatur</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              📅 Дата / Datum *
            </label>
            <Input
              type="date"
              name="date"
              required
              defaultValue={maintenance.date}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              📝 Описание / Beschreibung
            </label>
            <textarea
              name="description"
              rows={4}
              defaultValue={maintenance.description || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Описание работ, замененные детали, замечания..."
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit">
            💾 Сохранить изменения
          </Button>
          <Link href={`/dashboard/maintenance/${id}`}>
            <Button variant="outline" type="button">
              ❌ Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
