import { createServerClient } from '@/lib/supabase/server';
import { VehiclesTable } from './VehiclesTable';

const ITEMS_PER_PAGE = 20;

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const supabase = await createServerClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

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

  // Apply pagination
  query = query.range(from, to);

  const { data: vehicles, count } = await query;

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  return (
    <VehiclesTable
      vehicles={vehicles || []}
      totalCount={count || 0}
      currentPage={currentPage}
      totalPages={totalPages}
      itemsPerPage={ITEMS_PER_PAGE}
    />
  );
}
