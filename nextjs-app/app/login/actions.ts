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

  // Get user's organization_id from the users table
  if (data.user) {
    console.log('📊 Fetching organization_id from users table...');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error('❌ Error fetching user organization:', userError);
    } else if (userData) {
      // For owner users, organization_id will be NULL
      const orgId = userData.organization_id || null;
      console.log('🏢 Organization ID:', orgId || '(none - owner user)');

      // Update user metadata with organization_id (or null for owner)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { organization_id: orgId },
      });

      if (updateError) {
        console.error('❌ Error updating user metadata:', updateError);
      } else {
        console.log('✅ User metadata updated with organization_id');
      }
    } else {
      console.warn('⚠️ User not found in users table:', data.user.id);
    }
  }

  console.log('🔄 Redirecting to /dashboard...');
  redirect('/dashboard');
}
