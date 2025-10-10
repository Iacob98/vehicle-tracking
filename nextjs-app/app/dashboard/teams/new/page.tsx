import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TeamForm } from './TeamForm';

export default async function NewTeamPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orgId = user.user_metadata?.organization_id;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('organization_id', orgId)
    .order('first_name');

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Создать бригаду</h1>
        <p className="text-gray-600">Добавьте новую бригаду в систему</p>
      </div>

      <TeamForm users={users || []} />
    </div>
  );
}
