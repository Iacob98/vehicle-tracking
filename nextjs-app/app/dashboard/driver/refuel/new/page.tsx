import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RefuelForm } from './RefuelForm';
import Link from 'next/link';

export default async function NewRefuelPage() {
  const supabase = await createServerClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Получаем информацию о водителе
  const { data: user } = await supabase
    .from('users')
    .select('id, team_id')
    .eq('id', authUser.id)
    .single();

  if (!user?.team_id) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard/driver"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Назад на главную
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            ⛽ Добавить заправку
          </h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 text-lg">
                Вы не назначены в бригаду
              </h3>
              <p className="text-yellow-700 mt-2">
                Для добавления расходов необходимо быть в бригаде с назначенным автомобилем.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Получаем авто водителя через бригаду
  const { data: assignment } = await supabase
    .from('vehicle_assignments')
    .select('vehicle_id, vehicles(id, name, license_plate)')
    .eq('team_id', user.team_id)
    .is('end_date', null)
    .single();

  if (!assignment || !assignment.vehicles) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard/driver"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Назад на главную
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            ⛽ Добавить заправку
          </h1>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 text-lg">
                Автомобиль не назначен
              </h3>
              <p className="text-yellow-700 mt-2">
                Для добавления расходов необходимо, чтобы на вашу бригаду был назначен автомобиль.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const vehicle = assignment.vehicles as any;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/driver"
          className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
        >
          ← Назад на главную
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          ⛽ Добавить заправку
        </h1>
        <p className="text-gray-600 mt-2">
          Зарегистрируйте расход на топливо
        </p>
      </div>

      <RefuelForm vehicleId={vehicle.id} vehicleName={vehicle.name} />
    </div>
  );
}
