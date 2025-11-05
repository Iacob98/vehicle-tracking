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
    first_name: user.user_metadata?.first_name || '',
    last_name: user.user_metadata?.last_name || '',
    organization_id: user.user_metadata?.organization_id || null,
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

  // Determine which organization to show types for
  let organizationId = user.organization_id;

  // For owners (Super Admin), we need to get organization from query or show all
  const isSuperAdmin = user.role === 'owner' || (user.role === 'admin' && user.organization_id === null);

  // Fetch vehicle types
  let query = supabase
    .from('vehicle_types')
    .select('*')
    .order('name', { ascending: true });

  if (!isSuperAdmin && organizationId) {
    query = query.eq('organization_id', organizationId);
  } else if (isSuperAdmin && organizationId) {
    // For Super Admin, filter by specific org if provided
    query = query.eq('organization_id', organizationId);
  }

  const { data: vehicleTypes, error } = await query;

  if (error) {
    console.error('Error fetching vehicle types:', error);
  }

  // Fetch organizations for Super Admin
  let organizations = [];
  if (isSuperAdmin) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    organizations = data || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Типы автомобилей</h1>
          <p className="text-gray-600 mt-1">
            Управление типами транспортных средств и их расходом топлива
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
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}
