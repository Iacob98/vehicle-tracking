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

  // Загружаем типы автомобилей (они универсальны для всех организаций)
  const { data: types } = await supabase
    .from('vehicle_types')
    .select('id, name, fuel_consumption_per_100km')
    .order('name');
  const vehicleTypes = types || [];

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
