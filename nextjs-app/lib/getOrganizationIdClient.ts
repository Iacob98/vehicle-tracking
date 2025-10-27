import { supabase } from '@/lib/supabase/client';

/**
 * Get organization ID for the current user (CLIENT SIDE)
 * First tries user_metadata, then falls back to users table
 */
export async function getOrganizationIdClient(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('🔍 getOrganizationIdClient - User:', user?.id);

  if (!user) {
    console.error('❌ No user found - user is not logged in');
    console.error('⚠️ Please login to continue');
    // NOTE: Not redirecting automatically to allow user to see error messages
    return null;
  }

  // Try to get from user_metadata first
  let orgId = user.user_metadata?.organization_id;
  console.log('📋 user_metadata.organization_id:', orgId);

  // If not in metadata, get from users table and update metadata
  if (!orgId) {
    console.log('⚠️ organization_id not in metadata, fetching from users table...');

    const { data: userData, error } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching user data:', error);
    }

    console.log('📊 User data from DB:', userData);
    orgId = userData?.organization_id;

    // Update metadata for next time
    if (orgId) {
      console.log('✅ Updating user_metadata with organization_id:', orgId);
      const { error: updateError } = await supabase.auth.updateUser({
        data: { organization_id: orgId },
      });

      if (updateError) {
        console.error('❌ Error updating user metadata:', updateError);
      }
    } else {
      console.error('❌ No organization_id found in users table for user:', user.id);
    }
  }

  console.log('🎯 Final organization_id:', orgId);
  return orgId || null;
}
