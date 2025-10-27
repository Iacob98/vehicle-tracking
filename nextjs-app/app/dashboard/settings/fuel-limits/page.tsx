import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Permissions } from '@/lib/types/roles';
import { FuelLimitsForm } from './FuelLimitsForm';

export default async function FuelLimitsPage() {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  // Проверка прав доступа (только admin и manager)
  if (!user || !Permissions.canManageFraudLimits(user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          ⛽ Лимиты расхода топлива
        </h1>
        <p className="text-gray-600 mt-2">
          Настройка лимитов расхода топлива для предупреждений о превышении
        </p>
      </div>

      {/* Информационный блок */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">
              Как работают лимиты
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Лимиты применяются ко всей организации</li>
              <li>• При добавлении заправки система проверяет текущий расход</li>
              <li>• Если лимит превышен, водитель увидит предупреждение</li>
              <li>• Заправка будет добавлена, но с отметкой о превышении</li>
              <li>• Менеджеры и админы смогут видеть все превышения</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Форма настройки лимитов */}
      <FuelLimitsForm />
    </div>
  );
}
