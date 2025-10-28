import { getCurrentUser } from '@/lib/auth-helpers';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Водители используют свой собственный layout в /dashboard/driver/layout.tsx
  // Просто возвращаем children без sidebar и header
  if (user.role === 'driver') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-16 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
