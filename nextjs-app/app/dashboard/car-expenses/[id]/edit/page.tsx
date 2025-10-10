import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCarExpensePage({ params }: PageProps) {
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

  // Fetch car expense
  const { data: expense, error } = await supabase
    .from('car_expenses')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (error || !expense) {
    notFound();
  }

  // Check if linked to maintenance
  if (expense.maintenance_id) {
    return (
      <div className="max-w-2xl">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-900 mb-2">
            🔒 Редактирование недоступно
          </h2>
          <p className="text-yellow-800">
            Этот расход связан с записью обслуживания и не может быть отредактирован отдельно.
          </p>
          <Link href="/dashboard/car-expenses">
            <Button className="mt-4">← Назад к списку</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, name, license_plate')
    .eq('organization_id', orgId)
    .order('name');

  async function updateCarExpense(formData: FormData) {
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
      .update({
        vehicle_id: vehicleId,
        category,
        amount: parseFloat(amount),
        date: expenseDate,
        description: description || null,
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('maintenance_id', null); // Only update if not linked to maintenance

    if (error) {
      console.error('Error updating car expense:', error);
      return;
    }

    revalidatePath('/dashboard/car-expenses');
    redirect('/dashboard/car-expenses');
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">✏️ Редактировать расход / Ausgabe bearbeiten</h1>
        <p className="text-gray-600">Изменить данные расхода на авто</p>
      </div>

      <form action={updateCarExpense} className="bg-white rounded-lg border p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              🚗 Автомобиль / Fahrzeug *
            </label>
            <select
              name="vehicle_id"
              required
              defaultValue={expense.vehicle_id}
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
              defaultValue={expense.category}
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
              defaultValue={expense.date}
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
              defaultValue={expense.amount}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">
              📝 Описание / Beschreibung
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={expense.description || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Дополнительная информация о расходе..."
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit">
            💾 Сохранить изменения
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
