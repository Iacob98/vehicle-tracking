'use client';

import { useRouter } from 'next/navigation';
import { getRoleInfo, type UserRole } from '@/lib/types/roles';

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

  const roleInfo = getRoleInfo(user?.role as UserRole);

  return (
    <header className="bg-white shadow-sm border-b fixed lg:relative w-full z-20">
      <div className="px-4 md:px-6 py-3 md:py-4 flex justify-between items-center ml-0 lg:ml-0">
        <div className="ml-12 lg:ml-0">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 truncate">
            Добро пожаловать, {user?.first_name}!
          </h2>
          <p className="text-xs md:text-sm text-gray-600">
            {roleInfo.label}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-3 md:px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition whitespace-nowrap"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
