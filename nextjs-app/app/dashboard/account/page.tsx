import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AccountPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orgId = user.user_metadata?.organization_id;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  // Get organization info
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  // Get all users in organization
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  // Get statistics
  const { count: vehiclesCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  const { count: teamsCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  const { count: penaltiesCount } = await supabase
    .from('penalties')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  const ROLE_ICONS = {
    owner: '👑',
    admin: '🔧',
    manager: '💼',
    team_lead: '👨‍💼',
    worker: '👷',
  };

  const ROLE_NAMES = {
    owner: 'Владелец',
    admin: 'Администратор',
    manager: 'Менеджер',
    team_lead: 'Бригадир',
    worker: 'Работник',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🏢 Управление аккаунтом / Account Management</h1>
        <p className="text-gray-600">Информация об организации и пользователях</p>
      </div>

      {/* Organization Info */}
      {org && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Информация об организации</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Название организации</p>
              <p className="text-lg font-semibold">{org.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Дата создания</p>
              <p className="text-lg font-semibold">
                {org.created_at ? new Date(org.created_at).toLocaleDateString('ru-RU') : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Статус подписки</p>
              <p className="text-lg font-semibold">{org.subscription_status || 'active'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600">Пользователей</p>
          <p className="text-3xl font-bold mt-2">{users?.length || 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600">Автомобилей</p>
          <p className="text-3xl font-bold mt-2">{vehiclesCount || 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600">Бригад</p>
          <p className="text-3xl font-bold mt-2">{teamsCount || 0}</p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">👥 Пользователи аккаунта</h2>
        <p className="text-sm text-gray-600 mb-4">Всего пользователей в аккаунте: {users?.length || 0}</p>

        {users && users.length > 0 ? (
          <div className="space-y-4">
            {users.map((u) => (
              <div key={u.id} className="border-b pb-4 last:border-b-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">
                      {ROLE_ICONS[u.role as keyof typeof ROLE_ICONS]}{' '}
                      {u.first_name} {u.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">📧 {u.email}</p>
                    <p className="text-sm text-gray-600">
                      Роль: {ROLE_NAMES[u.role as keyof typeof ROLE_NAMES]}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Создан: {u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Нет пользователей</p>
        )}
      </div>
    </div>
  );
}
