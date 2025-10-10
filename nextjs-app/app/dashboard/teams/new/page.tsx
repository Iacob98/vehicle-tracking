import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

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

  async function createTeam(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.user_metadata?.organization_id;

    const name = formData.get('name') as string;
    const leadId = formData.get('lead_id') as string;

    if (!name) {
      return;
    }

    const teamData = {
      organization_id: orgId,
      name: name,
      lead_id: leadId || null,
      created_at: new Date().toISOString(),
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Создать бригаду</h1>
        <p className="text-gray-600">Добавьте новую бригаду в систему</p>
      </div>

      <form action={createTeam} className="bg-white rounded-lg border p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Название бригады *
          </label>
          <Input
            type="text"
            name="name"
            required
            placeholder="Введите название бригады"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Лидер бригады
          </label>
          <select
            name="lead_id"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            💾 Создать бригаду
          </Button>
          <Link href="/dashboard/teams">
            <Button variant="outline" type="button">
              ❌ Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
