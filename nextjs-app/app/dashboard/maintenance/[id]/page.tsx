import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

interface PageProps {
  params: Promise<{ id: string }>;
}

const TYPE_ICONS = {
  inspection: '🔍',
  repair: '🔧',
};

const TYPE_NAMES = {
  inspection: 'Осмотр / Inspektion',
  repair: 'Ремонт / Reparatur',
};

export default async function MaintenanceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(currentUser);

  // Fetch maintenance details
  let maintenanceQuery = supabase
    .from('maintenances')
    .select('*')
    .eq('id', id);
  maintenanceQuery = applyOrgFilter(maintenanceQuery, userContext);
  const { data: maintenance, error } = await maintenanceQuery.single();

  if (error || !maintenance) {
    notFound();
  }

  // Get vehicle info
  let vehicleInfo = null;
  if (maintenance.vehicle_id) {
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('name, license_plate')
      .eq('id', maintenance.vehicle_id)
      .single();
    vehicleInfo = vehicleData;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard/maintenance">
            <Button variant="ghost" size="sm">← Назад</Button>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            🔧 Обслуживание #{maintenance.id.slice(0, 8)}
          </h1>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            maintenance.type === 'inspection' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {TYPE_ICONS[maintenance.type as keyof typeof TYPE_ICONS]}{' '}
            {TYPE_NAMES[maintenance.type as keyof typeof TYPE_NAMES]}
          </span>
        </div>
      </div>

      {/* Maintenance Info */}
      <div className="bg-white border rounded-lg p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Автомобиль / Fahrzeug</h3>
            <p className="text-lg">
              {vehicleInfo ? `${vehicleInfo.name} (${vehicleInfo.license_plate})` : '—'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Дата / Datum</h3>
            <p className="text-lg">
              {maintenance.date ? new Date(maintenance.date).toLocaleDateString('ru-RU') : '—'}
            </p>
          </div>

          {maintenance.description && (
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Описание работ / Arbeitsbeschreibung</h3>
              <p className="text-lg whitespace-pre-wrap">{maintenance.description}</p>
            </div>
          )}

          {maintenance.receipt_url && (
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-600 mb-2">📎 Файл / Datei</h3>
              <p className="text-sm text-green-600">Файл прикреплен / Datei vorhanden</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Link href={`/dashboard/maintenance/${id}/edit`}>
          <Button variant="outline">✏️ Редактировать</Button>
        </Link>
      </div>
    </div>
  );
}
