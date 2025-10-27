'use client';

import { useRouter } from 'next/navigation';

interface DriverHeaderProps {
  user: {
    first_name: string;
    last_name: string;
  };
}

export default function DriverHeader({ user }: DriverHeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const response = await fetch('/api/auth/signout', { method: 'POST' });
    if (response.ok) {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <header className="bg-gradient-to-r from-green-600 to-green-700 shadow-lg">
      <div className="px-4 md:px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            🚗 Driver Panel
          </h1>
          <p className="text-sm md:text-base text-green-100">
            {user.first_name} {user.last_name}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm md:text-base bg-white/20 hover:bg-white/30 text-white rounded-lg transition font-medium backdrop-blur-sm"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
