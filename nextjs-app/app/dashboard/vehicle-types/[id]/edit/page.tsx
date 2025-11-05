import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { VehicleTypeForm } from '../../VehicleTypeForm';

async function getCurrentUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email!,
    role: (user.user_metadata?.role || 'viewer') as 'owner' | 'admin' | 'manager' | 'viewer' | 'driver',
  };
}

export default async function EditVehicleTypePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Only admin and manager can edit vehicle types
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    redirect('/dashboard');
  }

  const supabase = await createServerClient();

  // Fetch vehicle type
  const { data: vehicleType, error } = await supabase
    .from('vehicle_types')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !vehicleType) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Редактировать тип автомобиля</h1>
        <p className="text-gray-600 mt-1">
          Изменение параметров типа "{vehicleType.name}"
        </p>
        <p className="text-sm text-gray-500 mt-2">
          ℹ️ Типы автомобилей универсальны и доступны для всех организаций
        </p>
      </div>

      <VehicleTypeForm
        vehicleType={vehicleType}
      />
    </div>
  );
}
