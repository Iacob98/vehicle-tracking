import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { RoleGuard } from '@/components/RoleGuard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ExpenseCard } from './ExpenseCard';
import { type UserRole } from '@/lib/types/roles';

const ITEMS_PER_PAGE = 15;

export default async function CarExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
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

  // Fetch all expenses for total calculation
  const { data: allExpenses } = await supabase
    .from('car_expenses')
    .select('amount')
    .eq('organization_id', orgId);

  const totalAmount = allExpenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch car expenses with pagination
  const { data: expenses, count: expensesCount } = await supabase
    .from('car_expenses')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('date', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((expensesCount || 0) / ITEMS_PER_PAGE);

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
        <p className="text-sm text-gray-600">Общие расходы / Gesamtausgaben</p>
        <p className="text-3xl font-bold mt-2">€{totalAmount.toFixed(2)}</p>
      </div>

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
