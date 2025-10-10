import { createServerClient } from '@/lib/supabase/server';
import { uploadFile } from '@/lib/storage';
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

    const userId = formData.get('user_id') as string;
    const documentType = formData.get('document_type') as string;
    const title = formData.get('title') as string;
    const issueDate = formData.get('issue_date') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const file = formData.get('file') as File | null;

    console.log('📝 User Document API - File received:', file?.name);

    // Upload file if provided
    let fileUrl: string | null = null;
    if (file) {
      console.log('📤 Uploading user document file...');
      fileUrl = await uploadFile(file, 'documents', orgId);
      console.log('✅ Uploaded URL:', fileUrl);
    }

    // Insert document
    const { data: newDoc, error: insertError } = await supabase
      .from('user_documents')
      .insert({
        user_id: userId,
        document_type: documentType,
        title,
        date_issued: issueDate || null,
        date_expiry: expiryDate || null,
        file_url: fileUrl,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      return apiErrorFromUnknown(insertError, { context: 'inserting user document', userId, orgId });
    }

    return apiSuccess({ document: newDoc });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/user-documents' });
  }
}
