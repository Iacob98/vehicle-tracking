import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TeamForm } from './TeamForm';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth-helpers';

export default async function NewTeamPage() {
  const supabase = await createServerClient();
  const currentUser = await getCurrentUser();
  const isSuperAdminUser = isSuperAdmin(currentUser);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  let usersQuery = supabase
    .from('users')
    .select('id, first_name, last_name, role');
  usersQuery = applyOrgFilter(usersQuery, userContext);
  usersQuery = usersQuery.order('first_name');
  const { data: users } = await usersQuery;

  // Загружаем организации только для Super Admin
  let organizations: Array<{ id: string; name: string }> = [];
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
        <h1 className="text-3xl font-bold">➕ Создать бригаду</h1>
        <p className="text-gray-600">Добавьте новую бригаду в систему</p>
      </div>

      <TeamForm
        users={users || []}
        currentUser={currentUser}
        organizations={organizations}
      />
    </div>
  );
}
