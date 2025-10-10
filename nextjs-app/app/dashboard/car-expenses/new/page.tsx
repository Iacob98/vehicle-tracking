import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CarExpenseForm } from './CarExpenseForm';

export default async function NewCarExpensePage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orgId = user.user_metadata?.organization_id;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  // Fetch vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, name, license_plate')
    .eq('organization_id', orgId)
    .order('name');

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Добавить расход на авто</h1>
        <p className="text-gray-600">Зарегистрировать новый расход</p>
      </div>

      <CarExpenseForm vehicles={vehicles || []} />
    </div>
  );
}
