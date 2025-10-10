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
    } else if (userData?.organization_id) {
      console.log('🏢 Organization ID found:', userData.organization_id);

      // Update user metadata with organization_id
      const { error: updateError } = await supabase.auth.updateUser({
        data: { organization_id: userData.organization_id },
      });

      if (updateError) {
        console.error('❌ Error updating user metadata:', updateError);
      } else {
        console.log('✅ User metadata updated with organization_id');
      }
    } else {
      console.warn('⚠️ No organization_id found in users table for user:', data.user.id);
    }
  }

  console.log('🔄 Redirecting to /dashboard...');
  redirect('/dashboard');
}
