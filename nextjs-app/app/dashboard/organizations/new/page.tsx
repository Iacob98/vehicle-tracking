import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OrganizationForm } from '../OrganizationForm';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { type UserRole } from '@/lib/types/roles';

export default async function NewOrganizationPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userRole = (user?.user_metadata?.role || 'viewer') as UserRole;

  // Only owner can create organizations
  if (userRole !== 'owner') {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-2xl">
      <Breadcrumbs
        items={[
          { label: 'Панель управления', href: '/dashboard' },
          { label: 'Организации', href: '/dashboard/organizations' },
          { label: 'Новая организация' },
        ]}
      />

      <div className="mb-6 mt-6">
        <h1 className="text-3xl font-bold">➕ Добавить организацию</h1>
        <p className="text-gray-600">Создать новую организацию в системе</p>
      </div>

      <OrganizationForm />
    </div>
  );
}
