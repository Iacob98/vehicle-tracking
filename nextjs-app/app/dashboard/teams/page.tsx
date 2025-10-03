import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function TeamsPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  const { data: teams } = await supabase
    .from('teams')
    .select(`
      *,
      lead:users!teams_lead_id_fkey(first_name, last_name),
      team_members(id)
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бригады</h1>
          <p className="text-gray-600">Управление бригадами и составом</p>
        </div>
        <Link
          href="/dashboard/teams/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Создать бригаду
        </Link>
      </div>

      {teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/dashboard/teams/${team.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Бригадир: {team.lead ? `${team.lead.first_name} ${team.lead.last_name}` : 'Не назначен'}
                  </p>
                </div>
                <div className="text-3xl">👥</div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{team.team_members?.length || 0} работников</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Нет бригад
          </h3>
          <p className="text-gray-600 mb-6">
            Создайте первую бригаду для организации работы
          </p>
          <Link
            href="/dashboard/teams/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Создать бригаду
          </Link>
        </div>
      )}
    </div>
  );
}
