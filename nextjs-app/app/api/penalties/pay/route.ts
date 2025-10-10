import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { uploadFileServer } from '@/lib/storage-server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = user.user_metadata?.organization_id;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID not found' }, { status: 400 });
    }

    const formData = await request.formData();

    const penaltyId = formData.get('penalty_id') as string;
    const paymentNotes = formData.get('payment_notes') as string;
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Receipt file is required' }, { status: 400 });
    }

    console.log('📝 Payment API - Receipt file:', file.name);

    // Upload receipt file using server-side storage
    console.log('📤 Uploading receipt file...');
    const receiptUrl = await uploadFileServer(file, 'penalties', orgId);
    console.log('✅ Receipt uploaded:', receiptUrl);

    if (!receiptUrl) {
      return NextResponse.json({ error: 'Failed to upload receipt' }, { status: 500 });
    }

    // Get current penalty data
    const { data: currentPenalty } = await supabase
      .from('penalties')
      .select('photo_url, description')
      .eq('id', penaltyId)
      .single();

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
      .eq('id', penaltyId)
      .eq('organization_id', orgId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
