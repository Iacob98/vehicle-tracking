import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTeamPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  // Fetch team
  let teamQuery = supabase
    .from('teams')
    .select('*')
    .eq('id', id);
  teamQuery = applyOrgFilter(teamQuery, userContext);
  const { data: team, error } = await teamQuery.single();

  if (error || !team) {
    notFound();
  }

  // Fetch users for lead selection
  let usersQuery = supabase
    .from('users')
    .select('id, first_name, last_name, role');
  usersQuery = applyOrgFilter(usersQuery, userContext);
  usersQuery = usersQuery.order('first_name');
  const { data: users } = await usersQuery;

  async function updateTeam(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userContext = getUserQueryContext(user);

    const name = formData.get('name') as string;
    const leadId = formData.get('lead_id') as string;

    if (!name) {
      return;
    }

    let updateQuery = supabase
      .from('teams')
      .update({
        name: name,
        lead_id: leadId || null,
      })
      .eq('id', id);
    updateQuery = applyOrgFilter(updateQuery, userContext);
    const { error } = await updateQuery;

    if (error) {
      console.error('Error updating team:', error);
      return;
    }

    revalidatePath(`/dashboard/teams/${id}`);
    revalidatePath('/dashboard/teams');
    redirect(`/dashboard/teams/${id}`);
  }

  async function deleteTeam() {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userContext = getUserQueryContext(user);

    let deleteQuery = supabase
      .from('teams')
      .delete()
      .eq('id', id);
    deleteQuery = applyOrgFilter(deleteQuery, userContext);
    const { error } = await deleteQuery;

    if (error) {
      console.error('Error deleting team:', error);
      return;
    }

    revalidatePath('/dashboard/teams');
    redirect('/dashboard/teams');
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">✏️ Редактировать бригаду</h1>
        <p className="text-gray-600">Изменить данные бригады</p>
      </div>

      <form action={updateTeam} className="bg-white rounded-lg border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Название бригады *
          </label>
          <Input
            type="text"
            name="name"
            required
            defaultValue={team.name}
            placeholder="Введите название бригады"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Лидер бригады
          </label>
          <select
            name="lead_id"
            defaultValue={team.lead_id || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Не назначен</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit">
            💾 Сохранить изменения
          </Button>
          <Link href={`/dashboard/teams/${id}`}>
            <Button variant="outline" type="button">
              ❌ Отмена
            </Button>
          </Link>
        </div>
      </form>

      <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Опасная зона</h3>
        <p className="text-sm text-red-700 mb-4">
          Удаление бригады необратимо. Все связанные данные будут удалены.
        </p>
        <form action={deleteTeam}>
          <Button type="submit" variant="destructive">
            🗑️ Удалить бригаду
          </Button>
        </form>
      </div>
    </div>
  );
}
