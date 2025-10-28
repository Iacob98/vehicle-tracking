import { createServerClient } from '@/lib/supabase/server';
import { uploadMultipleFilesServer } from '@/lib/storage-server';
import { apiSuccess, apiErrorFromUnknown, checkAuthentication, checkOwnerOrOrganizationId } from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate } from '@/lib/query-helpers';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, isOwner, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    const formData = await request.formData();

    const vehicleId = formData.get('vehicle_id') as string;
    const documentType = formData.get('document_type') as string;
    const title = formData.get('title') as string;
    const dateIssued = formData.get('date_issued') as string;
    const dateExpiry = formData.get('date_expiry') as string;
    const organizationId = formData.get('organization_id') as string | null;
    const files = formData.getAll('files') as File[];

    console.log('📝 API Debug - Files received:', files.length);
    console.log('📝 API Debug - Files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, organizationId);

    // Upload files
    let fileUrls: string[] = [];
    if (files.length > 0) {
      console.log('📤 Uploading files...');
      fileUrls = await uploadMultipleFilesServer(files, 'documents', finalOrgId);
      console.log('✅ Uploaded URLs:', fileUrls);
    } else {
      console.log('⚠️ No files to upload');
    }

    // Insert document
    const { data: newDoc, error: insertError } = await supabase
      .from('vehicle_documents')
      .insert({
        vehicle_id: vehicleId,
        organization_id: finalOrgId,
        document_type: documentType,
        title,
        date_issued: dateIssued || null,
        date_expiry: dateExpiry || null,
        file_url: fileUrls.length > 0 ? fileUrls.join(';') : null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return apiErrorFromUnknown(insertError, { context: 'inserting vehicle document', vehicleId, orgId: finalOrgId });
    }

    return apiSuccess({ document: newDoc });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/vehicle-documents' });
  }
}
