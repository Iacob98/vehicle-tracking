import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { ROLES, type UserRole } from '@/lib/types/roles';

const ITEMS_PER_PAGE = 15;

export default async function UsersPage({
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

  const orgId = user.user_metadata?.organization_id;
  const currentUserId = user.id;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch users with pagination
  const { data: users, count: usersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('first_name')
    .range(from, to);

  const totalPages = Math.ceil((usersCount || 0) / ITEMS_PER_PAGE);

  // Get team names for users
  const usersWithTeams = await Promise.all((users || []).map(async (u) => {
    let teamName = null;
    if (u.team_id) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('name')
        .eq('id', u.team_id)
        .single();
      teamName = teamData?.name;
    }

    // Count user documents
    const { count: docsCount } = await supabase
      .from('user_documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .eq('is_active', true);

    return {
      ...u,
      team_name: teamName,
      documents_count: docsCount || 0,
    };
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">👤 Пользователи платформы</h1>
          <p className="text-gray-600">Управление пользователями с аккаунтами в системе</p>
        </div>
        <Link href="/dashboard/users/new">
          <Button>➕ Добавить пользователя</Button>
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          ℹ️ Эта страница для управления пользователями с аккаунтами (с логинами и паролями).
        </p>
        <p className="text-sm text-blue-800 mt-1">
          👷 Для управления работниками без аккаунтов используйте страницу{' '}
          <Link href="/dashboard/team-members" className="underline font-medium">
            "Участники бригад"
          </Link>
        </p>
      </div>

      {usersWithTeams && usersWithTeams.length > 0 ? (
        <>
          <div className="space-y-4">
            {usersWithTeams.map((u) => (
              <div key={u.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold">
                        {u.first_name} {u.last_name}
                      </h3>
                      <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                        {ROLES[u.role as UserRole]?.label || u.role}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">✉️ {u.email}</p>
                      {u.phone && <p className="text-sm text-gray-600">📞 {u.phone}</p>}
                      {u.team_name ? (
                        <p className="text-sm text-gray-600">👥 Бригада: {u.team_name}</p>
                      ) : (
                        <p className="text-sm text-gray-400">Бригада не назначена</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center mr-4">
                      <p className="text-sm text-gray-500">📄 Документов</p>
                      <p className="text-2xl font-semibold">{u.documents_count}</p>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/dashboard/users/${u.id}`}>
                        <Button variant="outline" size="sm">👁️ Просмотр</Button>
                      </Link>
                      <Link href={`/dashboard/users/${u.id}/edit`}>
                        <Button variant="outline" size="sm">✏️</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/dashboard/users"
          />
          <PaginationInfo
            currentPage={currentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={usersCount || 0}
          />
        </>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-gray-500 mb-4">Нет пользователей платформы</p>
          <Link href="/dashboard/users/new">
            <Button>➕ Добавить первого пользователя</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
