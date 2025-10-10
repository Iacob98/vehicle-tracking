import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { uploadMultipleFilesServer } from '@/lib/storage-server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = user.user_metadata?.organization_id;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID not found' }, { status: 400 });
    }

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
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ document: newDoc });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
