import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { VehicleTypeForm } from '../VehicleTypeForm';

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

// Check if user is Super Admin
function isSuperAdmin(user: any): boolean {
  return user.role === 'owner' || (user.role === 'admin' && user.organization_id === null);
}

export default async function NewVehicleTypePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Only admin and manager can create vehicle types
  if (!['owner', 'admin', 'manager'].includes(user.role)) {
    redirect('/dashboard');
  }

  const supabase = await createServerClient();
  const isSuperAdminUser = isSuperAdmin(user);

  // Fetch organizations for Super Admin
  let organizations = [];
  if (isSuperAdminUser) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    organizations = data || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Новый тип автомобиля</h1>
        <p className="text-gray-600 mt-1">
          Создайте новый тип с ожидаемым расходом топлива
        </p>
      </div>

      <VehicleTypeForm
        currentUser={user}
        organizations={organizations}
      />
    </div>
  );
}
