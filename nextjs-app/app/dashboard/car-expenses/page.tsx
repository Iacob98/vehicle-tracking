import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { RoleGuard } from '@/components/RoleGuard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ExpenseCard } from './ExpenseCard';
import { FiltersBar } from './FiltersBar';
import { type UserRole } from '@/lib/types/roles';

const ITEMS_PER_PAGE = 15;

export default async function CarExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    category?: string;
    vehicle?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
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

  // Get filter parameters
  const categoryFilter = params.category;
  const vehicleFilter = params.vehicle;
  const sortBy = params.sort || 'date';
  const sortOrder = params.order || 'desc';

  // Fetch all expenses for total calculation (with filters)
  let allExpensesQuery = supabase
    .from('car_expenses')
    .select('amount')
    .eq('organization_id', orgId);

  if (categoryFilter) {
    allExpensesQuery = allExpensesQuery.eq('category', categoryFilter);
  }
  if (vehicleFilter) {
    allExpensesQuery = allExpensesQuery.eq('vehicle_id', vehicleFilter);
  }

  const { data: allExpenses } = await allExpensesQuery;

  const totalAmount = allExpenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch car expenses with pagination, filters and sorting
  let expensesQuery = supabase
    .from('car_expenses')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId);

  // Apply filters
  if (categoryFilter) {
    expensesQuery = expensesQuery.eq('category', categoryFilter);
  }
  if (vehicleFilter) {
    expensesQuery = expensesQuery.eq('vehicle_id', vehicleFilter);
  }

  // Apply sorting
  expensesQuery = expensesQuery.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  expensesQuery = expensesQuery.range(from, to);

  const { data: expenses, count: expensesCount } = await expensesQuery;

  const totalPages = Math.ceil((expensesCount || 0) / ITEMS_PER_PAGE);

  // Get all vehicles for filter dropdown
  const { data: allVehicles } = await supabase
    .from('vehicles')
    .select('id, name, license_plate')
    .eq('organization_id', orgId)
    .order('name');

  // Get vehicle names for each expense
  const expensesWithVehicles = await Promise.all((expenses || []).map(async (expense) => {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('name, license_plate')
      .eq('id', expense.vehicle_id)
      .single();

    return {
      ...expense,
      vehicle_name: vehicle?.name,
      license_plate: vehicle?.license_plate,
    };
  }));

  // Category options
  const categories = [
    { value: 'fuel', label: '⛽ Топливо / Kraftstoff' },
    { value: 'maintenance', label: '🔧 Обслуживание / Wartung' },
    { value: 'repair', label: '🛠️ Ремонт / Reparatur' },
    { value: 'insurance', label: '📋 Страховка / Versicherung' },
    { value: 'tax', label: '💶 Налоги / Steuern' },
    { value: 'other', label: '📦 Прочее / Sonstiges' },
  ];

  // Sort options
  const sortOptions = [
    { value: 'date', label: 'По дате / Nach Datum' },
    { value: 'amount', label: 'По сумме / Nach Betrag' },
    { value: 'category', label: 'По категории / Nach Kategorie' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Панель управления', href: '/dashboard' },
          { label: 'Расходы на авто' },
        ]}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🚗💰 Расходы на авто / Auto-Ausgaben</h1>
          <p className="text-gray-600">Учет расходов на автомобили</p>
        </div>
        <RoleGuard allowedRoles={['admin', 'manager']} userRole={userRole}>
          <Link href="/dashboard/car-expenses/new">
            <Button>➕ Добавить расход</Button>
          </Link>
        </RoleGuard>
      </div>

      {/* Statistics */}
      <div className="bg-white border rounded-lg p-6">
        <p className="text-sm text-gray-600">
          Общие расходы / Gesamtausgaben
          {(categoryFilter || vehicleFilter) && ' (отфильтровано)'}
        </p>
        <p className="text-3xl font-bold mt-2">€{totalAmount.toFixed(2)}</p>
        {expensesCount !== undefined && (
          <p className="text-sm text-gray-500 mt-1">
            Найдено записей: {expensesCount}
          </p>
        )}
      </div>

      {/* Filters and Sorting */}
      <FiltersBar
        vehicles={allVehicles || []}
        categories={categories}
        sortOptions={sortOptions}
      />

      {/* Expenses List */}
      {expensesWithVehicles && expensesWithVehicles.length > 0 ? (
        <>
          <div className="space-y-4">
            {expensesWithVehicles.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} userRole={userRole} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/dashboard/car-expenses"
          />
          <PaginationInfo
            currentPage={currentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={expensesCount || 0}
          />
        </>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <div className="text-6xl mb-4">💰</div>
          <p className="text-gray-500 mb-4">Нет расходов на авто / Keine Auto-Ausgaben</p>
          <RoleGuard allowedRoles={['admin', 'manager']} userRole={userRole}>
            <Link href="/dashboard/car-expenses/new">
              <Button>➕ Добавить первый расход</Button>
            </Link>
          </RoleGuard>
        </div>
      )}
    </div>
  );
}
