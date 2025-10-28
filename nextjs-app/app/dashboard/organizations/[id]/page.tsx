import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { type UserRole } from '@/lib/types/roles';

type SubscriptionStatus = 'active' | 'inactive' | 'suspended' | 'trial';

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Активна',
  inactive: 'Неактивна',
  suspended: 'Приостановлена',
  trial: 'Пробный период',
};

const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800',
  trial: 'bg-yellow-100 text-yellow-800',
};

export default async function OrganizationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createServerClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userRole = (user?.user_metadata?.role || 'viewer') as UserRole;
  const userOrgId = user?.user_metadata?.organization_id;

  // Owner can view any organization, others can only view their own
  if (userRole !== 'owner' && id !== userOrgId) {
    redirect('/dashboard');
  }

  // Fetch organization
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !organization) {
    notFound();
  }

  // Get counts
  const { count: usersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', id);

  const { count: vehiclesCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', id);

  const { count: expensesCount } = await supabase
    .from('car_expenses')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', id);

  // Get recent users
  const { data: recentUsers } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get recent vehicles
  const { data: recentVehicles } = await supabase
    .from('vehicles')
    .select('id, name, license_plate, status')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Панель управления', href: '/dashboard' },
          { label: 'Организации', href: '/dashboard/organizations' },
          { label: organization.name },
        ]}
      />

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">🏢 {organization.name}</h1>
          <p className="text-gray-600 mt-1">Информация об организации</p>
        </div>
        {(userRole === 'owner' || userRole === 'admin') && (
          <Link href={`/dashboard/organizations/${id}/edit`}>
            <Button>✏️ Редактировать</Button>
          </Link>
        )}
      </div>

      {/* Organization Info Card */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">📋 Основная информация</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Название</p>
            <p className="font-medium">{organization.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Статус подписки</p>
            <span
              className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                SUBSCRIPTION_STATUS_COLORS[organization.subscription_status as SubscriptionStatus]
              }`}
            >
              {SUBSCRIPTION_STATUS_LABELS[organization.subscription_status as SubscriptionStatus]}
            </span>
          </div>
          {organization.telegram_chat_id && (
            <div>
              <p className="text-sm text-gray-500">Telegram Chat ID</p>
              <p className="font-medium">{organization.telegram_chat_id}</p>
            </div>
          )}
          {organization.subscription_expires_at && (
            <div>
              <p className="text-sm text-gray-500">Подписка действует до</p>
              <p className="font-medium">
                {new Date(organization.subscription_expires_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Дата создания</p>
            <p className="font-medium">
              {new Date(organization.created_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">👤 Пользователей</p>
              <p className="text-3xl font-bold">{usersCount || 0}</p>
            </div>
          </div>
          <Link href="/dashboard/users" className="text-blue-600 text-sm mt-4 inline-block hover:underline">
            Перейти к пользователям →
          </Link>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">🚗 Автомобилей</p>
              <p className="text-3xl font-bold">{vehiclesCount || 0}</p>
            </div>
          </div>
          <Link href="/dashboard/vehicles" className="text-blue-600 text-sm mt-4 inline-block hover:underline">
            Перейти к автомобилям →
          </Link>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">💰 Расходов</p>
              <p className="text-3xl font-bold">{expensesCount || 0}</p>
            </div>
          </div>
          <Link href="/dashboard/car-expenses" className="text-blue-600 text-sm mt-4 inline-block hover:underline">
            Перейти к расходам →
          </Link>
        </div>
      </div>

      {/* Recent Users */}
      {recentUsers && recentUsers.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">👥 Последние пользователи</h2>
            <Link href="/dashboard/users" className="text-blue-600 text-sm hover:underline">
              Все пользователи →
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map((u) => (
              <Link
                key={u.id}
                href={`/dashboard/users/${u.id}`}
                className="block p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.first_name} {u.last_name}</p>
                    <p className="text-sm text-gray-600">{u.email}</p>
                  </div>
                  <span className="text-sm text-gray-500">{u.role}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Vehicles */}
      {recentVehicles && recentVehicles.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🚗 Последние автомобили</h2>
            <Link href="/dashboard/vehicles" className="text-blue-600 text-sm hover:underline">
              Все автомобили →
            </Link>
          </div>
          <div className="space-y-3">
            {recentVehicles.map((v) => (
              <Link
                key={v.id}
                href={`/dashboard/vehicles/${v.id}`}
                className="block p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-sm text-gray-600">{v.license_plate}</p>
                  </div>
                  <span className="text-sm text-gray-500">{v.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
