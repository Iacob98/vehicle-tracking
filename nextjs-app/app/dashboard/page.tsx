import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }

  const { data: user } = await supabase
    .from('users')
    .select('*, organizations(*)')
    .eq('id', session.user.id)
    .single();

  const handleSignOut = async () => {
    'use server';
    const supabase = await createServerClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🚗 Fleet Management
            </h1>
            <p className="text-sm text-gray-600">
              {user?.organizations?.name || 'Организация'}
            </p>
          </div>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Выйти
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Добро пожаловать, {user?.first_name} {user?.last_name}!
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Email</p>
              <p className="text-lg text-blue-900">{user?.email}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Роль</p>
              <p className="text-lg text-green-900">{user?.role}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Организация</p>
              <p className="text-lg text-purple-900">{user?.organizations?.name}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ✨ Система авторизации работает! Следующие модули будут добавлены в ближайшее время.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
