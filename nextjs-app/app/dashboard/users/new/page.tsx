import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserForm } from './UserForm';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

export default async function NewUserPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  // Fetch teams for assignment
  let teamsQuery = supabase
    .from('teams')
    .select('id, name');
  teamsQuery = applyOrgFilter(teamsQuery, userContext);
  teamsQuery = teamsQuery.order('name');
  const { data: teams } = await teamsQuery;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Добавить пользователя</h1>
        <p className="text-gray-600">Создать нового пользователя с аккаунтом в системе</p>
      </div>

      <UserForm teams={teams || []} />
    </div>
  );
}
