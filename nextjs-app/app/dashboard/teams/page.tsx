import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { DeleteItemButton } from '@/components/DeleteItemButton';
import { RoleGuard } from '@/components/RoleGuard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { type UserRole } from '@/lib/types/roles';

const ITEMS_PER_PAGE = 10;

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const supabase = await createServerClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orgId = user.user_metadata?.organization_id;
  const userRole = (user?.user_metadata?.role || 'viewer') as UserRole;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch teams with pagination
  const { data: teams, count: teamsCount, error } = await supabase
    .from('teams')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('name')
    .range(from, to);

  if (error) {
    console.error('Error fetching teams:', error);
  }

  const totalPages = Math.ceil((teamsCount || 0) / ITEMS_PER_PAGE);

  // Get counts and lead info for each team
  const teamsWithCounts = await Promise.all((teams || []).map(async (team) => {
    // Get lead info if lead_id exists
    let lead = null;
    if (team.lead_id) {
      const { data: leadData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', team.lead_id)
        .single();
      lead = leadData;
    }

    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team.id);

    const { count: membersCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team.id);

    const { count: vehiclesCount } = await supabase
      .from('vehicle_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team.id)
      .or('end_date.is.null,end_date.gt.' + new Date().toISOString());

    return {
      ...team,
      lead,
      users_count: usersCount || 0,
      members_count: membersCount || 0,
      vehicles_count: vehiclesCount || 0,
    };
  }));

  // Fetch all team members
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select(`
      *,
      team:teams(id, name)
    `)
    .eq('organization_id', orgId)
    .order('first_name');

  // Fetch team member documents
  const { data: documents } = await supabase
    .from('team_member_documents')
    .select(`
      *,
      team_member:team_members(first_name, last_name)
    `)
    .order('upload_date', { ascending: false });

  // Filter expired and expiring documents
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const expiredDocs = documents?.filter(doc =>
    doc.expiry_date && new Date(doc.expiry_date) < today
  ) || [];

  const expiringDocs = documents?.filter(doc =>
    doc.expiry_date &&
    new Date(doc.expiry_date) >= today &&
    new Date(doc.expiry_date) <= thirtyDaysFromNow
  ) || [];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Панель управления', href: '/dashboard' },
          { label: 'Бригады' },
        ]}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">👷 Бригады и участники</h1>
          <p className="text-gray-600">Управление бригадами, участниками и их документами</p>
        </div>
        <RoleGuard allowedRoles={['admin', 'manager']} userRole={userRole}>
          <Link href="/dashboard/teams/new">
            <Button>➕ Добавить бригаду</Button>
          </Link>
        </RoleGuard>
      </div>

      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">👥 Бригады ({teamsCount || 0})</TabsTrigger>
          <TabsTrigger value="members">👷 Участники ({teamMembers?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">📄 Документы ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="expiring">⚠️ Истекающие ({expiringDocs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          {teamsWithCounts && teamsWithCounts.length > 0 ? (
            <>
              <div className="space-y-4">
                {teamsWithCounts.map((team) => (
                  <div key={team.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{team.name}</h3>
                        {team.lead ? (
                          <p className="text-gray-600">
                            👤 Лидер: {team.lead.first_name} {team.lead.last_name}
                          </p>
                        ) : (
                          <p className="text-gray-500">👤 Лидер: не назначен</p>
                        )}
                      </div>

                      <div className="flex gap-8 text-sm mr-8">
                        <div className="text-center">
                          <p className="text-gray-500">👥 Пользователей</p>
                          <p className="text-2xl font-semibold">{team.users_count}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500">👷 Участников</p>
                          <p className="text-2xl font-semibold">{team.members_count}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500">🚗 Автомобилей</p>
                          <p className="text-2xl font-semibold">{team.vehicles_count}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <RoleGuard allowedRoles={['admin', 'manager']} userRole={userRole}>
                          <Link href={`/dashboard/teams/${team.id}/edit`}>
                            <Button variant="outline" size="sm">✏️</Button>
                          </Link>
                        </RoleGuard>
                        <Link href={`/dashboard/teams/${team.id}`}>
                          <Button variant="outline" size="sm">👁️</Button>
                        </Link>
                        <RoleGuard allowedRoles={['admin', 'manager']} userRole={userRole}>
                          <DeleteItemButton
                            id={team.id}
                            baseUrl="/api/teams"
                            itemName={`бригаду "${team.name}"`}
                            size="sm"
                          />
                        </RoleGuard>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                baseUrl="/dashboard/teams"
              />
              <PaginationInfo
                currentPage={currentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={teamsCount || 0}
              />
            </>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-white">
              <div className="text-6xl mb-4">👷</div>
              <p className="text-gray-500 mb-4">Нет созданных бригад</p>
              <RoleGuard allowedRoles={['admin', 'manager']} userRole={userRole}>
                <Link href="/dashboard/teams/new">
                  <Button>➕ Создать первую бригаду</Button>
                </Link>
              </RoleGuard>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {teamMembers && teamMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition">
                  <h3 className="font-semibold text-lg">
                    {member.first_name} {member.last_name}
                  </h3>
                  {member.phone && (
                    <p className="text-sm text-gray-600">📞 {member.phone}</p>
                  )}
                  {member.category && (
                    <p className="text-sm text-gray-500">Категория: {member.category}</p>
                  )}
                  {member.team ? (
                    <p className="text-sm text-gray-500">Бригада: {member.team.name}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Бригада не назначена</p>
                  )}
                  <div className="mt-4">
                    <Link href={`/dashboard/team-members/${member.id}`}>
                      <Button size="sm" className="w-full">Просмотр документов</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-white">
              <p className="text-gray-500">Нет участников</p>
              <p className="text-sm text-gray-400 mt-2">
                Добавьте участников через страницу бригад
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {documents && documents.length > 0 ? (
            <div className="bg-white border rounded-lg divide-y">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{doc.title}</h3>
                      {doc.team_member && (
                        <p className="text-sm text-gray-600">
                          👤 {doc.team_member.first_name} {doc.team_member.last_name}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        📅 Загружен: {new Date(doc.upload_date).toLocaleDateString('ru-RU')}
                      </p>
                      {doc.expiry_date && (
                        <p className="text-sm text-gray-500">
                          ⏰ Истекает: {new Date(doc.expiry_date).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </div>
                    <Link href={`/dashboard/team-members/${doc.team_member_id}`}>
                      <Button variant="outline" size="sm">Просмотр</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-white">
              <p className="text-gray-500">Нет документов</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expiring" className="space-y-4">
          {expiringDocs.length > 0 || expiredDocs.length > 0 ? (
            <div className="space-y-4">
              {expiredDocs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">❌ Просроченные ({expiredDocs.length})</h3>
                  <div className="bg-white border rounded-lg divide-y">
                    {expiredDocs.map((doc) => (
                      <div key={doc.id} className="p-4 bg-red-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">❌ {doc.title}</h3>
                            {doc.team_member && (
                              <p className="text-sm text-gray-600">
                                👤 {doc.team_member.first_name} {doc.team_member.last_name}
                              </p>
                            )}
                            <p className="text-sm text-red-600 font-medium">
                              Просрочен: {new Date(doc.expiry_date!).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <Link href={`/dashboard/team-members/${doc.team_member_id}`}>
                            <Button variant="destructive" size="sm">Обновить срочно</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expiringDocs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-orange-600">⚠️ Истекают скоро ({expiringDocs.length})</h3>
                  <div className="bg-white border rounded-lg divide-y">
                    {expiringDocs.map((doc) => (
                      <div key={doc.id} className="p-4 bg-yellow-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">⚠️ {doc.title}</h3>
                            {doc.team_member && (
                              <p className="text-sm text-gray-600">
                                👤 {doc.team_member.first_name} {doc.team_member.last_name}
                              </p>
                            )}
                            <p className="text-sm text-orange-600 font-medium">
                              Истекает: {new Date(doc.expiry_date!).toLocaleDateString('ru-RU')}
                              {' '}({Math.ceil((new Date(doc.expiry_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} дней)
                            </p>
                          </div>
                          <Link href={`/dashboard/team-members/${doc.team_member_id}`}>
                            <Button variant="outline" size="sm">Обновить</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-white">
              <p className="text-green-600">✅ Нет истекающих или просроченных документов</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
