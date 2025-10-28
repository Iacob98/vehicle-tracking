import { ExpenseForm } from './ExpenseForm';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

export default async function NewExpensePage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  // Fetch vehicles and teams
  let vehiclesQuery = supabase
    .from('vehicles')
    .select('id, name, license_plate');
  vehiclesQuery = applyOrgFilter(vehiclesQuery, userContext);
  vehiclesQuery = vehiclesQuery.order('name');
  const { data: vehicles } = await vehiclesQuery;

  let teamsQuery = supabase
    .from('teams')
    .select('id, name');
  teamsQuery = applyOrgFilter(teamsQuery, userContext);
  teamsQuery = teamsQuery.order('name');
  const { data: teams } = await teamsQuery;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Добавить расход / Ausgabe hinzufügen</h1>
        <p className="text-gray-600">Зарегистрировать новый расход</p>
      </div>

      <ExpenseForm vehicles={vehicles || []} teams={teams || []} />
    </div>
  );
}
