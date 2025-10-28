import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { VehicleForm } from '../../VehicleForm';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createServerClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  const userContext = getUserQueryContext(user);

  let vehicleQuery = supabase
    .from('vehicles')
    .select('*')
    .eq('id', id);
  vehicleQuery = applyOrgFilter(vehicleQuery, userContext);
  const { data: vehicle } = await vehicleQuery.single();

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
