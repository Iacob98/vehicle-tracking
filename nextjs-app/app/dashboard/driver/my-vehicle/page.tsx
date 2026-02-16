import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function MyVehiclePage() {
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
            🚗 Мой автомобиль
          </h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 text-lg">
                Вы не назначены в бригаду
              </h3>
              <p className="text-yellow-700 mt-2">
                Для получения доступа к автомобилю и его документам, менеджер должен добавить вас в бригаду.
              </p>
              <p className="text-yellow-700 mt-2 text-sm">
                Обратитесь к администратору или менеджеру компании.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Получаем авто водителя через бригаду
  const { data: assignment } = await supabase
    .from('vehicle_assignments')
    .select('vehicle_id, vehicles(*)')
    .eq('team_id', user.team_id)
    .is('end_date', null)
    .single();

  if (!assignment || !assignment.vehicles) {
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
            🚗 Мой автомобиль
          </h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 text-lg">
                Автомобиль не назначен на вашу бригаду
              </h3>
              <p className="text-yellow-700 mt-2">
                Для получения доступа к автомобилю, менеджер должен назначить автомобиль на вашу бригаду.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const vehicle = assignment.vehicles as any;
  const vehicleId = assignment.vehicle_id;

  // Получаем документы автомобиля (только Fahrzeugschein, TÜV, Versicherung)
  const { data: documents } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('is_active', true)
    .in('document_type', ['registration', 'inspection', 'insurance'])
    .order('date_expiry', { ascending: true });

  // Проверяем истекающие документы (< 30 дней)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringDocuments =
    documents?.filter((doc) => {
      if (!doc.date_expiry) return false;
      return new Date(doc.date_expiry) <= thirtyDaysFromNow;
    }) || [];

  // Статус автомобиля с иконкой
  const statusIcons: Record<string, string> = {
    active: '🟢',
    repair: '🔧',
    unavailable: '🔴',
    rented: '🏢',
  };

  const statusLabels: Record<string, string> = {
    active: 'Активен',
    repair: 'В ремонте',
    unavailable: 'Недоступен',
    rented: 'Арендован',
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
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          🚗 Мой автомобиль
        </h1>
      </div>

      {/* Информация об автомобиле */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Информация об автомобиле
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Название</p>
            <p className="text-lg font-semibold text-gray-900">{vehicle.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Государственный номер</p>
            <p className="text-lg font-semibold text-gray-900">
              {vehicle.license_plate || 'Не указан'}
            </p>
          </div>

          {vehicle.vin && (
            <div>
              <p className="text-sm text-gray-600">VIN</p>
              <p className="text-lg font-mono text-gray-900">{vehicle.vin}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600">Статус</p>
            <p className="text-lg font-semibold text-gray-900">
              {statusIcons[vehicle.status]} {statusLabels[vehicle.status]}
            </p>
          </div>
        </div>

        {vehicle.is_rental && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900">
              🏢 Арендованный автомобиль
            </p>
            {vehicle.rental_end_date && (
              <p className="text-sm text-blue-700 mt-1">
                Аренда до:{' '}
                {new Date(vehicle.rental_end_date).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Предупреждение об истекающих документах */}
      {expiringDocuments.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-orange-800">
                Внимание! Истекающие документы
              </h3>
              <p className="text-orange-700 text-sm mt-1">
                У автомобиля есть {expiringDocuments.length}{' '}
                {expiringDocuments.length === 1 ? 'документ' : 'документа'}, который
                истекает в ближайшие 30 дней. Сообщите менеджеру о необходимости обновления.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Документы автомобиля */}
      <div id="documents" className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📄 Документы автомобиля</h2>

        {documents && documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => {
              const isExpiring =
                doc.date_expiry &&
                new Date(doc.date_expiry) <= thirtyDaysFromNow;
              const isExpired =
                doc.date_expiry && new Date(doc.date_expiry) < new Date();

              return (
                <div
                  key={doc.id}
                  className={`border rounded-lg p-4 ${
                    isExpired
                      ? 'border-red-200 bg-red-50'
                      : isExpiring
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {doc.title}
                        </h3>
                        {isExpired && (
                          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                            Истек
                          </span>
                        )}
                        {isExpiring && !isExpired && (
                          <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">
                            Истекает
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mt-1">
                        Тип: {doc.document_type}
                      </p>

                      {doc.date_issued && (
                        <p className="text-sm text-gray-600">
                          Выдан:{' '}
                          {new Date(doc.date_issued).toLocaleDateString('ru-RU')}
                        </p>
                      )}

                      {doc.date_expiry && (
                        <p
                          className={`text-sm font-medium ${
                            isExpired
                              ? 'text-red-600'
                              : isExpiring
                              ? 'text-orange-600'
                              : 'text-gray-600'
                          }`}
                        >
                          Истекает:{' '}
                          {new Date(doc.date_expiry).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </div>

                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 text-sm font-medium ml-4"
                      >
                        Открыть →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-5xl mb-2">📄</div>
            <p>Документы не загружены</p>
            <p className="text-sm mt-1">
              Обратитесь к менеджеру для загрузки документов
            </p>
          </div>
        )}
      </div>

      {/* Информация */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Важно:</p>
            <p className="mt-1">
              Если заметили проблемы с документами или они требуют обновления, сообщите об этом менеджеру или администратору.
            </p>
            <p className="mt-1">
              Управление документами доступно только менеджерам и администраторам.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
