import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkOwnerAccess() {
  try {
    console.log('🔍 Checking owner access configuration...\n');

    // 1. Get owner user details
    console.log('1️⃣  Checking owner user from auth.users...');
    const { data: authUsers, error: authError } = await supabase
      .from('users')
      .select('id, email, role, organization_id')
      .eq('role', 'owner')
      .limit(5);

    if (authError) {
      console.error('❌ Error fetching users:', authError);
    } else {
      console.log(`✅ Found ${authUsers?.length || 0} owner users in public.users table:`);
      authUsers?.forEach(u => {
        console.log(`   - ${u.email}: role=${u.role}, org_id=${u.organization_id || 'NULL'}`);
      });
    }

    // 2. Check if there's data in tables
    console.log('\n2️⃣  Checking data in tables...');

    const tables = ['vehicles', 'teams', 'users', 'penalties', 'organizations'];
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ ${table}: Error - ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: ${count} records`);
      }
    }

    // 3. Check RLS policies
    console.log('\n3️⃣  Checking RLS policies for users table...');
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'users'
        ORDER BY policyname;
      `
    });

    if (policiesError) {
      console.log('   ⚠️  Cannot check policies (exec_sql not available)');
      console.log('   Using alternative method...\n');

      // Alternative: Check via information_schema
      const { data: altPolicies, error: altError } = await supabase
        .rpc('exec_sql', {
          query: `SELECT COUNT(*) as count FROM pg_policies WHERE tablename = 'users';`
        });

      if (altError) {
        console.log('   ⚠️  Cannot access policy information');
      }
    } else {
      console.log('   Policies:', policies);
    }

    // 4. Test query as service role to see actual data
    console.log('\n4️⃣  Testing direct data access (bypassing RLS)...');
    const { data: vehicles, error: vError } = await supabase
      .from('vehicles')
      .select('id, license_plate, organization_id')
      .limit(5);

    if (vError) {
      console.log(`   ❌ Error: ${vError.message}`);
    } else {
      console.log(`   ✅ Found ${vehicles?.length || 0} vehicles:`);
      vehicles?.forEach(v => {
        console.log(`      - ${v.license_plate} (org: ${v.organization_id})`);
      });
    }

    // 5. Check auth.users table directly
    console.log('\n5️⃣  Checking auth.users table for owner role...');
    const { data: authUsersMeta, error: metaError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT
          id,
          email,
          raw_user_meta_data->>'role' as role,
          raw_user_meta_data->>'organization_id' as organization_id
        FROM auth.users
        WHERE raw_user_meta_data->>'role' = 'owner'
        LIMIT 5;
      `
    });

    if (metaError) {
      console.log('   ⚠️  Cannot directly query auth.users (expected)');
      console.log('   Need to check in Supabase Dashboard → Authentication → Users');
    } else {
      console.log('   Users with owner role:', authUsersMeta);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📋 DIAGNOSIS SUMMARY');
    console.log('='.repeat(70));

    if (authUsers && authUsers.length > 0) {
      const hasNullOrgId = authUsers.some(u => u.organization_id === null);
      if (hasNullOrgId) {
        console.log('✅ Owner users exist in public.users with NULL organization_id');
      } else {
        console.log('⚠️  Owner users exist but have organization_id set (should be NULL)');
      }
    } else {
      console.log('❌ No owner users found in public.users table');
    }

    console.log('\n💡 Next steps:');
    console.log('1. Check Supabase Dashboard → Authentication → Users');
    console.log('   - Find your user');
    console.log('   - Click to view details');
    console.log('   - Check raw_user_meta_data.role = "owner"');
    console.log('   - Check raw_user_meta_data.organization_id is NOT set or NULL');
    console.log('');
    console.log('2. Check Supabase Dashboard → SQL Editor');
    console.log('   - Run: SELECT * FROM pg_policies WHERE tablename = \'users\';');
    console.log('   - Verify policies include owner role check');

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
  }
}

checkOwnerAccess();
