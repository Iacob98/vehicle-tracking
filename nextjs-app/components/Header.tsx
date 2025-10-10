'use client';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  user: any;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const response = await fetch('/api/auth/signout', { method: 'POST' });
    if (response.ok) {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Добро пожаловать, {user?.first_name}!
          </h2>
          <p className="text-sm text-gray-600">
            {user?.role === 'admin' ? 'Администратор' : 
             user?.role === 'manager' ? 'Менеджер' : 
             user?.role === 'team_lead' ? 'Бригадир' : 'Работник'}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
