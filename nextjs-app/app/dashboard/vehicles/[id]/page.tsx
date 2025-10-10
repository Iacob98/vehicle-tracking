import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { VehicleDocuments } from './VehicleDocuments';
import { VehicleAssignments } from './VehicleAssignments';

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

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
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name');

  // Get vehicle assignments
  const { data: assignments } = await supabase
    .from('vehicle_assignments')
    .select(`
      *,
      team:teams(name)
    `)
    .eq('vehicle_id', id)
    .order('start_date', { ascending: false });

  return (
    <div className="max-w-6xl space-y-6">
      <VehicleAssignments
        vehicleId={id}
        vehicleName={`${vehicle.license_plate} (${vehicle.model || vehicle.type})`}
        teams={teams || []}
        initialAssignments={assignments || []}
      />
      <VehicleDocuments vehicle={vehicle} initialDocuments={documents || []} />
    </div>
  );
}
