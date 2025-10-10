import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createStorageBuckets() {
  console.log('🗂️  Creating storage buckets...\n');

  const buckets = [
    {
      id: 'vehicles',
      name: 'vehicles',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    },
    {
      id: 'documents',
      name: 'documents',
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    },
    {
      id: 'expenses',
      name: 'expenses',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    },
    {
      id: 'penalties',
      name: 'penalties',
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    },
  ];

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBucket } = await supabase.storage.getBucket(bucket.id);

      if (existingBucket) {
        console.log(`✓ Bucket "${bucket.id}" already exists`);

        // Update bucket settings
        const { error: updateError } = await supabase.storage.updateBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes,
        });

        if (updateError) {
          console.log(`  ⚠️  Could not update bucket settings: ${updateError.message}`);
        } else {
          console.log(`  ✓ Updated bucket settings`);
        }
      } else {
        // Create bucket
        const { error: createError } = await supabase.storage.createBucket(bucket.id, {
          public: bucket.public,
          fileSizeLimit: bucket.fileSizeLimit,
          allowedMimeTypes: bucket.allowedMimeTypes,
        });

        if (createError) {
          console.log(`✗ Failed to create bucket "${bucket.id}": ${createError.message}`);
        } else {
          console.log(`✓ Created bucket "${bucket.id}"`);
        }
      }
    } catch (error: any) {
      console.log(`✗ Error processing bucket "${bucket.id}": ${error.message}`);
    }

    console.log('');
  }

  console.log('✅ Storage buckets setup complete!\n');
  console.log('📝 Note: Storage RLS policies need to be set up manually in Supabase Dashboard:');
  console.log('   Dashboard → Storage → Select bucket → Policies → New Policy\n');
  console.log('   Or run the SQL from: lib/storage-setup.sql');
}

createStorageBuckets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
