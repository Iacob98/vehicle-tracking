import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserDocuments from './UserDocuments';
import { getRoleInfo, type UserRole } from '@/lib/types/roles';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(currentUser);

  // Fetch user details
  let userQuery = supabase
    .from('users')
    .select('*')
    .eq('id', id);
  userQuery = applyOrgFilter(userQuery, userContext);
  const { data: user, error } = await userQuery.single();

  if (error || !user) {
    notFound();
  }

  // Get team info if exists
  let teamInfo = null;
  if (user.team_id) {
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', user.team_id)
      .single();
    teamInfo = teamData;
  }

  // Fetch user documents
  const { data: documents } = await supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', id)
    .eq('is_active', true)
    .order('date_expiry', { ascending: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard/users">
            <Button variant="ghost" size="sm">← Назад</Button>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            {user.first_name} {user.last_name}
          </h1>
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            {getRoleInfo(user.role as UserRole).label}
          </span>
        </div>
        <div className="mt-2 space-y-1">
          <p className="text-gray-600">✉️ {user.email}</p>
          {user.phone && <p className="text-gray-600">📞 {user.phone}</p>}
          {user.fuel_card_id && (
            <p className="text-gray-600">⛽ Заправочная карта: <span className="font-mono font-semibold">{user.fuel_card_id}</span></p>
          )}
          {teamInfo ? (
            <p className="text-gray-600">
              👥 Бригада:{' '}
              <Link href={`/dashboard/teams/${teamInfo.id}`} className="text-blue-600 hover:underline">
                {teamInfo.name}
              </Link>
            </p>
          ) : (
            <p className="text-gray-400">Бригада не назначена</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Link href={`/dashboard/users/${id}/edit`}>
          <Button variant="outline">✏️ Редактировать</Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">📄 Документы ({documents?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <UserDocuments
            userId={id}
            userName={`${user.first_name} ${user.last_name}`}
            organizationId={user.organization_id}
            initialDocuments={documents || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
