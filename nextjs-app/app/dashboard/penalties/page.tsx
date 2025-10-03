import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function PenaltiesPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  const { data: penalties } = await supabase
    .from('penalties')
    .select(`
      *,
      vehicle:vehicles(name, license_plate),
      user:users(first_name, last_name)
    `)
    .eq('organization_id', orgId)
    .order('date', { ascending: false });

  const stats = {
    total: penalties?.length || 0,
    open: penalties?.filter(p => p.status === 'open').length || 0,
    totalAmount: penalties?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
    openAmount: penalties?.filter(p => p.status === 'open').reduce((sum, p) => sum + Number(p.amount), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Штрафы</h1>
          <p className="text-gray-600">Управление штрафами и нарушениями</p>
        </div>
        <Link
          href="/dashboard/penalties/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Добавить штраф
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Всего штрафов</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Открытые</p>
          <p className="text-2xl font-bold text-red-600">{stats.open}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Общая сумма</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalAmount.toFixed(2)} €</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">К оплате</p>
          <p className="text-2xl font-bold text-red-600">{stats.openAmount.toFixed(2)} €</p>
        </div>
      </div>

      {penalties && penalties.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Автомобиль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Водитель</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {penalties.map((penalty) => (
                <tr key={penalty.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{penalty.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {penalty.vehicle?.name} ({penalty.vehicle?.license_plate})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {penalty.user ? `${penalty.user.first_name} ${penalty.user.last_name}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{Number(penalty.amount).toFixed(2)} €</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      penalty.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {penalty.status === 'open' ? 'Открыт' : 'Оплачен'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет штрафов</h3>
          <p className="text-gray-600 mb-6">Список штрафов пуст</p>
        </div>
      )}
    </div>
  );
}
