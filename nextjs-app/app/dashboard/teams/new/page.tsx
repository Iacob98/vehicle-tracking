import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export default async function NewTeamPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('organization_id', orgId)
    .in('role', ['team_lead', 'admin', 'manager'])
    .order('first_name');

  async function createTeam(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.user_metadata?.organization_id;

    const teamData = {
      organization_id: orgId,
      name: formData.get('name') as string,
      lead_id: formData.get('lead_id') as string || null,
    };

    const { error } = await supabase
      .from('teams')
      .insert(teamData);

    if (error) {
      console.error('Error creating team:', error);
      return;
    }

    revalidatePath('/dashboard/teams');
    redirect('/dashboard/teams');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Создать бригаду</h1>

      <form action={createTeam} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название *
          </label>
          <input
            type="text"
            name="name"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Бригада 1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Бригадир
          </label>
          <select
            name="lead_id"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Создать
          </button>
          <a
            href="/dashboard/teams"
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Отмена
          </a>
        </div>
      </form>
    </div>
  );
}
