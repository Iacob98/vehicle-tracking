import { createServerClient } from '@/lib/supabase/server';
import { uploadMultipleFiles } from '@/lib/storage';
import { apiSuccess, apiErrorFromUnknown, checkAuthentication, checkOrganizationId } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    const formData = await request.formData();

    const teamMemberId = formData.get('team_member_id') as string;
    const title = formData.get('title') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const files = formData.getAll('files') as File[];

    console.log('📝 Team Member Document API - Files received:', files.length);

    // Upload files
    let fileUrls: string[] = [];
    if (files.length > 0) {
      console.log('📤 Uploading team member document files...');
      fileUrls = await uploadMultipleFiles(files, 'documents', orgId);
      console.log('✅ Uploaded URLs:', fileUrls);
    }

    // Insert document with organization_id
    const { data: newDoc, error: insertError } = await supabase
      .from('team_member_documents')
      .insert({
        organization_id: orgId,
        team_member_id: teamMemberId,
        title,
        file_url: fileUrls.length > 0 ? fileUrls.join(';') : null,
        expiry_date: expiryDate || null,
        upload_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return apiErrorFromUnknown(insertError, { context: 'inserting team member document', teamMemberId, orgId });
    }

    return apiSuccess({ document: newDoc });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/team-member-documents' });
  }
}
