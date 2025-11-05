import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { VehicleForm } from '../../VehicleForm';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth-helpers';

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createServerClient();
  const { id } = await params;

  const currentUser = await getCurrentUser();
  const isSuperAdminUser = isSuperAdmin(currentUser);

  const { data: { user } } = await supabase.auth.getUser();
  const userContext = getUserQueryContext(user);

  let vehicleQuery = supabase
    .from('vehicles')
    .select('*')
    .eq('id', id);
  vehicleQuery = applyOrgFilter(vehicleQuery, userContext);
  const { data: vehicle } = await vehicleQuery.single();

  if (!vehicle) {
    notFound();
  }

  // Загружаем организации только для Super Admin
  let organizations = [];
  if (isSuperAdminUser) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    organizations = data || [];
  }

  // Load vehicle types for user's organization
  let vehicleTypes = [];
  const orgId = isSuperAdminUser ? vehicle.organization_id : currentUser.organization_id;

  if (orgId) {
    let query = supabase
      .from('vehicle_types')
      .select('id, name, fuel_consumption_per_100km')
      .eq('organization_id', orgId)
      .order('name');

    const { data: types } = await query;
    vehicleTypes = types || [];
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">✏️ Редактировать автомобиль</h1>
      <VehicleForm
        vehicle={vehicle}
        isEdit={true}
        currentUser={currentUser}
        organizations={organizations}
        vehicleTypes={vehicleTypes}
      />
    </div>
  );
}
