import { createServerClient } from '@/lib/supabase/server';
import { VehiclesTable } from './VehiclesTable';

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const supabase = await createServerClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  // Build query with filters
  let query = supabase
    .from('vehicles')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId);

  // Search filter (name, license_plate, vin)
  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,license_plate.ilike.%${params.search}%,vin.ilike.%${params.search}%`
    );
  }

  // Status filter
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  // Smart sorting: numeric names first (1, 2, 10, 11) then alphabetical
  query = query.order('name', { ascending: true });

  const { data: vehicles, count } = await query;

  return <VehiclesTable vehicles={vehicles || []} totalCount={count || 0} />;
}
