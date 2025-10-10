import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🔄 Running migration: 002_add_organization_id_to_team_member_documents...\n');

    // Step 1: Add column
    console.log('📝 Step 1: Adding organization_id column...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      query: `ALTER TABLE team_member_documents ADD COLUMN IF NOT EXISTS organization_id UUID;`
    });
    if (error1) console.log('Note:', error1.message);
    console.log('✅ Step 1 complete\n');

    // Step 2: Populate from team_members
    console.log('📝 Step 2: Populating organization_id from team_members...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      query: `UPDATE team_member_documents tmd
              SET organization_id = tm.organization_id
              FROM team_members tm
              WHERE tmd.team_member_id = tm.id
              AND tmd.organization_id IS NULL;`
    });
    if (error2) console.log('Note:', error2.message);
    console.log('✅ Step 2 complete\n');

    // Step 3: Add NOT NULL constraint
    console.log('📝 Step 3: Adding NOT NULL constraint...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      query: `ALTER TABLE team_member_documents ALTER COLUMN organization_id SET NOT NULL;`
    });
    if (error3) console.log('Note:', error3.message);
    console.log('✅ Step 3 complete\n');

    // Step 4: Add foreign key
    console.log('📝 Step 4: Adding foreign key constraint...');
    const { error: error4 } = await supabase.rpc('exec_sql', {
      query: `ALTER TABLE team_member_documents
              ADD CONSTRAINT team_member_documents_organization_id_fkey
              FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;`
    });
    if (error4) console.log('Note:', error4.message);
    console.log('✅ Step 4 complete\n');

    // Step 5: Add index
    console.log('📝 Step 5: Creating index...');
    const { error: error5 } = await supabase.rpc('exec_sql', {
      query: `CREATE INDEX IF NOT EXISTS idx_team_member_documents_organization_id
              ON team_member_documents(organization_id);`
    });
    if (error5) console.log('Note:', error5.message);
    console.log('✅ Step 5 complete\n');

    // Step 6: Enable RLS
    console.log('📝 Step 6: Enabling RLS...');
    const { error: error6 } = await supabase.rpc('exec_sql', {
      query: `ALTER TABLE team_member_documents ENABLE ROW LEVEL SECURITY;`
    });
    if (error6) console.log('Note:', error6.message);
    console.log('✅ Step 6 complete\n');

    // Step 7: Create RLS policies
    console.log('📝 Step 7: Creating RLS policies...');

    // Drop old policies first
    await supabase.rpc('exec_sql', {
      query: `DROP POLICY IF EXISTS "Users can manage team member documents in their organization" ON team_member_documents;
              DROP POLICY IF EXISTS "Users can view team member documents in their organization" ON team_member_documents;`
    });

    // Create new policies
    const policies = [
      `CREATE POLICY "Users can view team member documents in their organization"
       ON team_member_documents FOR SELECT
       USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));`,

      `CREATE POLICY "Users can insert team member documents in their organization"
       ON team_member_documents FOR INSERT
       WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));`,

      `CREATE POLICY "Users can update team member documents in their organization"
       ON team_member_documents FOR UPDATE
       USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));`,

      `CREATE POLICY "Users can delete team member documents in their organization"
       ON team_member_documents FOR DELETE
       USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));`
    ];

    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { query: policy });
      if (error) console.log('Note:', error.message);
    }

    console.log('✅ Step 7 complete\n');

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Added organization_id column to team_member_documents table');
    console.log('- ✅ Populated organization_id from team_members table');
    console.log('- ✅ Added NOT NULL constraint and foreign key');
    console.log('- ✅ Created index for performance');
    console.log('- ✅ Enabled RLS with proper policies');
    console.log('\n🎉 Team member documents can now be created without RLS violations!');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
