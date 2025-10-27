import { createServerClient } from '@/lib/supabase/server';

/**
 * Get organization ID for the current user
 * First tries user_metadata, then falls back to users table
 */
export async function getOrganizationId(): Promise<string | null> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Try to get from user_metadata first
  let orgId = user.user_metadata?.organization_id;

  // If not in metadata, get from users table and update metadata
  if (!orgId) {
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    orgId = userData?.organization_id;

    // Update metadata for next time
    if (orgId) {
      await supabase.auth.updateUser({
        data: { organization_id: orgId },
      });
    }
  }

  return orgId || null;
}
