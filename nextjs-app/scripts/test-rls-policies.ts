import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testRLSPolicies() {
  console.log('🧪 Testing RLS Policies for vehicle_documents\n');

  try {
    // 1. Check if RLS is enabled
    console.log('1️⃣ Checking if RLS is enabled...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT relname, relrowsecurity
          FROM pg_class
          WHERE relname = 'vehicle_documents';
        `
      });

    if (tableError) {
      console.log('⚠️  Cannot check RLS status via RPC, checking manually...');
    }

    // 2. Check existing policies
    console.log('\n2️⃣ Checking existing policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT policyname, cmd, qual, with_check
          FROM pg_policies
          WHERE tablename = 'vehicle_documents';
        `
      });

    if (policiesError) {
      console.log('⚠️  Cannot list policies via RPC');
      console.log('   Let me try to create policies directly...\n');
    }

    // 3. Try to enable RLS and create policies
    console.log('3️⃣ Enabling RLS and creating policies...');

    const setupSQL = `
      -- Enable RLS
      ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can view documents from their organization" ON vehicle_documents;
      DROP POLICY IF EXISTS "Users can insert documents for their organization" ON vehicle_documents;
      DROP POLICY IF EXISTS "Users can update documents from their organization" ON vehicle_documents;
      DROP POLICY IF EXISTS "Users can delete documents from their organization" ON vehicle_documents;

      -- Create new policies
      CREATE POLICY "Users can view documents from their organization"
      ON vehicle_documents FOR SELECT
      TO authenticated
      USING (
        organization_id::text = COALESCE(
          auth.jwt() -> 'user_metadata' ->> 'organization_id',
          auth.jwt() -> 'app_metadata' ->> 'organization_id'
        )
      );

      CREATE POLICY "Users can insert documents for their organization"
      ON vehicle_documents FOR INSERT
      TO authenticated
      WITH CHECK (
        organization_id::text = COALESCE(
          auth.jwt() -> 'user_metadata' ->> 'organization_id',
          auth.jwt() -> 'app_metadata' ->> 'organization_id'
        )
      );

      CREATE POLICY "Users can update documents from their organization"
      ON vehicle_documents FOR UPDATE
      TO authenticated
      USING (
        organization_id::text = COALESCE(
          auth.jwt() -> 'user_metadata' ->> 'organization_id',
          auth.jwt() -> 'app_metadata' ->> 'organization_id'
        )
      )
      WITH CHECK (
        organization_id::text = COALESCE(
          auth.jwt() -> 'user_metadata' ->> 'organization_id',
          auth.jwt() -> 'app_metadata' ->> 'organization_id'
        )
      );

      CREATE POLICY "Users can delete documents from their organization"
      ON vehicle_documents FOR DELETE
      TO authenticated
      USING (
        organization_id::text = COALESCE(
          auth.jwt() -> 'user_metadata' ->> 'organization_id',
          auth.jwt() -> 'app_metadata' ->> 'organization_id'
        )
      );
    `;

    // Execute via service role (bypasses RLS)
    const { error: setupError } = await supabase.rpc('exec_sql', { sql: setupSQL });

    if (setupError) {
      console.log('❌ Error creating policies via RPC:', setupError.message);
      console.log('\n📋 Please execute this SQL manually in Supabase SQL Editor:\n');
      console.log(setupSQL);
      console.log('\n');
    } else {
      console.log('✅ Policies created successfully!\n');
    }

    // 4. Verify final state
    console.log('4️⃣ Verifying final state...');
    const { data: finalPolicies } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT policyname, cmd
          FROM pg_policies
          WHERE tablename = 'vehicle_documents'
          ORDER BY policyname;
        `
      });

    if (finalPolicies) {
      console.log('✓ Found policies:', finalPolicies);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please execute the SQL from: lib/rls-fix-final.sql manually in Supabase Dashboard');
  }
}

testRLSPolicies()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
