'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
  user: any;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isMobileMenuOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white shadow-lg
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">🚗 Fleet Manager</h1>
          <p className="text-sm text-gray-600 mt-1">{user?.organizations?.name}</p>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-5rem)]">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
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
    </>
  );
}
