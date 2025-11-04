import { createServerClient } from '@/lib/supabase/server';
import { uploadFileServer } from '@/lib/storage-server';
import { apiSuccess, apiBadRequest, apiErrorFromUnknown, checkAuthentication, checkOwnerOrOrganizationId } from '@/lib/api-response';
import { getUserQueryContext, canAccessResource } from '@/lib/query-helpers';
import { createFileUploadError } from '@/lib/errors';

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

    const penaltyId = formData.get('penalty_id') as string;
    const paymentNotes = formData.get('payment_notes') as string;
    const file = formData.get('file') as File | null;

    // Валидация файла
    if (!file) {
      return apiBadRequest('Receipt file is required');
    }

    console.log('📝 Payment API - Receipt file:', file.name);

    // Get current penalty data to verify access
    const { data: currentPenalty } = await supabase
      .from('penalties')
      .select('photo_url, description, organization_id')
      .eq('id', penaltyId)
      .single();

    if (!currentPenalty || !canAccessResource(userContext, currentPenalty.organization_id)) {
      return apiBadRequest('Penalty not found or access denied');
    }

    // Upload receipt file using server-side storage
    console.log('📤 Uploading receipt file...');
    const receiptUrl = await uploadFileServer(file, 'penalties', currentPenalty.organization_id);
    console.log('✅ Receipt uploaded:', receiptUrl);

    if (!receiptUrl) {
      const uploadError = createFileUploadError('Failed to upload receipt');
      return apiErrorFromUnknown(uploadError, { context: 'uploading penalty receipt', penaltyId, orgId });
    }

    // Append receipt to photos
    let updatedPhotoUrl = receiptUrl;
    if (currentPenalty?.photo_url) {
      updatedPhotoUrl = `${currentPenalty.photo_url};${receiptUrl}`;
    }

    // Append payment notes to description
    let updatedDescription = currentPenalty?.description || '';
    if (paymentNotes) {
      updatedDescription = updatedDescription
        ? `${updatedDescription} | Оплачено: ${paymentNotes}`
        : `Оплачено: ${paymentNotes}`;
    }

    // Update penalty status
    const { error: updateError } = await supabase
      .from('penalties')
      .update({
        status: 'paid',
        photo_url: updatedPhotoUrl,
        description: updatedDescription || null,
      })
      .eq('id', penaltyId);

    if (updateError) {
      return apiErrorFromUnknown(updateError, { context: 'updating penalty payment status', penaltyId, orgId });
    }

    return apiSuccess({ success: true });
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/penalties/pay' });
  }
}
