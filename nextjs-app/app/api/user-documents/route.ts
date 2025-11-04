import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { apiSuccess, apiErrorFromUnknown, checkAuthentication, checkOwnerOrOrganizationId } from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate, canAccessResource } from '@/lib/query-helpers';

// Create Supabase Admin client for file uploads (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

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

    const userContext = getUserQueryContext(user);

    const formData = await request.formData();

    const userId = formData.get('user_id') as string;
    const documentType = formData.get('document_type') as string;
    const title = formData.get('title') as string;
    const issueDate = formData.get('issue_date') as string;
    const expiryDate = formData.get('expiry_date') as string;
    const organizationId = formData.get('organization_id') as string | null;
    const file = formData.get('file') as File | null;

    console.log('📝 User Document API - File received:', file?.name);

    const finalOrgId = getOrgIdForCreate(userContext, organizationId);

    // Verify that the target user belongs to the same organization
    const { data: targetUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', userId)
      .single();

    if (userCheckError || !targetUser) {
      return apiErrorFromUnknown(
        new Error('Пользователь не найден'),
        { context: 'checking target user', userId }
      );
    }

    if (!canAccessResource(userContext, targetUser.organization_id)) {
      return apiErrorFromUnknown(
        new Error('Вы не можете добавлять документы для пользователей из другой организации'),
        { context: 'organization mismatch', userId, orgId }
      );
    }

    // Upload file if provided
    let fileUrl: string | null = null;
    if (file) {
      console.log('📤 Uploading user document file...');

      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${finalOrgId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload file using Service Role client (bypasses RLS)
      const { data, error } = await supabaseAdmin.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('❌ File upload error:', error);
        // Continue without file - we made file_url nullable
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('documents')
          .getPublicUrl(data.path);

        fileUrl = publicUrl;
        console.log('✅ Uploaded URL:', fileUrl);
      }
    }

    // Insert document
    const { data: newDoc, error: insertError } = await supabase
      .from('user_documents')
      .insert({
        user_id: userId,
        organization_id: finalOrgId,
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
      return apiErrorFromUnknown(insertError, { context: 'inserting user document', userId, orgId: finalOrgId });
    }

    return apiSuccess({ document: newDoc });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/user-documents' });
  }
}
