'use server';

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiErrorFromUnknown, checkAuthentication, checkOwnerOrOrganizationId } from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate } from '@/lib/query-helpers';
import { createFileUploadError } from '@/lib/errors';

// Create Supabase client with Service Role key for bypassing RLS
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

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Проверка авторизации
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Проверка organization_id
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const organizationId = formData.get('organization_id') as string | null;

    // Валидация файла и bucket
    if (!file || !bucket) {
      return apiBadRequest('Missing file or bucket');
    }

    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, organizationId);

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${finalOrgId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload file using Service Role client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      const uploadError = createFileUploadError('Ошибка загрузки файла', error.message);
      return apiErrorFromUnknown(uploadError, { context: 'uploading file', bucket, organizationId: finalOrgId });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

    return apiSuccess({ url: publicUrl });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/upload' });
  }
}
