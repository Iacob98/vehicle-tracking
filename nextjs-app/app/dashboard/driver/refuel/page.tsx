import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function RefuelHistoryPage() {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Получаем информацию о водителе
  const { data: user } = await supabase
    .from('users')
    .select('id, team_id')
    .eq('id', authUser.id)
    .single();

  if (!user?.team_id) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <Link
            href="/dashboard/driver"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Назад на главную
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            ⛽ История заправок
          </h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Вы не назначены в бригаду</p>
        </div>
      </div>
    );
  }

  // Получаем авто водителя через бригаду
  const { data: assignment } = await supabase
    .from('vehicle_assignments')
    .select('vehicle_id, vehicles(name)')
    .eq('team_id', user.team_id)
    .is('end_date', null)
    .single();

  if (!assignment) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <Link
            href="/dashboard/driver"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Назад на главную
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            ⛽ История заправок
          </h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Автомобиль не назначен на вашу бригаду</p>
        </div>
      </div>
    );
  }

  const vehicleId = assignment.vehicle_id;
  const vehicleName = (assignment.vehicles as any)?.name;

  // Получаем все заправки (расходы категории fuel)
  const { data: refuels } = await supabase
    .from('car_expenses')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('category', 'fuel')
    .order('date', { ascending: false })
    .limit(50);

  // Извлекаем одометр из description
  const parseOdometer = (description: string | null): string | null => {
    if (!description) return null;
    const match = description.match(/Одометр:\s*(\d+)\s*км/);
    return match ? match[1] : null;
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="mb-6">
        <Link
          href="/dashboard/driver"
          className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
        >
          ← Назад на главную
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              ⛽ История заправок
            </h1>
            <p className="text-gray-600 mt-1">Автомобиль: {vehicleName}</p>
          </div>
          <Link
            href="/dashboard/driver/refuel/new"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            + Добавить заправку
          </Link>
        </div>
      </div>

      {/* Статистика */}
      {refuels && refuels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Всего заправок</p>
            <p className="text-2xl font-bold text-gray-900">{refuels.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Общие расходы</p>
            <p className="text-2xl font-bold text-gray-900">
              {refuels.reduce((sum, r) => sum + r.amount, 0).toFixed(2)} €
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Средний чек</p>
            <p className="text-2xl font-bold text-gray-900">
              {(refuels.reduce((sum, r) => sum + r.amount, 0) / refuels.length).toFixed(2)} €
            </p>
          </div>
        </div>
      )}

      {/* Список заправок */}
      <div className="bg-white rounded-lg shadow">
        {refuels && refuels.length > 0 ? (
          <div className="divide-y">
            {refuels.map((refuel) => {
              const odometer = parseOdometer(refuel.description);
              const description = refuel.description?.replace(/Одометр:\s*\d+\s*км\.?\s*/, '');

              return (
                <div key={refuel.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">⛽</div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Заправка {new Date(refuel.date).toLocaleDateString('ru-RU')}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-lg font-bold text-green-600">
                              {refuel.amount.toFixed(2)} €
                            </p>
                            {odometer && (
                              <p className="text-sm text-gray-600">
                                📊 Одометр: <span className="font-mono">{odometer}</span> км
                              </p>
                            )}
                          </div>
                          {description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {refuel.receipt_url && (
                      <a
                        href={refuel.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 text-sm font-medium ml-4"
                      >
                        📷 Чек →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⛽</div>
            <p className="text-gray-600 text-lg">Заправок пока нет</p>
            <p className="text-sm text-gray-500 mt-2">
              Нажмите кнопку выше, чтобы добавить первую заправку
            </p>
          </div>
        )}
      </div>

      {/* Информация */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-xl">ℹ️</div>
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Информация:</p>
            <p className="mt-1">
              Здесь отображаются все ваши заправки за последнее время. Для добавления новой заправки нажмите кнопку "Добавить заправку".
            </p>
            <p className="mt-1">
              Не забывайте указывать точные показания одометра и прикладывать фото чека.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
