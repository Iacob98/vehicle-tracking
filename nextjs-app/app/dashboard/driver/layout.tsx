import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DriverHeader from '@/components/DriverHeader';

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Получаем данные пользователя из БД
  const { data: user } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, team_id')
    .eq('id', authUser.id)
    .single();

  // Проверяем роль - только водители могут быть здесь
  if (user?.role !== 'driver') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DriverHeader user={user} />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
