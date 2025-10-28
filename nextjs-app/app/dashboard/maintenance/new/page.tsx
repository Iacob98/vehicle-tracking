import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MaintenanceForm } from './MaintenanceForm';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

export default async function NewMaintenancePage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  // Fetch vehicles
  let vehiclesQuery = supabase
    .from('vehicles')
    .select('id, name, license_plate');
  vehiclesQuery = applyOrgFilter(vehiclesQuery, userContext);
  vehiclesQuery = vehiclesQuery.order('name');
  const { data: vehicles } = await vehiclesQuery;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Добавить обслуживание / Wartung hinzufügen</h1>
        <p className="text-gray-600">Зарегистрировать новое обслуживание</p>
      </div>

      <MaintenanceForm vehicles={vehicles || []} />
    </div>
  );
}
