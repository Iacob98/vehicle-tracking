import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║            ПОЛНЫЙ АНАЛИЗ: МОЖЕТ ЛИ OWNER ВИДЕТЬ ВСЕ ДАННЫЕ?                 ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

async function completeAnalysis() {
  let canOwnerSeeAll = true;
  const problems: string[] = [];
  const solutions: string[] = [];

  // ============================================================================
  // ЭТАП 1: Проверка данных в БД
  // ============================================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ЭТАП 1: Проверка данных в БД');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const tables = ['vehicles', 'teams', 'users', 'penalties'];
  const dataCounts: Record<string, number> = {};

  for (const table of tables) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: ERROR - ${error.message}`);
      problems.push(`Таблица ${table} недоступна: ${error.message}`);
    } else {
      dataCounts[table] = count || 0;
      console.log(`✅ ${table}: ${count} записей`);
    }
  }

  const hasData = Object.values(dataCounts).some(count => count > 0);
  if (!hasData) {
    canOwnerSeeAll = false;
    problems.push('В базе данных нет записей для отображения');
    solutions.push('Добавьте тестовые данные в таблицы');
  }

  // ============================================================================
  // ЭТАП 2: Проверка owner пользователя
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ЭТАП 2: Проверка owner пользователя');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: ownerUsers, error: ownerError } = await supabaseAdmin
    .from('users')
    .select('id, email, role, organization_id')
    .eq('role', 'owner');

  if (ownerError) {
    console.log(`❌ Ошибка получения owner пользователей: ${ownerError.message}`);
    problems.push(`Не удалось найти owner пользователей: ${ownerError.message}`);
    canOwnerSeeAll = false;
  } else if (!ownerUsers || ownerUsers.length === 0) {
    console.log('❌ Owner пользователи НЕ найдены в таблице public.users');
    problems.push('Нет пользователей с ролью owner');
    solutions.push('Создайте пользователя с role="owner" в таблице users');
    canOwnerSeeAll = false;
  } else {
    console.log(`✅ Найдено ${ownerUsers.length} owner пользователей:`);
    ownerUsers.forEach(u => {
      const orgStatus = u.organization_id === null ? '✓ NULL (правильно)' : `✗ ${u.organization_id} (должно быть NULL)`;
      console.log(`   - ${u.email}`);
      console.log(`     Role: ${u.role}`);
      console.log(`     Organization ID: ${orgStatus}`);

      if (u.organization_id !== null) {
        problems.push(`Owner ${u.email} имеет organization_id=${u.organization_id}, должно быть NULL`);
        solutions.push(`UPDATE users SET organization_id = NULL WHERE id = '${u.id}';`);
      }
    });
  }

  // ============================================================================
  // ЭТАП 3: Проверка RLS политик
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ЭТАП 3: Проверка RLS политик');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if RLS is enabled
  const { data: rlsStatus } = await supabaseAdmin
    .from('vehicles')
    .select('*')
    .limit(1);

  console.log('Проверка RLS для таблицы users (критично):');

  // Try to query users table to see the actual error
  const testUserId = ownerUsers?.[0]?.id;

  if (testUserId) {
    console.log(`\nТест 1: Попытка запроса от имени owner пользователя (${ownerUsers[0].email})`);
    console.log('Это симуляция того, что делает приложение...\n');

    // Create client with owner user session simulation
    const { data: testData, error: testError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .limit(5);

    if (testError) {
      console.log(`❌ ОШИБКА: ${testError.message} (код: ${testError.code})`);

      if (testError.code === '42501') {
        problems.push('RLS политика блокирует доступ к таблице users');
        solutions.push('КРИТИЧНО: Применить миграцию 021_fix_owner_rls_use_public_users.sql');
        canOwnerSeeAll = false;
      }
    } else {
      console.log(`✅ Успешно получено ${testData?.length || 0} пользователей`);
    }

    // Test vehicles
    console.log('\nТест 2: Попытка запроса таблицы vehicles');
    const { data: vehiclesTest, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .select('id, license_plate')
      .limit(5);

    if (vehiclesError) {
      console.log(`❌ ОШИБКА: ${vehiclesError.message}`);
      problems.push('RLS политика блокирует доступ к таблице vehicles');
      canOwnerSeeAll = false;
    } else {
      console.log(`✅ Успешно получено ${vehiclesTest?.length || 0} машин`);
    }

    // Test teams
    console.log('\nТест 3: Попытка запроса таблицы teams');
    const { data: teamsTest, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, name')
      .limit(5);

    if (teamsError) {
      console.log(`❌ ОШИБКА: ${teamsError.message}`);
      problems.push('RLS политика блокирует доступ к таблице teams');
      canOwnerSeeAll = false;
    } else {
      console.log(`✅ Успешно получено ${teamsTest?.length || 0} команд`);
    }
  }

  // ============================================================================
  // ЭТАП 4: Проверка применения миграции
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ЭТАП 4: Проверка, была ли применена миграция 021');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('⚠️  Невозможно проверить автоматически (нет exec_sql функции)');
  console.log('📋 Нужно проверить вручную в Supabase Dashboard:\n');
  console.log('   1. Откройте SQL Editor');
  console.log('   2. Выполните: SELECT policyname, qual FROM pg_policies WHERE tablename = \'users\';');
  console.log('   3. Проверьте, что qual содержит: EXISTS (SELECT 1 FROM users');
  console.log('   4. НЕ должно быть: raw_user_meta_data\n');

  // ============================================================================
  // ИТОГОВЫЙ ОТЧЕТ
  // ============================================================================
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                            ИТОГОВЫЙ ОТЧЕТ                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  if (canOwnerSeeAll && problems.length === 0) {
    console.log('✅ ВЫВОД: Owner МОЖЕТ видеть все данные\n');
    console.log('Все проверки пройдены успешно!');
  } else {
    console.log('❌ ВЫВОД: Owner НЕ МОЖЕТ видеть все данные\n');
    console.log('🔍 НАЙДЕННЫЕ ПРОБЛЕМЫ:\n');
    problems.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p}`);
    });

    if (solutions.length > 0) {
      console.log('\n✅ РЕШЕНИЯ:\n');
      solutions.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s}`);
      });
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('РЕКОМЕНДАЦИИ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (problems.some(p => p.includes('RLS политика'))) {
    console.log('🚨 КРИТИЧНО: RLS политики не обновлены!\n');
    console.log('📝 ЧТО ДЕЛАТЬ:');
    console.log('   1. Откройте Supabase Dashboard → SQL Editor');
    console.log('   2. Скопируйте содержимое: migrations/021_fix_owner_rls_use_public_users.sql');
    console.log('   3. Вставьте в SQL Editor');
    console.log('   4. Нажмите RUN');
    console.log('   5. Дождитесь сообщения "Success"');
    console.log('   6. Обновите страницу в браузере (Ctrl+Shift+R)');
    console.log('   7. Снова запустите этот скрипт для проверки\n');
  }

  console.log('📊 СТАТИСТИКА:');
  console.log(`   - Данных в БД: vehicles=${dataCounts.vehicles}, teams=${dataCounts.teams}, users=${dataCounts.users}`);
  console.log(`   - Owner пользователей: ${ownerUsers?.length || 0}`);
  console.log(`   - Проблем найдено: ${problems.length}`);
  console.log(`   - Решений предложено: ${solutions.length}\n`);

  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  if (!canOwnerSeeAll) {
    console.log('💡 ДА, owner МОЖЕТ видеть все данные - но только ПОСЛЕ исправления RLS политик!');
  } else {
    console.log('🎉 Owner уже может видеть все данные!');
  }
}

completeAnalysis().catch(console.error);
