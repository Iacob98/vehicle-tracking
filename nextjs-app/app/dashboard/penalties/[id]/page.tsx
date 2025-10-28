import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PenaltyPaymentForm from './PenaltyPaymentForm';
import DeletePenaltyButton from './DeletePenaltyButton';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_ICONS = {
  open: '🔴',
  paid: '🟢',
};

const STATUS_NAMES = {
  open: 'К оплате / Offen',
  paid: 'Оплачен / Bezahlt',
};

export default async function PenaltyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(currentUser);

  // Fetch penalty details
  let penaltyQuery = supabase
    .from('penalties')
    .select('*')
    .eq('id', id);
  penaltyQuery = applyOrgFilter(penaltyQuery, userContext);
  const { data: penalty, error } = await penaltyQuery.single();

  if (error || !penalty) {
    notFound();
  }

  // Get vehicle info
  let vehicleInfo = null;
  if (penalty.vehicle_id) {
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('name, license_plate')
      .eq('id', penalty.vehicle_id)
      .single();
    vehicleInfo = vehicleData;
  }

  // Get user info
  let userInfo = null;
  if (penalty.user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', penalty.user_id)
      .single();
    userInfo = userData;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard/penalties">
            <Button variant="ghost" size="sm">← Назад</Button>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            🚧 Штраф #{penalty.id.slice(0, 8)}
          </h1>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            penalty.status === 'open' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {STATUS_ICONS[penalty.status as keyof typeof STATUS_ICONS]}{' '}
            {STATUS_NAMES[penalty.status as keyof typeof STATUS_NAMES]}
          </span>
        </div>
      </div>

      {/* Penalty Info */}
      <div className="bg-white border rounded-lg p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Автомобиль / Fahrzeug</h3>
            <p className="text-lg">
              {vehicleInfo ? `${vehicleInfo.name} (${vehicleInfo.license_plate})` : '—'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Сумма / Betrag</h3>
            <p className="text-2xl font-bold">€{parseFloat(penalty.amount || 0).toFixed(2)}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Дата / Datum</h3>
            <p className="text-lg">
              {penalty.date ? new Date(penalty.date).toLocaleDateString('ru-RU') : '—'}
            </p>
          </div>

          {userInfo && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Водитель / Fahrer</h3>
              <p className="text-lg">{userInfo.first_name} {userInfo.last_name}</p>
            </div>
          )}

          {penalty.description && (
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Описание / Beschreibung</h3>
              <p className="text-lg">{penalty.description}</p>
            </div>
          )}

          {penalty.photo_url && (
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-600 mb-2">📷 Файлы / Dateien</h3>
              <div className="space-y-2">
                {penalty.photo_url.split(';').map((url: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      📎 Файл {idx + 1} - Открыть / Datei {idx + 1} - Öffnen
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Link href={`/dashboard/penalties/${id}/edit`}>
          <Button variant="outline">✏️ Редактировать</Button>
        </Link>
        <DeletePenaltyButton penaltyId={id} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payment">💳 Оплата</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-4">
          {penalty.status === 'open' ? (
            <PenaltyPaymentForm
              penaltyId={id}
              amount={parseFloat(penalty.amount || 0)}
              orgId={userContext.organizationId || ''}
            />
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-800">✅ Штраф уже оплачен / Strafe bereits bezahlt</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
