import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserForm } from './UserForm';

export default async function NewUserPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orgId = user.user_metadata?.organization_id;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  // Fetch teams for assignment
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name');

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
