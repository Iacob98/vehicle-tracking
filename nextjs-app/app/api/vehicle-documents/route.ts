import { createServerClient } from '@/lib/supabase/server';
import { uploadMultipleFilesServer } from '@/lib/storage-server';
import { apiSuccess, apiErrorFromUnknown, checkAuthentication, checkOrganizationId } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, error: orgError } = checkOrganizationId(user);
    if (orgError) return orgError;

    const formData = await request.formData();

    const vehicleId = formData.get('vehicle_id') as string;
    const documentType = formData.get('document_type') as string;
    const title = formData.get('title') as string;
    const dateIssued = formData.get('date_issued') as string;
    const dateExpiry = formData.get('date_expiry') as string;
    const files = formData.getAll('files') as File[];

    console.log('📝 API Debug - Files received:', files.length);
    console.log('📝 API Debug - Files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    // Upload files
    let fileUrls: string[] = [];
    if (files.length > 0) {
      console.log('📤 Uploading files...');
      fileUrls = await uploadMultipleFilesServer(files, 'documents', orgId);
      console.log('✅ Uploaded URLs:', fileUrls);
    } else {
      console.log('⚠️ No files to upload');
    }

    // Insert document
    const { data: newDoc, error: insertError } = await supabase
      .from('vehicle_documents')
      .insert({
        vehicle_id: vehicleId,
        organization_id: orgId,
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
      return apiErrorFromUnknown(insertError, { context: 'inserting vehicle document', vehicleId, orgId });
    }

    return apiSuccess({ document: newDoc });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/vehicle-documents' });
  }
}
