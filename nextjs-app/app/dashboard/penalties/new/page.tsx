import { PenaltyForm } from './PenaltyForm';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

export default async function NewPenaltyPage() {
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

  // Fetch users
  let usersQuery = supabase
    .from('users')
    .select('id, first_name, last_name');
  usersQuery = applyOrgFilter(usersQuery, userContext);
  usersQuery = usersQuery.order('first_name');
  const { data: users } = await usersQuery;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Добавить штраф / Strafe hinzufügen</h1>
        <p className="text-gray-600">Зарегистрировать новый штраф</p>
      </div>

      <PenaltyForm vehicles={vehicles || []} users={users || []} />
    </div>
  );
}
