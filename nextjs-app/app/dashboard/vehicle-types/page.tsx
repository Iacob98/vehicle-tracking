import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { VehicleTypesList } from './VehicleTypesList';

// Get current user helper
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

export default async function VehicleTypesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Only admin and manager can access this page
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    redirect('/dashboard');
  }

  const supabase = await createServerClient();

  // Fetch all vehicle types (they are universal)
  const { data: vehicleTypes, error } = await supabase
    .from('vehicle_types')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching vehicle types:', error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Типы автомобилей</h1>
          <p className="text-gray-600 mt-1">
            Управление типами транспортных средств и их расходом топлива
          </p>
          <p className="text-sm text-gray-500 mt-2">
            ℹ️ Типы автомобилей универсальны и доступны для всех организаций
          </p>
        </div>
        <Link href="/dashboard/vehicle-types/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить тип
          </Button>
        </Link>
      </div>

      {vehicleTypes && vehicleTypes.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Нет типов автомобилей</h3>
          <p className="text-gray-600 mb-4">
            Создайте первый тип автомобиля, чтобы отслеживать расход топлива
          </p>
          <Link href="/dashboard/vehicle-types/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать тип
            </Button>
          </Link>
        </div>
      ) : (
        <VehicleTypesList
          vehicleTypes={vehicleTypes || []}
        />
      )}
    </div>
  );
}
