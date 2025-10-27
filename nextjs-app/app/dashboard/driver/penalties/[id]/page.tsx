import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DriverPaymentForm from './DriverPaymentForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DriverPenaltyDetailPage({ params }: PageProps) {
  const supabase = await createServerClient();
  const { id: penaltyId } = await params;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Получаем штраф
  const { data: penalty, error } = await supabase
    .from('penalties')
    .select('*')
    .eq('id', penaltyId)
    .eq('user_id', authUser.id) // Проверяем что штраф принадлежит водителю
    .single();

  if (error || !penalty) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <Link
            href="/dashboard/driver/penalties"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Назад к штрафам
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            🚧 Штраф не найден
          </h1>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">Штраф не найден или у вас нет доступа к нему</p>
        </div>
      </div>
    );
  }

  // Получаем информацию об автомобиле
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('name, license_plate')
    .eq('id', penalty.vehicle_id)
    .single();

  const isOpen = penalty.status === 'open';
  const statusIcon = isOpen ? '🔴' : '🟢';
  const statusText = isOpen ? 'К оплате' : 'Оплачен';
  const statusColor = isOpen ? 'text-red-600' : 'text-green-600';

  // Разделяем фото штрафа и чека оплаты
  const photos = penalty.photo_url ? penalty.photo_url.split(';') : [];
  const penaltyPhoto = photos[0] || null;
  const receiptPhoto = photos[1] || null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="mb-6">
        <Link
          href="/dashboard/driver/penalties"
          className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
        >
          ← Назад к штрафам
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          🚧 Детали штрафа
        </h1>
      </div>

      {/* Информация о штрафе */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Информация о штрафе</h2>
          <span className={`text-lg font-medium ${statusColor}`}>
            {statusIcon} {statusText}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-gray-600">Дата штрафа:</span>
            <span className="font-semibold">
              {new Date(penalty.date).toLocaleDateString('ru-RU')}
            </span>
          </div>

          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-gray-600">Сумма:</span>
            <span className="font-bold text-2xl text-gray-900">
              {parseFloat(penalty.amount || '0').toFixed(2)} €
            </span>
          </div>

          {vehicle && (
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-gray-600">Автомобиль:</span>
              <span className="font-semibold">
                {vehicle.name} ({vehicle.license_plate})
              </span>
            </div>
          )}

          {penalty.description && (
            <div className="border-b pb-3">
              <p className="text-gray-600 mb-1">Описание:</p>
              <p className="text-gray-900">{penalty.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Фото штрафа */}
      {penaltyPhoto && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">📷 Фото штрафа</h2>
          <div className="border rounded-lg p-2 bg-gray-50">
            <img
              src={penaltyPhoto}
              alt="Penalty photo"
              className="w-full h-auto max-h-96 object-contain rounded"
            />
          </div>
          <a
            href={penaltyPhoto}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 text-sm font-medium mt-2 inline-block"
          >
            Открыть в полном размере →
          </a>
        </div>
      )}

      {/* Чек оплаты (если есть) */}
      {receiptPhoto && penalty.status === 'paid' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">📄 Чек об оплате</h2>
          <div className="border rounded-lg p-2 bg-gray-50">
            <img
              src={receiptPhoto}
              alt="Receipt photo"
              className="w-full h-auto max-h-96 object-contain rounded"
            />
          </div>
          <a
            href={receiptPhoto}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 text-sm font-medium mt-2 inline-block"
          >
            Открыть в полном размере →
          </a>
        </div>
      )}

      {/* Форма оплаты (только для неоплаченных) */}
      {isOpen && (
        <DriverPaymentForm
          penaltyId={penalty.id}
          amount={parseFloat(penalty.amount || '0')}
        />
      )}

      {/* Информация для оплаченных штрафов */}
      {!isOpen && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✅</div>
            <div className="text-sm text-green-900">
              <p className="font-semibold text-lg">Штраф оплачен</p>
              <p className="mt-2">
                Этот штраф уже отмечен как оплаченный. Чек об оплате прикреплен выше.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
