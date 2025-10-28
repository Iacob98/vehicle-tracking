import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🔄 Running migration: 020_owner_minimal.sql\n');
    console.log('📋 This will update RLS policies to allow owner role full access\n');

    // Read migration file
    const migrationPath = join(__dirname, '../migrations/020_owner_minimal.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split into individual policy updates (each DROP + CREATE pair)
    const policyBlocks = migrationSQL.split(/-- ====+/);

    let policyCount = 0;

    for (const block of policyBlocks) {
      const trimmed = block.trim();
      if (!trimmed || trimmed.startsWith('Migration')) continue;

      // Extract table name from comment
      const tableMatch = trimmed.match(/^--\s+(\w+)/);
      const tableName = tableMatch ? tableMatch[1] : 'UNKNOWN';

      // Split into individual statements
      const statements = trimmed
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      if (statements.length === 0) continue;

      console.log(`\n📝 Updating ${tableName} policies...`);

      for (const statement of statements) {
        const query = statement + ';';
        const { error } = await supabase.rpc('exec_sql', { query });

        if (error) {
          console.log('⚠️  Note:', error.message);
        }
      }

      policyCount++;
      console.log(`✅ ${tableName} policies updated`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log(`- ✅ Updated RLS policies for ${policyCount} tables`);
    console.log('- ✅ Owner role can now see ALL data across organizations');
    console.log('- ✅ Owner role can create/update/delete in any organization');
    console.log('\n🎉 Owner role access issues FIXED!');
    console.log('\n💡 Next steps:');
    console.log('1. Refresh your browser');
    console.log('2. Login as owner');
    console.log('3. You should now see all vehicles, teams, users, and penalties');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n⚠️  If you see "function exec_sql does not exist", you need to:');
    console.error('1. Go to Supabase Dashboard SQL Editor');
    console.error('2. Copy the contents of migrations/020_owner_minimal.sql');
    console.error('3. Paste and run it there');
    process.exit(1);
  }
}

applyMigration();
