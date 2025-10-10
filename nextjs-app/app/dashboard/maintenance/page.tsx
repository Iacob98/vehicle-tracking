import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { DeleteItemButton } from '@/components/DeleteItemButton';

const ITEMS_PER_PAGE = 20;

export default async function MaintenancePage({
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

  const orgId = user?.user_metadata?.organization_id;

  // Pagination
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch maintenances with pagination and relations
  const { data: maintenances, count: maintenancesCount } = await supabase
    .from('maintenances')
    .select(`
      *,
      vehicle:vehicles(name, license_plate)
    `, { count: 'exact' })
    .eq('organization_id', orgId)
    .order('date', { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((maintenancesCount || 0) / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🔧 Обслуживание / Wartung</h1>
          <p className="text-gray-600">История обслуживания автомобилей</p>
        </div>
        <Link href="/dashboard/maintenance/new">
          <Button>➕ Добавить обслуживание</Button>
        </Link>
      </div>

      {maintenances && maintenances.length > 0 ? (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Автомобиль</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Описание</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maintenances.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{m.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {m.vehicle?.name} ({m.vehicle?.license_plate})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        m.type === 'inspection' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {m.type === 'inspection' ? 'Осмотр' : 'Ремонт'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{m.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/maintenance/${m.id}`}>
                          <Button variant="outline" size="sm">👁️ Просмотр</Button>
                        </Link>
                        <DeleteItemButton
                          id={m.id}
                          baseUrl="/api/maintenance"
                          itemName={`обслуживание "${m.description || (m.type === 'inspection' ? 'Осмотр' : 'Ремонт')}" для ${m.vehicle?.name} (${m.date})`}
                          size="sm"
                          variant="outline"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/dashboard/maintenance"
          />
          <PaginationInfo
            currentPage={currentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={maintenancesCount || 0}
          />
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет записей</h3>
          <p className="text-gray-600">История обслуживания пуста</p>
        </div>
      )}
    </div>
  );
}
