import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

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

  async function createUser(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.user_metadata?.organization_id;

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as string;
    const teamId = formData.get('team_id') as string;

    if (!email || !password || !firstName || !lastName) {
      return;
    }

    // Note: In Supabase, user creation is handled differently
    // This is a simplified version - you need to use Supabase Admin API for creating users
    // For now, we'll create via direct INSERT (not recommended for production)

    try {
      // Hash password (in production, use proper hashing)
      const crypto = require('crypto');
      const passwordHash = crypto
        .createHash('sha256')
        .update(password + 'fleet_management_salt_2025')
        .digest('hex');

      const { error } = await supabase
        .from('users')
        .insert({
          organization_id: orgId,
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          role: role || 'worker',
          team_id: teamId || null,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error creating user:', error);
        return;
      }

      revalidatePath('/dashboard/users');
      redirect('/dashboard/users');
    } catch (error) {
      console.error('Error:', error);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Добавить пользователя</h1>
        <p className="text-gray-600">Создать нового пользователя с аккаунтом в системе</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          🔐 Добавленные пользователи получат полный доступ к данным вашей организации
        </p>
      </div>

      <form action={createUser} className="bg-white rounded-lg border p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email *
            </label>
            <Input
              type="email"
              name="email"
              required
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Пароль *
            </label>
            <Input
              type="password"
              name="password"
              required
              placeholder="Минимум 6 символов"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Имя *
            </label>
            <Input
              type="text"
              name="first_name"
              required
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
              placeholder="+7 900 123-45-67"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Роль
            </label>
            <select
              name="role"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="worker">👷 Работник</option>
              <option value="team_lead">👨‍💼 Бригадир</option>
              <option value="manager">💼 Менеджер</option>
              <option value="admin">🔧 Администратор</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              Бригада
            </label>
            <select
              name="team_id"
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
            👥 Добавить пользователя
          </Button>
          <Link href="/dashboard/users">
            <Button variant="outline" type="button">
              ❌ Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
