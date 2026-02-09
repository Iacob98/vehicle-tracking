import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TeamMembers from './TeamMembers';
import TeamVehicles from './TeamVehicles';
import TeamDrivers from './TeamDrivers';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';
import { type UserRole } from '@/lib/types/roles';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);
  const userRole = (user?.user_metadata?.role || 'viewer') as UserRole;

  // Fetch team details
  let teamQuery = supabase
    .from('teams')
    .select('*')
    .eq('id', id);
  teamQuery = applyOrgFilter(teamQuery, userContext);
  const { data: team, error } = await teamQuery.single();

  if (error || !team) {
    notFound();
  }

  // Fetch lead info if exists
  let lead = null;
  if (team.lead_id) {
    const { data: leadData } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', team.lead_id)
      .single();
    lead = leadData;
  }

  // Fetch team members
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', id)
    .order('first_name');

  // Fetch users assigned to this team
  const { data: teamUsers } = await supabase
    .from('users')
    .select('*')
    .eq('team_id', id)
    .order('first_name');

  // Fetch vehicle assignments
  const { data: vehicleAssignments } = await supabase
    .from('vehicle_assignments')
    .select(`
      *,
      vehicle:vehicles(*)
    `)
    .eq('team_id', id)
    .or('end_date.is.null,end_date.gt.' + new Date().toISOString())
    .order('start_date', { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/teams">
              <Button variant="ghost" size="sm">← Назад</Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">👷 {team.name}</h1>
          {lead ? (
            <p className="text-gray-600">
              Лидер: {lead.first_name} {lead.last_name} ({lead.email})
            </p>
          ) : (
            <p className="text-gray-500">Лидер не назначен</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/teams/${id}/edit`}>
            <Button variant="outline">✏️ Редактировать</Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600">👥 Пользователей</h3>
          <p className="text-3xl font-bold mt-2">{teamUsers?.length || 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600">👷 Участников</h3>
          <p className="text-3xl font-bold mt-2">{teamMembers?.length || 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600">🚗 Автомобилей</h3>
          <p className="text-3xl font-bold mt-2">{vehicleAssignments?.length || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">👥 Пользователи ({teamUsers?.length || 0})</TabsTrigger>
          <TabsTrigger value="members">👷 Участники ({teamMembers?.length || 0})</TabsTrigger>
          <TabsTrigger value="vehicles">🚗 Автомобили ({vehicleAssignments?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <TeamDrivers
            teamId={id}
            orgId={userContext.organizationId || ''}
            userRole={userRole}
            initialUsers={teamUsers || []}
          />
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <TeamMembers teamId={id} orgId={userContext.organizationId || ''} initialMembers={teamMembers || []} />
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4">
          <TeamVehicles teamId={id} orgId={userContext.organizationId || ''} initialAssignments={vehicleAssignments || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
