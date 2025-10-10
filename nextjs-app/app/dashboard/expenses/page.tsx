import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ExpensesPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      *,
      vehicle:vehicles(name, license_plate),
      team:teams(name)
    `)
    .eq('organization_id', orgId)
    .order('date', { ascending: false });

  const totalExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const vehicleExpenses = expenses?.filter(e => e.vehicle_id).reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const teamExpenses = expenses?.filter(e => e.team_id).reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Расходы</h1>
          <p className="text-gray-600">Учет расходов на автомобили и бригады</p>
        </div>
        <Link
          href="/dashboard/expenses/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Добавить расход
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Всего расходов</p>
          <p className="text-2xl font-bold text-gray-900">{totalExpenses.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">На автомобили</p>
          <p className="text-2xl font-bold text-blue-600">{vehicleExpenses.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">На бригады</p>
          <p className="text-2xl font-bold text-green-600">{teamExpenses.toFixed(2)} €</p>
        </div>
      </div>

      {expenses && expenses.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Категория</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Объект</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Описание</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{expense.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{expense.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {expense.vehicle ? `${expense.vehicle.name}` : expense.team ? expense.team.name : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">{expense.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{Number(expense.amount).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">💵</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет расходов</h3>
          <p className="text-gray-600 mb-6">Начните вести учет расходов</p>
        </div>
      )}
    </div>
  );
}
