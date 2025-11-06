import { createServerClient } from '@/lib/supabase/server';
import { uploadMultipleFiles } from '@/lib/storage';
import { apiSuccess, apiBadRequest, apiErrorFromUnknown, checkAuthentication, checkOwnerOrOrganizationId } from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate } from '@/lib/query-helpers';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    const formData = await request.formData();

    const teamMemberId = formData.get('team_member_id') as string;
    const title = formData.get('title') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const organizationId = formData.get('organization_id') as string | null;
    const files = formData.getAll('files') as File[];

    console.log('📝 Team Member Document API - Files received:', files.length);

    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, organizationId);

    // Upload files
    let fileUrls: string[] = [];
    if (files.length > 0) {
      if (!finalOrgId) {
        return apiBadRequest('Organization ID is required');
      }
      console.log('📤 Uploading team member document files...');
      fileUrls = await uploadMultipleFiles(files, 'documents', finalOrgId);
      console.log('✅ Uploaded URLs:', fileUrls);
    }

    // Insert document with organization_id
    const { data: newDoc, error: insertError } = await supabase
      .from('team_member_documents')
      .insert({
        organization_id: finalOrgId,
        team_member_id: teamMemberId,
        title,
        file_url: fileUrls.length > 0 ? fileUrls.join(';') : null,
        expiry_date: expiryDate || null,
        upload_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return apiErrorFromUnknown(insertError, { context: 'inserting team member document', teamMemberId, orgId: finalOrgId });
    }

    return apiSuccess({ document: newDoc });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/team-member-documents' });
  }
}
