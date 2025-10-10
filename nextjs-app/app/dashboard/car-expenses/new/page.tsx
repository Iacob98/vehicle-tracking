import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default async function NewCarExpensePage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orgId = user.user_metadata?.organization_id;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  // Fetch vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, name, license_plate')
    .eq('organization_id', orgId)
    .order('name');

  async function createCarExpense(formData: FormData) {
    'use server';

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgId = user?.user_metadata?.organization_id;

    const vehicleId = formData.get('vehicle_id') as string;
    const category = formData.get('category') as string;
    const amount = formData.get('amount') as string;
    const expenseDate = formData.get('date') as string;
    const description = formData.get('description') as string;

    if (!vehicleId || !category || !amount || !expenseDate) {
      return;
    }

    const { error } = await supabase
      .from('car_expenses')
      .insert({
        organization_id: orgId,
        vehicle_id: vehicleId,
        category,
        amount: parseFloat(amount),
        date: expenseDate,
        description: description || null,
      });

    if (error) {
      console.error('Error creating car expense:', error);
      return;
    }

    revalidatePath('/dashboard/car-expenses');
    redirect('/dashboard/car-expenses');
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">➕ Добавить расход на авто</h1>
        <p className="text-gray-600">Зарегистрировать новый расход</p>
      </div>

      <form action={createCarExpense} className="bg-white rounded-lg border p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              🚗 Автомобиль / Fahrzeug *
            </label>
            <select
              name="vehicle_id"
              required
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
              📁 Категория / Kategorie *
            </label>
            <select
              name="category"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="fuel">⛽ Топливо / Kraftstoff</option>
              <option value="repair">🔧 Ремонт / Reparatur</option>
              <option value="maintenance">🛠️ Обслуживание / Wartung</option>
              <option value="insurance">🛡️ Страховка / Versicherung</option>
              <option value="other">📝 Другое / Sonstiges</option>
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
              defaultValue={new Date().toISOString().split('T')[0]}
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
              placeholder="0.00"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              📝 Описание / Beschreibung
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Дополнительная информация о расходе..."
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit">
            💾 Добавить расход
          </Button>
          <Link href="/dashboard/car-expenses">
            <Button variant="outline" type="button">
              ❌ Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
