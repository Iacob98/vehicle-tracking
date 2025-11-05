import { VehicleForm } from '../VehicleForm';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth-helpers';

export default async function NewVehiclePage() {
  const currentUser = await getCurrentUser();
  const isSuperAdminUser = isSuperAdmin(currentUser);
  const supabase = await createServerClient();

  // Загружаем организации только для Super Admin
  let organizations = [];
  if (isSuperAdminUser) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    organizations = data || [];
  }

  // Загружаем типы автомобилей для организации пользователя
  let vehicleTypes = [];
  const orgId = isSuperAdminUser ? null : currentUser.organization_id;

  let query = supabase
    .from('vehicle_types')
    .select('id, name, fuel_consumption_per_100km')
    .order('name');

  if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data: types } = await query;
  vehicleTypes = types || [];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🚗 Добавить автомобиль</h1>
      <VehicleForm
        currentUser={currentUser}
        organizations={organizations}
        vehicleTypes={vehicleTypes}
      />
    </div>
  );
}
