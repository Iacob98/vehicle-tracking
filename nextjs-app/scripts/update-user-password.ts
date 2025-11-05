/**
 * Script to update user password via Supabase Admin API
 * Usage: npx tsx scripts/update-user-password.ts <email> <new_password>
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
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateUserPassword(email: string, newPassword: string) {
  console.log(`🔄 Updating password for ${email}...`);

  // Get user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError);
    process.exit(1);
  }

  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.error(`❌ User with email ${email} not found`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.id}`);

  // Update password
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (error) {
    console.error('❌ Error updating password:', error);
    process.exit(1);
  }

  console.log('✅ Password updated successfully!');
  console.log(`   Email: ${email}`);
  console.log(`   New password: ${newPassword}`);
}

// Get arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: npx tsx scripts/update-user-password.ts <email> <new_password>');
  process.exit(1);
}

updateUserPassword(email, newPassword);
