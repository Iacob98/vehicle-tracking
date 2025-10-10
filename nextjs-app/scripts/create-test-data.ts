import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestData() {
  console.log('🚀 Starting test data creation...')

  try {
    // 1. Create test organization
    console.log('\n📊 Creating test organization...')
    const orgId = '550e8400-e29b-41d4-a716-446655440000'

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        id: orgId,
        name: 'Test Company',
        subscription_status: 'active'
      })
      .select()

    if (orgError) {
      console.error('❌ Error creating organization:', orgError)
    } else {
      console.log('✅ Organization created:', orgId)
    }

    // 2. Create test user in Supabase Auth
    console.log('\n👤 Creating test user in Auth...')
    const testEmail = 'admin@test.com'
    const testPassword = 'test123456'

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: orgId,
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User'
      }
    })

    if (authError) {
      console.error('❌ Error creating auth user:', authError)
      return
    }

    console.log('✅ Auth user created:', authUser.user?.id)

    // 3. Create user record in users table
    console.log('\n📝 Creating user record in database...')
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .insert({
        id: authUser.user!.id,
        organization_id: orgId,
        email: testEmail,
        password_hash: 'managed_by_supabase_auth',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      })
      .select()

    if (dbUserError) {
      console.error('❌ Error creating user record:', dbUserError)
    } else {
      console.log('✅ User record created')
    }

    // 4. Create test team
    console.log('\n👷 Creating test team...')
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        organization_id: orgId,
        name: 'Основная бригада',
        lead_id: authUser.user!.id
      })
      .select()

    if (teamError) {
      console.error('❌ Error creating team:', teamError)
    } else {
      console.log('✅ Team created:', team[0]?.id)
    }

    // 5. Create test vehicle
    console.log('\n🚗 Creating test vehicle...')
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert({
        organization_id: orgId,
        name: 'Mercedes Sprinter',
        license_plate: 'B-AB 1234',
        vin: 'WDB9066351L123456',
        status: 'active',
        is_rental: false
      })
      .select()

    if (vehicleError) {
      console.error('❌ Error creating vehicle:', vehicleError)
    } else {
      console.log('✅ Vehicle created:', vehicle[0]?.id)
    }

    console.log('\n✨ Test data creation completed!\n')
    console.log('🔐 Login credentials:')
    console.log(`   Email: ${testEmail}`)
    console.log(`   Password: ${testPassword}`)
    console.log(`\n🌐 Visit: http://localhost:3000/login`)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createTestData()
