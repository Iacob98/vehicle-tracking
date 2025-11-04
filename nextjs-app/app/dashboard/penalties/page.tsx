import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { RoleGuard } from '@/components/RoleGuard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { type UserRole } from '@/lib/types/roles';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

const ITEMS_PER_PAGE = 15;

const STATUS_ICONS = {
  open: '🔴',
  paid: '🟢',
};

const STATUS_NAMES = {
  open: 'К оплате / Offen',
  paid: 'Оплачен / Bezahlt',
};

export default async function PenaltiesPage({
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

  const userContext = getUserQueryContext(user);
  const userRole = (user?.user_metadata?.role || 'viewer') as UserRole;

  // Fetch statistics (all penalties for stats) - используем applyOrgFilter для owner support
  let statsQuery = supabase
    .from('penalties')
    .select('status, amount');

  statsQuery = applyOrgFilter(statsQuery, userContext);
  const { data: allPenalties } = await statsQuery;

  const stats = {
    total: allPenalties?.length || 0,
    open: allPenalties?.filter(p => p.status === 'open').length || 0,
    totalAmount: allPenalties?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,
    openAmount: allPenalties?.filter(p => p.status === 'open').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,
  };

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch penalties with pagination - используем applyOrgFilter для owner support
  let penaltiesQuery = supabase
    .from('penalties')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .range(from, to);

  penaltiesQuery = applyOrgFilter(penaltiesQuery, userContext);
  const { data: penalties, count: penaltiesCount } = await penaltiesQuery;

  const totalPages = Math.ceil((penaltiesCount || 0) / ITEMS_PER_PAGE);

  // Get related data for each penalty
  const penaltiesWithDetails = await Promise.all((penalties || []).map(async (penalty) => {
    // Get vehicle info
    let vehicleInfo = null;
    if (penalty.vehicle_id) {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('name, license_plate')
        .eq('id', penalty.vehicle_id)
        .single();
      vehicleInfo = vehicleData;
    }

    // Get user info
    let userInfo = null;
    if (penalty.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', penalty.user_id)
        .single();
      userInfo = userData;
    }

    return {
      ...penalty,
      vehicle_name: vehicleInfo?.name,
      license_plate: vehicleInfo?.license_plate,
      user_name: userInfo ? `${userInfo.first_name} ${userInfo.last_name}` : null,
    };
  }));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Панель управления', href: '/dashboard' },
          { label: 'Штрафы' },
        ]}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🚧 Штрафы / Strafen</h1>
          <p className="text-gray-600">Управление штрафами и их оплатой</p>
        </div>
        <RoleGuard allowedRoles={['owner', 'admin', 'manager']} userRole={userRole}>
          <Link href="/dashboard/penalties/new">
            <Button>➕ Добавить штраф</Button>
          </Link>
        </RoleGuard>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600">Всего штрафов / Strafen insgesamt</p>
          <p className="text-3xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600">Общая сумма / Gesamtbetrag</p>
          <p className="text-3xl font-bold mt-2">€{stats.totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-sm text-gray-600">К оплате / Zu zahlen</p>
          <p className="text-3xl font-bold mt-2 text-red-600">€{stats.openAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Penalties List */}
      {penaltiesWithDetails && penaltiesWithDetails.length > 0 ? (
        <>
          <div className="space-y-4">
            {penaltiesWithDetails.map((penalty) => (
              <div key={penalty.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <h3 className="font-semibold">
                        {penalty.vehicle_name} ({penalty.license_plate})
                      </h3>
                      {penalty.user_name && (
                        <p className="text-sm text-gray-600 mt-1">👤 {penalty.user_name}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        📅 {penalty.date ? new Date(penalty.date).toLocaleDateString('ru-RU') : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-2xl font-bold">€{parseFloat(penalty.amount || 0).toFixed(2)}</p>
                      <p className="text-sm mt-1">
                        {STATUS_ICONS[penalty.status as keyof typeof STATUS_ICONS]}{' '}
                        {STATUS_NAMES[penalty.status as keyof typeof STATUS_NAMES]}
                      </p>
                    </div>

                    <div>
                      {penalty.photo_url ? (
                        <div>
                          <p className="text-sm text-green-600">
                            📷 {penalty.photo_url.split(';').length} файл(ов) / Datei(en)
                          </p>
                          {penalty.status === 'paid' && penalty.photo_url.split(';').length > 1 && (
                            <p className="text-sm text-blue-600">✅ С чеком / Mit Beleg</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">📷 Нет фото / Kein Foto</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/dashboard/penalties/${penalty.id}`}>
                        <Button variant="outline" size="sm">👁️ Просмотр</Button>
                      </Link>
                      <RoleGuard allowedRoles={['owner', 'admin', 'manager']} userRole={userRole}>
                        <Link href={`/dashboard/penalties/${penalty.id}/edit`}>
                          <Button variant="outline" size="sm">✏️</Button>
                        </Link>
                      </RoleGuard>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/dashboard/penalties"
          />
          <PaginationInfo
            currentPage={currentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={penaltiesCount || 0}
          />
        </>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <div className="text-6xl mb-4">🚧</div>
          <p className="text-gray-500 mb-4">Нет штрафов / Keine Strafen</p>
          <RoleGuard allowedRoles={['owner', 'admin', 'manager']} userRole={userRole}>
            <Link href="/dashboard/penalties/new">
              <Button>➕ Добавить первый штраф</Button>
            </Link>
          </RoleGuard>
        </div>
      )}
    </div>
  );
}
