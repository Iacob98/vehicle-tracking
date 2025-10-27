import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ROLE_OPTIONS } from '@/lib/types/roles';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect('/login');
  }

  const orgId = currentUser.user_metadata?.organization_id;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  // Fetch user details
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (error || !user) {
    notFound();
  }

  // Fetch teams for assignment
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name');

  async function updateUser(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const orgId = currentUser?.user_metadata?.organization_id;

    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;
    const teamId = formData.get('team_id') as string;
    const fuelCardId = formData.get('fuel_card_id') as string;

    if (!firstName || !lastName) {
      return;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role: role || 'viewer',
        team_id: teamId || null,
        fuel_card_id: fuelCardId || null,
      })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return;
    }

    revalidatePath(`/dashboard/users/${id}`);
    revalidatePath('/dashboard/users');
    redirect(`/dashboard/users/${id}`);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">✏️ Редактировать пользователя</h1>
        <p className="text-gray-600">Изменить информацию о пользователе {user.first_name} {user.last_name}</p>
      </div>

      <form action={updateUser} className="bg-white rounded-lg border p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email (только для просмотра)
            </label>
            <Input
              type="email"
              value={user.email}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ℹ️ Email нельзя изменить. Для смены email создайте нового пользователя.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Имя *
            </label>
            <Input
              type="text"
              name="first_name"
              required
              defaultValue={user.first_name}
              placeholder="Иван"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Фамилия *
            </label>
            <Input
              type="text"
              name="last_name"
              required
              defaultValue={user.last_name}
              placeholder="Иванов"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Телефон
            </label>
            <Input
              type="text"
              name="phone"
              defaultValue={user.phone || ''}
              placeholder="+7 900 123-45-67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              ⛽ Номер заправочной карты
            </label>
            <Input
              type="text"
              name="fuel_card_id"
              defaultValue={user.fuel_card_id || ''}
              placeholder="1234-5678-9012"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              Номер карты для идентификации при заправке
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Роль
            </label>
            <select
              name="role"
              defaultValue={user.role}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              Бригада
            </label>
            <select
              name="team_id"
              defaultValue={user.team_id || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Не назначена</option>
              {teams?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit">
            💾 Сохранить изменения
          </Button>
          <Link href={`/dashboard/users/${id}`}>
            <Button variant="outline" type="button">
              ❌ Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
