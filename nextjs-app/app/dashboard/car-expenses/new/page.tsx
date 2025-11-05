import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CarExpenseForm } from './CarExpenseForm';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth-helpers';

export default async function NewCarExpensePage() {
  const supabase = await createServerClient();
  const currentUser = await getCurrentUser();
  const isSuperAdminUser = isSuperAdmin(currentUser);

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
  const { data: vehiclesData } = await vehiclesQuery;

  // Fetch last odometer reading for each vehicle
  const vehicles = await Promise.all(
    (vehiclesData || []).map(async (vehicle) => {
      const { data: lastExpense } = await supabase
        .from('car_expenses')
        .select('odometer_reading')
        .eq('vehicle_id', vehicle.id)
        .eq('category', 'fuel')
        .not('odometer_reading', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...vehicle,
        last_odometer: lastExpense?.odometer_reading || null,
      };
    })
  );

  // Загружаем организации только для Super Admin
  let organizations = [];
  if (isSuperAdminUser) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    organizations = data || [];
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Добавить расход на авто</h1>
        <p className="text-gray-600">Зарегистрировать новый расход</p>
      </div>

      <CarExpenseForm
        vehicles={vehicles}
        currentUser={currentUser}
        organizations={organizations}
      />
    </div>
  );
}
