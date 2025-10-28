import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES, type UserRole } from '@/lib/types/roles';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

export default async function AccountPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  // Get organization info (only if user has organization_id)
  let org = null;
  if (userContext.organizationId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userContext.organizationId)
      .single();
    org = orgData;
  }

  // Get all users in organization
  let usersQuery = supabase
    .from('users')
    .select('*');
  usersQuery = applyOrgFilter(usersQuery, userContext);
  usersQuery = usersQuery.order('created_at', { ascending: false });
  const { data: users } = await usersQuery;

  // Get statistics
  let vehiclesQuery = supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true });
  vehiclesQuery = applyOrgFilter(vehiclesQuery, userContext);
  const { count: vehiclesCount } = await vehiclesQuery;

  let teamsQuery = supabase
    .from('teams')
    .select('*', { count: 'exact', head: true });
  teamsQuery = applyOrgFilter(teamsQuery, userContext);
  const { count: teamsCount } = await teamsQuery;

  let penaltiesQuery = supabase
    .from('penalties')
    .select('*', { count: 'exact', head: true });
  penaltiesQuery = applyOrgFilter(penaltiesQuery, userContext);
  const { count: penaltiesCount } = await penaltiesQuery;

  // Используем централизованную систему ролей
  const getRoleDisplay = (role: string) => {
    const roleKey = role as UserRole;
    return ROLES[roleKey] || ROLES.viewer;
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
                      {u.first_name} {u.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">📧 {u.email}</p>
                    <p className="text-sm text-gray-600">
                      Роль: {getRoleDisplay(u.role).label}
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
