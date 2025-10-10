import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = user.user_metadata?.organization_id;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID not found' }, { status: 400 });
    }

    // Soft delete - set is_active to false
    const { error: deleteError } = await supabase
      .from('user_documents')
      .update({ is_active: false })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
