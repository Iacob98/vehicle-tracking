import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

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

  const userContext = getUserQueryContext(user);

  // Fetch penalty
  let penaltyQuery = supabase
    .from('penalties')
    .select('*')
    .eq('id', id);
  penaltyQuery = applyOrgFilter(penaltyQuery, userContext);
  const { data: penalty, error } = await penaltyQuery.single();

  if (error || !penalty) {
    notFound();
  }

  // Fetch vehicles and users
  let vehiclesQuery = supabase
    .from('vehicles')
    .select('id, name, license_plate');
  vehiclesQuery = applyOrgFilter(vehiclesQuery, userContext);
  vehiclesQuery = vehiclesQuery.order('name');
  const { data: vehicles } = await vehiclesQuery;

  let usersQuery = supabase
    .from('users')
    .select('id, first_name, last_name');
  usersQuery = applyOrgFilter(usersQuery, userContext);
  usersQuery = usersQuery.order('first_name');
  const { data: users } = await usersQuery;

  async function updatePenalty(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userContext = getUserQueryContext(user);

    const vehicleId = formData.get('vehicle_id') as string;
    const userId = formData.get('user_id') as string;
    const amount = formData.get('amount') as string;
    const penaltyDate = formData.get('date') as string;
    const status = formData.get('status') as string;

    if (!vehicleId || !amount || !penaltyDate) {
      return;
    }

    let updateQuery = supabase
      .from('penalties')
      .update({
        vehicle_id: vehicleId,
        user_id: userId || null,
        amount: parseFloat(amount),
        date: penaltyDate,
        status,
      })
      .eq('id', id);
    updateQuery = applyOrgFilter(updateQuery, userContext);
    const { error } = await updateQuery;

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
