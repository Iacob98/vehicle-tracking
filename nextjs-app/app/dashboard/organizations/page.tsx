import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { type UserRole } from '@/lib/types/roles';
import { DeleteItemButton } from '@/components/DeleteItemButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const ITEMS_PER_PAGE = 15;

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

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createServerClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userRole = (user?.user_metadata?.role || 'viewer') as UserRole;

  // Only owner can access this page
  if (userRole !== 'owner') {
    redirect('/dashboard');
  }

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch organizations with pagination
  const { data: organizations, count: orgsCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact' })
    .order('name')
    .range(from, to);

  const totalPages = Math.ceil((orgsCount || 0) / ITEMS_PER_PAGE);

  // Get counts for each organization
  const orgsWithCounts = await Promise.all((organizations || []).map(async (org) => {
    // Count users
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id);

    // Count vehicles
    const { count: vehiclesCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id);

    // Count expenses
    const { count: expensesCount } = await supabase
      .from('car_expenses')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id);

    return {
      ...org,
      users_count: usersCount || 0,
      vehicles_count: vehiclesCount || 0,
      expenses_count: expensesCount || 0,
    };
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Панель управления', href: '/dashboard' },
          { label: 'Организации' },
        ]}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🏢 Организации</h1>
          <p className="text-gray-600">Управление организациями в системе</p>
        </div>
        <Link href="/dashboard/organizations/new">
          <Button>➕ Добавить организацию</Button>
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          ℹ️ На этой странице вы можете управлять всеми организациями в системе.
        </p>
        <p className="text-sm text-blue-800 mt-1">
          Каждая организация имеет свои автомобили, пользователей и расходы.
        </p>
      </div>

      {orgsWithCounts && orgsWithCounts.length > 0 ? (
        <>
          <div className="space-y-4">
            {orgsWithCounts.map((org) => (
              <div key={org.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold">{org.name}</h3>
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${
                          SUBSCRIPTION_STATUS_COLORS[org.subscription_status as SubscriptionStatus]
                        }`}
                      >
                        {SUBSCRIPTION_STATUS_LABELS[org.subscription_status as SubscriptionStatus]}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {org.telegram_chat_id && (
                        <p className="text-sm text-gray-600">📱 Telegram Chat ID: {org.telegram_chat_id}</p>
                      )}
                      {org.subscription_expires_at && (
                        <p className="text-sm text-gray-600">
                          📅 Подписка до:{' '}
                          {new Date(org.subscription_expires_at).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                      <p className="text-sm text-gray-400">
                        Создано: {new Date(org.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>

                    <div className="mt-3 flex gap-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">👤 Пользователей</p>
                        <p className="text-xl font-semibold">{org.users_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">🚗 Автомобилей</p>
                        <p className="text-xl font-semibold">{org.vehicles_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">💰 Расходов</p>
                        <p className="text-xl font-semibold">{org.expenses_count}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/organizations/${org.id}`}>
                      <Button variant="outline" size="sm">👁️ Просмотр</Button>
                    </Link>
                    <Link href={`/dashboard/organizations/${org.id}/edit`}>
                      <Button variant="outline" size="sm">✏️ Изменить</Button>
                    </Link>
                    <DeleteItemButton
                      id={org.id}
                      baseUrl="/api/organizations"
                      itemName={`организацию "${org.name}"`}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/dashboard/organizations"
          />
          <PaginationInfo
            currentPage={currentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={orgsCount || 0}
          />
        </>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <div className="text-6xl mb-4">🏢</div>
          <p className="text-gray-500 mb-4">Нет организаций</p>
          <Link href="/dashboard/organizations/new">
            <Button>➕ Добавить первую организацию</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
