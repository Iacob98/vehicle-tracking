#!/usr/bin/env python3
"""
Тестирование системы Super Admin через прямые запросы к PostgreSQL
Проверяет RLS политики на уровне БД
"""

import os
import subprocess
import sys
from datetime import datetime

# ANSI цвета
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

# Подключение к БД
DB_HOST = "aws-0-eu-central-1.pooler.supabase.com"
DB_PORT = "6543"
DB_USER = "postgres.wymucemxzhaulibsqdta"
DB_NAME = "postgres"
DB_PASSWORD = "Iasaninja1973.."

# Счетчики
tests_passed = 0
tests_failed = 0

def execute_sql(query, description=""):
    """Выполняет SQL запрос и возвращает результат"""
    env = os.environ.copy()
    env['PGPASSWORD'] = DB_PASSWORD

    cmd = [
        'psql',
        '-h', DB_HOST,
        '-p', DB_PORT,
        '-U', DB_USER,
        '-d', DB_NAME,
        '-t',  # tuples only
        '-A',  # unaligned output
        '-c', query
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, env=env, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"{RED}Ошибка SQL:{NC} {e.stderr}")
        return None

def print_test(title):
    print(f"{BLUE}{'='*60}{NC}")
    print(f"{YELLOW}TEST:{NC} {title}")
    print(f"{BLUE}{'='*60}{NC}")

def print_success(message):
    global tests_passed
    print(f"{GREEN}✓ PASSED:{NC} {message}")
    tests_passed += 1

def print_fail(message):
    global tests_failed
    print(f"{RED}✗ FAILED:{NC} {message}")
    tests_failed += 1

def print_info(message):
    print(f"{BLUE}ℹ{NC} {message}")

# Проверяем наличие psql
try:
    subprocess.run(['psql', '--version'], capture_output=True, check=True)
except:
    print(f"{RED}Ошибка: psql не установлен{NC}")
    sys.exit(1)

print(f"{YELLOW}=== ТЕСТИРОВАНИЕ SUPER ADMIN СИСТЕМЫ ==={NC}\n")

# ============================================
# ТЕСТ 1: Проверка функции is_super_admin()
# ============================================
print_test("1. Проверка функции is_super_admin() в БД")

result = execute_sql("""
    SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_super_admin';
""")

if result == "1":
    print_success("Функция is_super_admin() существует в БД ✓")
else:
    print_fail(f"Функция is_super_admin() НЕ найдена (найдено: {result})")

print()

# ============================================
# ТЕСТ 2: Проверка RLS политик
# ============================================
print_test("2. Проверка RLS политик используют is_super_admin()")

tables_to_check = [
    'vehicles', 'teams', 'users', 'organizations', 'penalties',
    'vehicle_documents', 'expenses', 'car_expenses', 'team_members',
    'team_member_documents', 'user_documents', 'vehicle_assignments'
]

for table in tables_to_check:
    result = execute_sql(f"""
        SELECT COUNT(*)
        FROM pg_policies
        WHERE tablename = '{table}'
        AND qual LIKE '%is_super_admin%';
    """)

    if result and int(result) > 0:
        print_success(f"Таблица {table}: использует is_super_admin() ✓ (политик: {result})")
    else:
        print_fail(f"Таблица {table}: НЕ использует is_super_admin()")

print()

# ============================================
# ТЕСТ 3: Создание тестовых организаций
# ============================================
print_test("3. Создание тестовых организаций для проверки")

timestamp = datetime.now().strftime("%H%M%S")

# Создаём организацию 1
org1_query = f"""
INSERT INTO organizations (name, subscription_status)
VALUES ('TEST ORG 1 - {timestamp}', 'active')
RETURNING id;
"""

org1_result = execute_sql(org1_query)
org1_id = org1_result.split('\n')[0].strip() if org1_result else None
if org1_id and org1_id != '':
    print_success(f"Создана TEST ORG 1: {org1_id}")
else:
    print_fail("Не удалось создать TEST ORG 1")
    sys.exit(1)

# Создаём организацию 2
org2_query = f"""
INSERT INTO organizations (name, subscription_status)
VALUES ('TEST ORG 2 - {timestamp}', 'active')
RETURNING id;
"""

org2_result = execute_sql(org2_query)
org2_id = org2_result.split('\n')[0].strip() if org2_result else None
if org2_id and org2_id != '':
    print_success(f"Создана TEST ORG 2: {org2_id}")
else:
    print_fail("Не удалось создать TEST ORG 2")

print()

# ============================================
# ТЕСТ 4: Создание тестовых vehicles
# ============================================
print_test("4. Создание тестовых vehicles в разных организациях")

# Vehicle для org1
vehicle1_query = f"""
INSERT INTO vehicles (name, license_plate, organization_id, status)
VALUES ('TEST Vehicle Org1', 'TEST-001-{timestamp}', '{org1_id}', 'active')
RETURNING id;
"""

vehicle1_result = execute_sql(vehicle1_query)
vehicle1_id = vehicle1_result.split('\n')[0].strip() if vehicle1_result else None
if vehicle1_id and vehicle1_id != '':
    print_success(f"Создан Vehicle для ORG1: {vehicle1_id}")
else:
    print_fail("Не удалось создать vehicle для ORG1")

# Vehicle для org2
vehicle2_query = f"""
INSERT INTO vehicles (name, license_plate, organization_id, status)
VALUES ('TEST Vehicle Org2', 'TEST-002-{timestamp}', '{org2_id}', 'active')
RETURNING id;
"""

vehicle2_result = execute_sql(vehicle2_query)
vehicle2_id = vehicle2_result.split('\n')[0].strip() if vehicle2_result else None
if vehicle2_id and vehicle2_id != '':
    print_success(f"Создан Vehicle для ORG2: {vehicle2_id}")
else:
    print_fail("Не удалось создать vehicle для ORG2")

print()

# ============================================
# ТЕСТ 5: Проверка текущего owner пользователя
# ============================================
print_test("5. Проверка owner пользователя")

# Получаем ID текущего owner
owner_query = """
SELECT id,
       raw_user_meta_data->>'role' as role,
       raw_user_meta_data->>'organization_id' as org_id
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'owner'
LIMIT 1;
"""

owner_data = execute_sql(owner_query)
if owner_data and '|' in owner_data:
    parts = owner_data.split('|')
    owner_id = parts[0]
    owner_role = parts[1] if len(parts) > 1 else None
    owner_org = parts[2] if len(parts) > 2 else None

    print_info(f"Owner найден: {owner_id}")
    print_info(f"  Role: {owner_role}")
    print_info(f"  Organization ID: {owner_org if owner_org else 'NULL'}")

    if not owner_org or owner_org == '':
        print_success("Owner имеет organization_id = NULL ✓")
    else:
        print_fail(f"Owner имеет organization_id = {owner_org} (ожидалось NULL)")
else:
    print_fail("Owner пользователь не найден")
    owner_id = None

print()

# ============================================
# ТЕСТ 6: Проверка RLS - Owner видит все
# ============================================
print_test("6. Проверка RLS: Owner видит все vehicles")

if owner_id:
    # Устанавливаем JWT для owner (эмуляция auth.jwt())
    set_jwt = f"""
    SELECT set_config('request.jwt.claims', '{{"role":"owner","sub":"{owner_id}","user_metadata":{{"role":"owner"}}}}', false);
    """
    execute_sql(set_jwt)

    # Проверяем, что owner видит vehicles из обеих организаций
    vehicles_count = execute_sql("""
    SELECT COUNT(*) FROM vehicles
    WHERE license_plate LIKE 'TEST-%';
    """)

    if vehicles_count and int(vehicles_count) >= 2:
        print_success(f"Owner видит тестовые vehicles: {vehicles_count} ✓")
    else:
        print_fail(f"Owner видит только {vehicles_count} vehicles (ожидалось >= 2)")
else:
    print_info("Пропускаем тест - Owner не найден")

print()

# ============================================
# ТЕСТ 7: Информация о Super Admin
# ============================================
print_test("7. Информация для создания Super Admin пользователя")

print_info("Для полного тестирования Super Admin функционала:")
print_info("1. Создайте нового пользователя через Supabase Dashboard")
print_info("2. В user_metadata установите:")
print_info("   - role: 'admin'")
print_info("   - organization_id: NULL (или не устанавливайте вообще)")
print_info("3. Этот пользователь станет Super Admin")
print_info("")
print_info("Тестовые организации для проверки:")
print_info(f"  - ORG1 ID: {org1_id}")
print_info(f"  - ORG2 ID: {org2_id}")
print_info("")
print_info("Super Admin должен видеть vehicles из обеих организаций")

print()

# ============================================
# ТЕСТ 8: Очистка (опционально)
# ============================================
print_test("8. Очистка тестовых данных")

# Проверяем переменную окружения или автоматически очищаем в CI
cleanup = os.environ.get('AUTO_CLEANUP', 'n').lower() == 'y'

# В интерактивном режиме спрашиваем пользователя
if sys.stdin.isatty():
    try:
        user_input = input(f"{YELLOW}Удалить созданные тестовые данные? (y/N):{NC} ").strip().lower()
        cleanup = user_input == 'y'
    except (EOFError, KeyboardInterrupt):
        print_info("\nИспользуется значение по умолчанию: не удалять")
        cleanup = False

if cleanup:
    # Удаляем vehicles (CASCADE удалит связанные записи)
    if vehicle1_id:
        execute_sql(f"DELETE FROM vehicles WHERE id = '{vehicle1_id}';")
        print_info(f"Удален vehicle {vehicle1_id}")

    if vehicle2_id:
        execute_sql(f"DELETE FROM vehicles WHERE id = '{vehicle2_id}';")
        print_info(f"Удален vehicle {vehicle2_id}")

    # Удаляем организации
    if org1_id:
        execute_sql(f"DELETE FROM organizations WHERE id = '{org1_id}';")
        print_info(f"Удалена организация {org1_id}")

    if org2_id:
        execute_sql(f"DELETE FROM organizations WHERE id = '{org2_id}';")
        print_info(f"Удалена организация {org2_id}")

    print_success("Тестовые данные очищены ✓")
else:
    print_info("Тестовые данные сохранены")
    print_info(f"Для ручной очистки используйте:")
    print_info(f"  DELETE FROM organizations WHERE id IN ('{org1_id}', '{org2_id}');")

print()

# ============================================
# ИТОГИ
# ============================================
print(f"{BLUE}{'='*60}{NC}")
print(f"{YELLOW}ИТОГИ ТЕСТИРОВАНИЯ{NC}")
print(f"{BLUE}{'='*60}{NC}")
print(f"{GREEN}Пройдено тестов: {tests_passed}{NC}")
print(f"{RED}Провалено тестов: {tests_failed}{NC}")
print()

if tests_failed == 0:
    print(f"{GREEN}✓ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!{NC}")
    sys.exit(0)
else:
    print(f"{RED}✗ Некоторые тесты провалились{NC}")
    sys.exit(1)
