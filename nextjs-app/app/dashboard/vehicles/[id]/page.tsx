import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { VehicleDocuments } from './VehicleDocuments';
import { VehicleAssignments } from './VehicleAssignments';
import { VehicleOwnerCard } from './VehicleOwnerCard';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  const userContext = getUserQueryContext(user);

  let vehicleQuery = supabase
    .from('vehicles')
    .select('*')
    .eq('id', id);
  vehicleQuery = applyOrgFilter(vehicleQuery, userContext);
  const { data: vehicle } = await vehicleQuery.single();

  if (!vehicle) {
    notFound();
  }

  // Get documents for this vehicle
  const { data: documents } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', id)
    .eq('is_active', true)
    .order('date_expiry', { ascending: true, nullsFirst: false });

  // Get teams for assignment
  let teamsQuery = supabase
    .from('teams')
    .select('id, name');
  teamsQuery = applyOrgFilter(teamsQuery, userContext);
  teamsQuery = teamsQuery.order('name');
  const { data: teams } = await teamsQuery;

  // Get vehicle assignments
  const { data: assignments } = await supabase
    .from('vehicle_assignments')
    .select(`
      *,
      team:teams(name)
    `)
    .eq('vehicle_id', id)
    .order('start_date', { ascending: false });

  // Find current active assignment
  const currentAssignment = assignments?.find((a) => !a.end_date);
  const currentTeam = currentAssignment
    ? {
        name: currentAssignment.team.name,
        start_date: currentAssignment.start_date,
      }
    : null;

  return (
    <div className="max-w-6xl space-y-6">
      <VehicleOwnerCard
        vehicleName={`${vehicle.license_plate} (${vehicle.model || vehicle.name})`}
        currentTeam={currentTeam}
      />
      <VehicleAssignments
        vehicleId={id}
        vehicleName={`${vehicle.license_plate} (${vehicle.model || vehicle.name})`}
        organizationId={vehicle.organization_id}
        teams={teams || []}
        initialAssignments={assignments || []}
      />
      <VehicleDocuments vehicle={vehicle} initialDocuments={documents || []} />
    </div>
  );
}
