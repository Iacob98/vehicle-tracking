import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPenaltyPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orgId = user.user_metadata?.organization_id;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  // Fetch penalty
  const { data: penalty, error } = await supabase
    .from('penalties')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (error || !penalty) {
    notFound();
  }

  // Fetch vehicles and users
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, name, license_plate')
    .eq('organization_id', orgId)
    .order('name');

  const { data: users } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('organization_id', orgId)
    .order('first_name');

  async function updatePenalty(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.user_metadata?.organization_id;

    const vehicleId = formData.get('vehicle_id') as string;
    const userId = formData.get('user_id') as string;
    const amount = formData.get('amount') as string;
    const penaltyDate = formData.get('date') as string;
    const status = formData.get('status') as string;

    if (!vehicleId || !amount || !penaltyDate) {
      return;
    }

    const { error } = await supabase
      .from('penalties')
      .update({
        vehicle_id: vehicleId,
        user_id: userId || null,
        amount: parseFloat(amount),
        date: penaltyDate,
        status,
      })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error updating penalty:', error);
      return;
    }

    revalidatePath('/dashboard/penalties');
    revalidatePath(`/dashboard/penalties/${id}`);
    redirect(`/dashboard/penalties/${id}`);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">✏️ Редактировать штраф / Strafe bearbeiten</h1>
        <p className="text-gray-600">Изменить данные штрафа</p>
      </div>

      <form action={updatePenalty} className="bg-white rounded-lg border p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              🚗 Автомобиль / Fahrzeug *
            </label>
            <select
              name="vehicle_id"
              required
              defaultValue={penalty.vehicle_id}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Выберите автомобиль</option>
              {vehicles?.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} ({vehicle.license_plate})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              👤 Пользователь / Benutzer
            </label>
            <select
              name="user_id"
              defaultValue={penalty.user_id || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Не указан</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              📅 Дата / Datum *
            </label>
            <Input
              type="date"
              name="date"
              required
              defaultValue={penalty.date}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              💰 Сумма / Betrag (€) *
            </label>
            <Input
              type="number"
              name="amount"
              required
              step="0.01"
              min="0"
              defaultValue={penalty.amount}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              📊 Статус / Status *
            </label>
            <select
              name="status"
              required
              defaultValue={penalty.status}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="open">🔴 К оплате / Offen</option>
              <option value="paid">🟢 Оплачен / Bezahlt</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit">
            💾 Сохранить изменения
          </Button>
          <Link href={`/dashboard/penalties/${id}`}>
            <Button variant="outline" type="button">
              ❌ Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
