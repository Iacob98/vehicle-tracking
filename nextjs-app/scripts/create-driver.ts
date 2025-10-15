import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Organization ID для админа
const ORGANIZATION_ID = '550e8400-e29b-41d4-a716-446655440000'

async function createDriver() {
  console.log('🚗 Создание водителя...\n')

  try {
    const driverEmail = 'vod@gmail.com'
    const driverPassword = 'Admin12345'

    // 1. Создаём пользователя в Supabase Auth
    console.log('👤 Создание пользователя в Auth...')
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: driverEmail,
      password: driverPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: ORGANIZATION_ID,
        role: 'driver',
        first_name: 'Водитель',
        last_name: 'Тестовый'
      }
    })

    if (authError) {
      console.error('❌ Ошибка создания пользователя в Auth:', authError)
      return
    }

    console.log('✅ Пользователь создан в Auth:', authUser.user?.id)

    // 2. Создаём запись в таблице users
    console.log('\n📝 Создание записи в таблице users...')
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .insert({
        id: authUser.user!.id,
        organization_id: ORGANIZATION_ID,
        email: driverEmail,
        password_hash: 'managed_by_supabase_auth',
        first_name: 'Водитель',
        last_name: 'Тестовый',
        role: 'driver'
      })
      .select()

    if (dbUserError) {
      console.error('❌ Ошибка создания записи в users:', dbUserError)
    } else {
      console.log('✅ Запись в users создана')
    }

    console.log('\n✨ Водитель успешно создан!\n')
    console.log('🔐 Данные для входа:')
    console.log(`   Email: ${driverEmail}`)
    console.log(`   Password: ${driverPassword}`)
    console.log(`   Role: driver`)
    console.log(`\n🌐 Войти: http://localhost:3000/login`)

  } catch (error) {
    console.error('❌ Неожиданная ошибка:', error)
    process.exit(1)
  }
}

createDriver()
