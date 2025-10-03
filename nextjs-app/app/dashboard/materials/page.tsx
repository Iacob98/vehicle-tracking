import { createServerClient } from '@/lib/supabase/server';

export default async function MaterialsPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Материалы и оборудование</h1>
        <p className="text-gray-600">Учет материалов и оборудования</p>
      </div>

      {materials && materials.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Количество</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Единица</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materials.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{m.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {m.type === 'material' ? 'Материал' : 'Оборудование'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{m.quantity || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{m.unit || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      m.status === 'active' ? 'bg-green-100 text-green-800' :
                      m.status === 'returned' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {m.status === 'active' ? 'Активен' :
                       m.status === 'returned' ? 'Возвращен' : 'Сломан'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет материалов</h3>
          <p className="text-gray-600">Список материалов пуст</p>
        </div>
      )}
    </div>
  );
}
