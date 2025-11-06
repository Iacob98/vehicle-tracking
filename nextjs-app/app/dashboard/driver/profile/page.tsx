import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DriverDocumentsView } from './DriverDocumentsView';

export default async function DriverProfilePage() {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const { data: user } = await supabase
    .from('users')
    .select('*, organizations(*)')
    .eq('id', authUser.id)
    .single();

  if (!user || user.role !== 'driver') {
    redirect('/dashboard');
  }

  // Получаем документы водителя (только активные)
  const { data: documents } = await supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', authUser.id)
    .eq('is_active', true)
    .order('upload_date', { ascending: false });

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          👤 Мой профиль
        </h1>
        <p className="text-gray-600 mt-2">
          Управление личными данными и настройками
        </p>
      </div>

      {/* Информация о пользователе */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Основная информация
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Имя</p>
            <p className="text-base font-medium text-gray-900">
              {user.first_name} {user.last_name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-base font-medium text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Роль</p>
            <p className="text-base font-medium text-gray-900">
              🚗 Водитель
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Организация</p>
            <p className="text-base font-medium text-gray-900">
              {user.organizations?.name || 'Не указана'}
            </p>
          </div>
        </div>
      </div>

      {/* Заправочная карта */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          ⛽ Заправочная карта
        </h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Номер вашей заправочной карты для регистрации заправок.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Информация:</strong> Для изменения номера карты обратитесь к администратору или менеджеру.
            </p>
          </div>
        </div>
        {user.fuel_card_id ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Номер карты:</p>
            <p className="text-lg font-semibold text-gray-900">
              {user.fuel_card_id}
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Номер заправочной карты не указан. Обратитесь к администратору для привязки карты.
            </p>
          </div>
        )}
      </div>

      {/* Мои документы */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📄 Мои документы
        </h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Здесь вы можете просматривать свои документы, загруженные администратором.
          </p>
        </div>
        <DriverDocumentsView documents={documents || []} />
      </div>
    </div>
  );
}
