import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { OrganizationForm } from '../../OrganizationForm';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { type UserRole } from '@/lib/types/roles';

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createServerClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userRole = (user?.user_metadata?.role || 'viewer') as UserRole;
  const userOrgId = user?.user_metadata?.organization_id;

  // Owner can edit any organization, admin can only edit their own
  if (userRole !== 'owner' && userRole !== 'admin') {
    redirect('/dashboard');
  }

  // Admin can only edit their own organization
  if (userRole === 'admin' && id !== userOrgId) {
    redirect('/dashboard');
  }

  // Fetch organization
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !organization) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <Breadcrumbs
        items={[
          { label: 'Панель управления', href: '/dashboard' },
          { label: 'Организации', href: '/dashboard/organizations' },
          { label: organization.name, href: `/dashboard/organizations/${id}` },
          { label: 'Редактирование' },
        ]}
      />

      <div className="mb-6 mt-6">
        <h1 className="text-3xl font-bold">✏️ Редактировать организацию</h1>
        <p className="text-gray-600">Изменить данные организации {organization.name}</p>
      </div>

      <OrganizationForm organization={organization} />
    </div>
  );
}
