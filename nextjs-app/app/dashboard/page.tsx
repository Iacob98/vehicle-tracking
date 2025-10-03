import { createServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  const orgId = authUser?.user_metadata?.organization_id;

  // Fetch stats
  const [vehiclesCount, teamsCount, penaltiesCount, expensesSum] = await Promise.all([
    supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('teams').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('penalties').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'open'),
    supabase.from('expenses').select('amount').eq('organization_id', orgId),
  ]);

  const totalExpenses = expensesSum.data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Обзор системы управления автопарком</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Автомобили</p>
              <p className="text-3xl font-bold text-gray-900">{vehiclesCount.count || 0}</p>
            </div>
            <div className="text-4xl">🚗</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Бригады</p>
              <p className="text-3xl font-bold text-gray-900">{teamsCount.count || 0}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Открытые штрафы</p>
              <p className="text-3xl font-bold text-red-600">{penaltiesCount.count || 0}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Расходы</p>
              <p className="text-3xl font-bold text-gray-900">{totalExpenses.toFixed(2)} €</p>
            </div>
            <div className="text-4xl">💵</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/dashboard/vehicles"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <div className="text-3xl mb-2">🚗</div>
            <p className="text-sm font-medium">Добавить автомобиль</p>
          </a>
          <a
            href="/dashboard/teams"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm font-medium">Создать бригаду</p>
          </a>
          <a
            href="/dashboard/penalties"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <div className="text-3xl mb-2">💰</div>
            <p className="text-sm font-medium">Добавить штраф</p>
          </a>
          <a
            href="/dashboard/expenses"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-center"
          >
            <div className="text-3xl mb-2">💵</div>
            <p className="text-sm font-medium">Добавить расход</p>
          </a>
        </div>
      </div>
    </div>
  );
}
