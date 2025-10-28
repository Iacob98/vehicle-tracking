import { createServerClient } from '@/lib/supabase/server';
import { VehiclesTable } from './VehiclesTable';
import { type UserRole } from '@/lib/types/roles';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

const ITEMS_PER_PAGE = 20;

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const supabase = await createServerClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  const userContext = getUserQueryContext(user);
  const userRole = (user?.user_metadata?.role || 'viewer') as UserRole;

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Build query with filters - используем applyOrgFilter для owner support
  let query = supabase
    .from('vehicles')
    .select('*', { count: 'exact' });

  query = applyOrgFilter(query, userContext);

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

  // Get all vehicles first (without pagination for proper sorting)
  const { data: allVehicles, count } = await query;

  // Smart sorting: numeric names first (1, 2, 3... not 1, 10, 11...)
  const sortedVehicles = allVehicles?.sort((a, b) => {
    const aNum = parseInt(a.name);
    const bNum = parseInt(b.name);

    // If both are numbers, sort numerically
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }

    // Otherwise, sort alphabetically
    return a.name.localeCompare(b.name);
  }) || [];

  // Apply pagination after sorting
  const vehicles = sortedVehicles.slice(from, to + 1);

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  return (
    <VehiclesTable
      vehicles={vehicles || []}
      totalCount={count || 0}
      currentPage={currentPage}
      totalPages={totalPages}
      itemsPerPage={ITEMS_PER_PAGE}
      userRole={userRole}
    />
  );
}
