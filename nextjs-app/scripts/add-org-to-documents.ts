import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function addOrgToDocuments() {
  console.log('📝 Adding organization_id to vehicle_documents table...\n');

  try {
    // Execute the migration SQL
    const migrationSQL = `
      -- Add organization_id column if not exists
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'vehicle_documents'
          AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE vehicle_documents
          ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

          RAISE NOTICE 'Added organization_id column';
        ELSE
          RAISE NOTICE 'organization_id column already exists';
        END IF;
      END $$;

      -- Backfill organization_id from vehicles table
      UPDATE vehicle_documents vd
      SET organization_id = v.organization_id
      FROM vehicles v
      WHERE vd.vehicle_id = v.id
        AND vd.organization_id IS NULL;

      -- Create index if not exists
      CREATE INDEX IF NOT EXISTS idx_vehicle_documents_organization
      ON vehicle_documents(organization_id);
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Error executing migration:', error);
      console.log('\n📋 Please execute this SQL manually in Supabase SQL Editor:');
      console.log('\n' + migrationSQL);
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Checking results...');

    // Check the results
    const { data: docs, error: checkError } = await supabase
      .from('vehicle_documents')
      .select('id, organization_id')
      .limit(5);

    if (checkError) {
      console.log('⚠️  Could not verify results:', checkError.message);
    } else {
      console.log(`✓ Found ${docs?.length || 0} documents`);
      if (docs && docs.length > 0) {
        console.log(`✓ Sample organization_id: ${docs[0].organization_id || 'NULL'}`);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please execute the SQL from: lib/migration-add-org-to-documents.sql');
  }
}

addOrgToDocuments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
