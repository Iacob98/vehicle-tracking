'use server';

import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  console.log('🔑 Login attempt for:', email);

  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    return { error: error.message };
  }

  console.log('✅ Login successful, user ID:', data.user?.id);
  console.log('📧 User email:', data.user?.email);

  // Get user's role and organization_id from raw_user_meta_data
  // This avoids RLS permission issues during login
  if (data.user) {
    const userMetadata = data.user.user_metadata || {};
    const role = userMetadata.role || 'viewer';
    const orgId = userMetadata.organization_id || null;

    console.log('📊 User role:', role);
    console.log('🏢 Organization ID:', orgId || '(none - owner user)');

    // Metadata is already set in auth.users by our trigger
    // No need to update it here
    console.log('✅ User metadata loaded from auth.users');
  }

  console.log('🔄 Redirecting to /dashboard...');
  redirect('/dashboard');
}
