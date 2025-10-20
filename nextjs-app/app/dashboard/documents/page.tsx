import { createServerClient } from '@/lib/supabase/server';
import { DocumentsTable } from './DocumentsTable';
import { type UserRole } from '@/lib/types/roles';

const ITEMS_PER_PAGE = 20;

export default async function AllDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; vehicle?: string; type?: string; status?: string; page?: string }>;
}) {
  const supabase = await createServerClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;
  const userRole = (user?.user_metadata?.role || 'viewer') as UserRole;

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Build query with filters
  let query = supabase
    .from('vehicle_documents')
    .select(`
      *,
      vehicles (
        id,
        name,
        license_plate,
        photo_url
      )
    `, { count: 'exact' })
    .eq('organization_id', orgId)
    .eq('is_active', true);

  // Search filter (title)
  if (params.search) {
    query = query.ilike('title', `%${params.search}%`);
  }

  // Vehicle filter
  if (params.vehicle && params.vehicle !== 'all') {
    query = query.eq('vehicle_id', params.vehicle);
  }

  // Document type filter
  if (params.type && params.type !== 'all') {
    query = query.eq('document_type', params.type);
  }

  // Status filter
  if (params.status && params.status !== 'all') {
    const now = new Date().toISOString();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    switch (params.status) {
      case 'valid':
        query = query.or(`date_expiry.is.null,date_expiry.gt.${thirtyDaysFromNow}`);
        break;
      case 'expiring':
        query = query
          .gte('date_expiry', now)
          .lte('date_expiry', thirtyDaysFromNow);
        break;
      case 'expired':
        query = query.lt('date_expiry', now);
        break;
    }
  }

  query = query
    .order('date_expiry', { ascending: true, nullsFirst: false })
    .range(from, to);

  const { data: documents, count } = await query;

  // Get all vehicles for filter dropdown
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, name, license_plate')
    .eq('organization_id', orgId)
    .order('name', { ascending: true });

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

  return (
    <DocumentsTable
      documents={documents || []}
      vehicles={vehicles || []}
      totalCount={count || 0}
      currentPage={currentPage}
      totalPages={totalPages}
      itemsPerPage={ITEMS_PER_PAGE}
      userRole={userRole}
    />
  );
}
