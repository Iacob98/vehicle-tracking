import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { VehicleForm } from '../../VehicleForm';

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createServerClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">✏️ Редактировать автомобиль</h1>
      <VehicleForm vehicle={vehicle} isEdit={true} />
    </div>
  );
}
