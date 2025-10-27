import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DriverPenaltiesPage() {
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
            🚧 Мои штрафы
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
            🚧 Мои штрафы
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

  // Получаем все штрафы водителя
  const { data: penalties } = await supabase
    .from('penalties')
    .select('*')
    .eq('user_id', authUser.id)
    .order('date', { ascending: false })
    .limit(50);

  // Подсчитываем статистику
  const stats = {
    total: penalties?.length || 0,
    open: penalties?.filter((p) => p.status === 'open').length || 0,
    paid: penalties?.filter((p) => p.status === 'paid').length || 0,
    totalAmount: penalties?.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0) || 0,
    openAmount:
      penalties
        ?.filter((p) => p.status === 'open')
        .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0) || 0,
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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            🚧 Мои штрафы
          </h1>
          <p className="text-gray-600 mt-1">Автомобиль: {vehicleName}</p>
        </div>
      </div>

      {/* Статистика */}
      {penalties && penalties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Всего штрафов</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">К оплате</p>
            <p className="text-2xl font-bold text-red-600">{stats.open}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Оплачено</p>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Сумма к оплате</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.openAmount.toFixed(2)} €
            </p>
          </div>
        </div>
      )}

      {/* Список штрафов */}
      <div className="bg-white rounded-lg shadow">
        {penalties && penalties.length > 0 ? (
          <div className="divide-y">
            {penalties.map((penalty) => {
              const isOpen = penalty.status === 'open';
              const statusIcon = isOpen ? '🔴' : '🟢';
              const statusText = isOpen ? 'К оплате' : 'Оплачен';
              const statusColor = isOpen ? 'text-red-600' : 'text-green-600';

              return (
                <div key={penalty.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">🚧</div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-gray-900">
                              Штраф от {new Date(penalty.date).toLocaleDateString('ru-RU')}
                            </p>
                            <span className={`text-sm font-medium ${statusColor}`}>
                              {statusIcon} {statusText}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-lg font-bold text-gray-900">
                              {parseFloat(penalty.amount || '0').toFixed(2)} €
                            </p>
                            {penalty.photo_url && (
                              <p className="text-sm text-gray-600">
                                📷 Есть фото
                              </p>
                            )}
                          </div>
                          {penalty.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {penalty.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/driver/penalties/${penalty.id}`}
                      className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      {isOpen ? '💳 Оплатить' : '👁️ Просмотр'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-gray-600 text-lg">Штрафов нет</p>
            <p className="text-sm text-gray-500 mt-2">
              Так держать! Продолжайте ездить безопасно.
            </p>
          </div>
        )}
      </div>

      {/* Информация */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-xl">ℹ️</div>
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Информация о штрафах:</p>
            <p className="mt-1">
              Здесь отображаются все ваши штрафы. Для оплаты штрафа нажмите кнопку "Оплатить" и прикрепите фото чека об оплате.
            </p>
            <p className="mt-1">
              🔴 <strong>К оплате</strong> - штраф нужно оплатить
            </p>
            <p className="mt-1">
              🟢 <strong>Оплачен</strong> - штраф оплачен и подтвержден
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
