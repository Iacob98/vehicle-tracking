import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const CATEGORY_ICONS = {
  fuel: '⛽',
  repair: '🔧',
  maintenance: '🛠️',
  insurance: '🛡️',
  other: '📝',
};

const CATEGORY_NAMES = {
  fuel: 'Топливо / Kraftstoff',
  repair: 'Ремонт / Reparatur',
  maintenance: 'Обслуживание / Wartung',
  insurance: 'Страховка / Versicherung',
  other: 'Другое / Sonstiges',
};

export default async function CarExpensesPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orgId = user.user_metadata?.organization_id;

  if (!orgId) {
    return <div>Organization ID not found</div>;
  }

  // Fetch car expenses
  const { data: expenses } = await supabase
    .from('car_expenses')
    .select('*')
    .eq('organization_id', orgId)
    .order('date', { ascending: false })
    .limit(100);

  // Get vehicle names for each expense
  const expensesWithVehicles = await Promise.all((expenses || []).map(async (expense) => {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('name, license_plate')
      .eq('id', expense.vehicle_id)
      .single();

    return {
      ...expense,
      vehicle_name: vehicle?.name,
      license_plate: vehicle?.license_plate,
    };
  }));

  // Calculate total
  const totalAmount = expensesWithVehicles.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🚗💰 Расходы на авто / Auto-Ausgaben</h1>
          <p className="text-gray-600">Учет расходов на автомобили</p>
        </div>
        <Link href="/dashboard/car-expenses/new">
          <Button>➕ Добавить расход</Button>
        </Link>
      </div>

      {/* Statistics */}
      <div className="bg-white border rounded-lg p-6">
        <p className="text-sm text-gray-600">Общие расходы / Gesamtausgaben</p>
        <p className="text-3xl font-bold mt-2">€{totalAmount.toFixed(2)}</p>
      </div>

      {/* Expenses List */}
      {expensesWithVehicles && expensesWithVehicles.length > 0 ? (
        <div className="space-y-4">
          {expensesWithVehicles.map((expense) => (
            <div key={expense.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {expense.vehicle_name} ({expense.license_plate})
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      📅 {expense.date ? new Date(expense.date).toLocaleDateString('ru-RU') : '—'}
                    </p>
                    {expense.description && (
                      <p className="text-sm text-gray-600 mt-1">📝 {expense.description}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">
                      {CATEGORY_ICONS[expense.category as keyof typeof CATEGORY_ICONS]}{' '}
                      {CATEGORY_NAMES[expense.category as keyof typeof CATEGORY_NAMES]}
                    </p>
                    <p className="text-2xl font-bold mt-1">€{parseFloat(expense.amount || 0).toFixed(2)}</p>
                  </div>

                  <div>
                    {expense.receipt_url ? (
                      <p className="text-sm text-green-600">📎 Файл есть / Datei vorhanden</p>
                    ) : (
                      <p className="text-sm text-gray-400">📎 Нет файла / Keine Datei</p>
                    )}
                    {expense.maintenance_id && (
                      <p className="text-sm text-blue-600 mt-1">🔧 От ТО / Von Wartung</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {!expense.maintenance_id && (
                      <>
                        <Link href={`/dashboard/car-expenses/${expense.id}/edit`}>
                          <Button variant="outline" size="sm">✏️</Button>
                        </Link>
                      </>
                    )}
                    {expense.maintenance_id && (
                      <span className="text-sm text-gray-400">🔒 Связан с ТО</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-white">
          <div className="text-6xl mb-4">💰</div>
          <p className="text-gray-500 mb-4">Нет расходов на авто / Keine Auto-Ausgaben</p>
          <Link href="/dashboard/car-expenses/new">
            <Button>➕ Добавить первый расход</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
