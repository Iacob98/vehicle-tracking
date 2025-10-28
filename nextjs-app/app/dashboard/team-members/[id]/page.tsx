import { createServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import MemberDocuments from './MemberDocuments';
import { getUserQueryContext, applyOrgFilter } from '@/lib/query-helpers';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userContext = getUserQueryContext(user);

  // Fetch team member details
  let memberQuery = supabase
    .from('team_members')
    .select(`
      *,
      team:teams(id, name)
    `)
    .eq('id', id);
  memberQuery = applyOrgFilter(memberQuery, userContext);
  const { data: member, error } = await memberQuery.single();

  if (error || !member) {
    notFound();
  }

  // Fetch documents
  const { data: documents } = await supabase
    .from('team_member_documents')
    .select('*')
    .eq('team_member_id', id)
    .order('upload_date', { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/dashboard/team-members">
            <Button variant="ghost" size="sm">← Назад</Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">
          👤 {member.first_name} {member.last_name}
        </h1>
        <div className="mt-2 space-y-1">
          {member.phone && (
            <p className="text-gray-600">📞 {member.phone}</p>
          )}
          {member.category && (
            <p className="text-gray-600">Категория: {member.category}</p>
          )}
          {member.team ? (
            <p className="text-gray-600">
              Бригада: <Link href={`/dashboard/teams/${member.team.id}`} className="text-blue-600 hover:underline">{member.team.name}</Link>
            </p>
          ) : (
            <p className="text-gray-500">Бригада не назначена</p>
          )}
        </div>
      </div>

      {/* Documents Management */}
      <MemberDocuments
        memberId={id}
        memberName={`${member.first_name} ${member.last_name}`}
        initialDocuments={documents || []}
      />
    </div>
  );
}
