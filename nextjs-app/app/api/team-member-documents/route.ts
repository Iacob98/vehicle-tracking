import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { uploadMultipleFiles } from '@/lib/storage';

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
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ document: newDoc });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
