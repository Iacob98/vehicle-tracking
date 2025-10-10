import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = user.user_metadata?.organization_id;

  // Verify vehicle belongs to user's organization
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('organization_id')
    .eq('id', id)
    .single();

  if (!vehicle || vehicle.organization_id !== orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
