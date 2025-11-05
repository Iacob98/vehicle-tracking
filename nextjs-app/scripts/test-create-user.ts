/**
 * Script to test user creation via API
 * Usage: npx tsx scripts/test-create-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local
config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testCreateUser() {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123',
    first_name: 'Test',
    last_name: 'User',
    role: 'manager',
    organization_id: '550e8400-e29b-41d4-a716-446655440000', // Test Company
    phone: '+1234567890'
  };

  console.log('🔄 Creating test user via API...');
  console.log('📧 Email:', testUser.email);

  // Call the API endpoint
  const apiUrl = `${supabaseUrl.replace('.supabase.co', '')}.supabase.co`;
  const response = await fetch(`http://localhost:3000/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify(testUser)
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ API Error:', result);
    process.exit(1);
  }

  console.log('✅ User created successfully!');
  console.log('📊 Result:', JSON.stringify(result, null, 2));

  // Verify in database
  console.log('\n🔍 Verifying in auth.users...');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.email === testUser.email);

  if (authUser) {
    console.log('✅ Found in auth.users:', authUser.id);
    console.log('   Email confirmed:', authUser.email_confirmed_at ? '✅' : '❌');
    console.log('   Metadata:', authUser.user_metadata);
  } else {
    console.log('❌ NOT found in auth.users');
  }

  // Verify in public.users
  console.log('\n🔍 Verifying in public.users...');
  const { data: publicUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', testUser.email)
    .single();

  if (publicUser) {
    console.log('✅ Found in public.users:', publicUser.id);
    console.log('   Role:', publicUser.role);
    console.log('   Organization:', publicUser.organization_id);
  } else {
    console.log('❌ NOT found in public.users');
    if (error) console.log('   Error:', error.message);
  }

  console.log('\n🧪 Test credentials for login:');
  console.log(`   Email: ${testUser.email}`);
  console.log(`   Password: ${testUser.password}`);

  return testUser;
}

testCreateUser().catch(console.error);
