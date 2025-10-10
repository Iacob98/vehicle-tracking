'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  user: any;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '🚗', label: 'Автомобили', href: '/dashboard/vehicles' },
    { icon: '📄', label: 'Документы', href: '/dashboard/documents' },
    { icon: '👷', label: 'Бригады', href: '/dashboard/teams' },
    { icon: '👤', label: 'Пользователи', href: '/dashboard/users' },
    { icon: '🚧', label: 'Штрафы', href: '/dashboard/penalties' },
    { icon: '🔧', label: 'Обслуживание', href: '/dashboard/maintenance' },
    { icon: '🚗💰', label: 'Расходы на авто', href: '/dashboard/car-expenses' },
    { icon: '💵', label: 'Расходы', href: '/dashboard/expenses' },
    { icon: '📊', label: 'Аналитика', href: '/dashboard/analytics' },
    { icon: '🏢', label: 'Управление аккаунтом', href: '/dashboard/account' },
    { icon: '🐛', label: 'Баг репорт', href: '/dashboard/bug-report' },
  ];

  return (
    <aside className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-900">🚗 Fleet Manager</h1>
        <p className="text-sm text-gray-600 mt-1">{user?.organizations?.name}</p>
      </div>

      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
