/**
 * Script to test user login via Supabase Auth
 * Usage: npx tsx scripts/test-login.ts <email> <password>
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin(email: string, password: string) {
  console.log('🔑 Testing login...');
  console.log('📧 Email:', email);
  console.log('🔗 URL:', supabaseUrl);

  // Attempt login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    console.error('   Code:', error.status);
    process.exit(1);
  }

  console.log('✅ Login successful!');
  console.log('👤 User ID:', data.user?.id);
  console.log('📧 Email:', data.user?.email);
  console.log('✉️  Email confirmed:', data.user?.email_confirmed_at ? '✅' : '❌');

  // Check user metadata
  const metadata = data.user?.user_metadata || {};
  console.log('\n📊 User Metadata:');
  console.log('   Role:', metadata.role || '(none)');
  console.log('   Organization ID:', metadata.organization_id || '(none - owner user)');
  console.log('   First Name:', metadata.first_name || '(none)');
  console.log('   Last Name:', metadata.last_name || '(none)');
  console.log('   Phone:', metadata.phone || '(none)');

  // Test fetching user data from public.users
  console.log('\n🔍 Fetching user from public.users...');
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (publicError) {
    console.error('❌ Error fetching from public.users:', publicError.message);
  } else {
    console.log('✅ Found in public.users:');
    console.log('   ID:', publicUser.id);
    console.log('   Email:', publicUser.email);
    console.log('   Role:', publicUser.role);
    console.log('   Organization ID:', publicUser.organization_id || '(none - owner user)');
    console.log('   Name:', `${publicUser.first_name} ${publicUser.last_name}`);
  }

  // Sign out
  await supabase.auth.signOut();
  console.log('\n✅ Test complete, signed out');
}

// Get arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: npx tsx scripts/test-login.ts <email> <password>');
  console.error('Example: npx tsx scripts/test-login.ts iasa@gmail.com Admin123');
  process.exit(1);
}

testLogin(email, password).catch(console.error);
