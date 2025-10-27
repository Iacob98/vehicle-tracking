#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestDriver() {
  const email = 'test@test.com';
  const password = 'Admin123';
  const organizationId = '550e8400-e29b-41d4-a716-446655440000';

  console.log('🔧 Creating test driver user...');
  console.log('📧 Email:', email);
  console.log('🔑 Password:', password);

  // Step 1: Create user in auth.users
  console.log('\n1️⃣ Creating user in Supabase Auth...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      role: 'driver',
      organization_id: organizationId
    }
  });

  if (authError) {
    console.error('❌ Auth error:', authError.message);
    process.exit(1);
  }

  console.log('✅ Auth user created:', authData.user.id);

  // Step 2: Create user in public.users table
  console.log('\n2️⃣ Creating user in public.users table...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: email,
      first_name: 'Test',
      last_name: 'Driver',
      role: 'driver',
      organization_id: organizationId,
      password_hash: 'managed_by_supabase_auth',
      team_id: null
    })
    .select()
    .single();

  if (userError) {
    console.error('❌ User table error:', userError.message);
    // Try to cleanup auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    process.exit(1);
  }

  console.log('✅ User created in public.users');

  // Step 3: Get available team
  console.log('\n3️⃣ Finding available team...');
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('organization_id', organizationId)
    .limit(1);

  if (teams && teams.length > 0) {
    const teamId = teams[0].id;
    console.log('📍 Found team:', teams[0].name, '(' + teamId + ')');

    // Assign user to team
    console.log('\n4️⃣ Assigning user to team...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ team_id: teamId })
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('❌ Team assignment error:', updateError.message);
    } else {
      console.log('✅ User assigned to team:', teams[0].name);
    }
  } else {
    console.log('⚠️ No teams found. User not assigned to any team.');
  }

  console.log('\n✅ SUCCESS! Test driver created:');
  console.log('   📧 Email:', email);
  console.log('   🔑 Password:', password);
  console.log('   👤 Role: driver');
  console.log('   🆔 User ID:', authData.user.id);
  console.log('\n🌐 You can now login at: http://localhost:3000/login');
}

createTestDriver().catch(console.error);
