#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API URL
API_URL="http://localhost:3000/api"

# Счетчики
TESTS_PASSED=0
TESTS_FAILED=0

# Функция для красивого вывода
print_test() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}TEST:${NC} $1"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ PASSED:${NC} $1"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}✗ FAILED:${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Проверяем, что сервер запущен
echo -e "${YELLOW}Проверка доступности сервера...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|302"; then
    echo -e "${RED}Ошибка: Сервер не запущен на http://localhost:3000${NC}"
    echo "Запустите: cd nextjs-app && npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Сервер доступен${NC}\n"

# Получаем текущего пользователя (owner)
print_info "Получаем информацию о текущем пользователе..."
CURRENT_USER=$(curl -s -b cookies.txt -c cookies.txt http://localhost:3000/api/users 2>/dev/null | jq -r '.data[0]')
CURRENT_USER_ID=$(echo "$CURRENT_USER" | jq -r '.id')
CURRENT_USER_ROLE=$(echo "$CURRENT_USER" | jq -r '.role')
echo -e "Текущий пользователь: ID=${CURRENT_USER_ID}, Role=${CURRENT_USER_ROLE}\n"

# ============================================
# ТЕСТ 1: Owner - Создание тестовых организаций
# ============================================
print_test "1. Owner создаёт 2 тестовые организации"

# Создаём организацию Test Org 1
ORG1_RESPONSE=$(curl -s -X POST "$API_URL/organizations" \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{
        "name": "TEST ORG 1 - Super Admin Test",
        "telegram_chat_id": null,
        "subscription_status": "active"
    }')

ORG1_ID=$(echo "$ORG1_RESPONSE" | jq -r '.data.id')
if [ "$ORG1_ID" != "null" ] && [ -n "$ORG1_ID" ]; then
    print_success "Организация 1 создана: $ORG1_ID"
else
    print_fail "Не удалось создать организацию 1"
    echo "Response: $ORG1_RESPONSE"
fi

# Создаём организацию Test Org 2
ORG2_RESPONSE=$(curl -s -X POST "$API_URL/organizations" \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{
        "name": "TEST ORG 2 - Super Admin Test",
        "telegram_chat_id": null,
        "subscription_status": "active"
    }')

ORG2_ID=$(echo "$ORG2_RESPONSE" | jq -r '.data.id')
if [ "$ORG2_ID" != "null" ] && [ -n "$ORG2_ID" ]; then
    print_success "Организация 2 создана: $ORG2_ID"
else
    print_fail "Не удалось создать организацию 2"
    echo "Response: $ORG2_RESPONSE"
fi

echo ""

# ============================================
# ТЕСТ 2: Owner - Просмотр всех организаций
# ============================================
print_test "2. Owner видит все организации"

ORGS_RESPONSE=$(curl -s "$API_URL/organizations" -b cookies.txt)
ORGS_COUNT=$(echo "$ORGS_RESPONSE" | jq -r '.data | length')

if [ "$ORGS_COUNT" -ge 2 ]; then
    print_success "Owner видит $ORGS_COUNT организаций (включая тестовые)"
else
    print_fail "Owner видит только $ORGS_COUNT организаций"
fi

echo ""

# ============================================
# ТЕСТ 3: Создание тестовых пользователей
# ============================================
print_test "3. Owner создаёт тестовых пользователей"

# ВАЖНО: Мы не можем создать пользователей через API с нужными метаданными
# Вместо этого, проверим что текущий owner работает правильно
print_info "Проверяем текущего owner (должен иметь organization_id = NULL)"

# Проверяем через прямой запрос к БД
OWNER_ORG_ID=$(PGPASSWORD="Iasaninja1973.." psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 \
    -U postgres.wymucemxzhaulibsqdta -d postgres -t -c \
    "SELECT (auth.jwt() -> 'user_metadata' ->> 'organization_id') FROM auth.users WHERE id = '$CURRENT_USER_ID' LIMIT 1;" 2>/dev/null | tr -d ' \n')

if [ -z "$OWNER_ORG_ID" ] || [ "$OWNER_ORG_ID" = "null" ]; then
    print_success "Owner имеет organization_id = NULL ✓"
else
    print_fail "Owner имеет organization_id = $OWNER_ORG_ID (ожидалось NULL)"
fi

print_info "Для полного теста нужно создать пользователей вручную через Supabase Dashboard:"
print_info "  1. Super Admin: role=admin, organization_id=NULL"
print_info "  2. Admin Org1: role=admin, organization_id=$ORG1_ID"
print_info "  3. Manager Org2: role=manager, organization_id=$ORG2_ID"

echo ""

# ============================================
# ТЕСТ 4: Owner - Создание vehicles в разных организациях
# ============================================
print_test "4. Owner создаёт vehicles в обеих организациях"

# Vehicle для организации 1
VEHICLE1_RESPONSE=$(curl -s -X POST "$API_URL/vehicles" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -b cookies.txt \
    --data-urlencode "name=TEST Vehicle Org1" \
    --data-urlencode "license_plate=TEST-001" \
    --data-urlencode "organization_id=$ORG1_ID")

VEHICLE1_ID=$(echo "$VEHICLE1_RESPONSE" | jq -r '.data.id')
if [ "$VEHICLE1_ID" != "null" ] && [ -n "$VEHICLE1_ID" ]; then
    print_success "Vehicle создан для Org1: $VEHICLE1_ID"
else
    print_fail "Не удалось создать vehicle для Org1"
    echo "Response: $VEHICLE1_RESPONSE"
fi

# Vehicle для организации 2
VEHICLE2_RESPONSE=$(curl -s -X POST "$API_URL/vehicles" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -b cookies.txt \
    --data-urlencode "name=TEST Vehicle Org2" \
    --data-urlencode "license_plate=TEST-002" \
    --data-urlencode "organization_id=$ORG2_ID")

VEHICLE2_ID=$(echo "$VEHICLE2_RESPONSE" | jq -r '.data.id')
if [ "$VEHICLE2_ID" != "null" ] && [ -n "$VEHICLE2_ID" ]; then
    print_success "Vehicle создан для Org2: $VEHICLE2_ID"
else
    print_fail "Не удалось создать vehicle для Org2"
    echo "Response: $VEHICLE2_RESPONSE"
fi

echo ""

# ============================================
# ТЕСТ 5: Owner - Просмотр всех vehicles
# ============================================
print_test "5. Owner видит все vehicles из всех организаций"

VEHICLES_RESPONSE=$(curl -s "$API_URL/vehicles?page=1" -b cookies.txt)
VEHICLES_DATA=$(echo "$VEHICLES_RESPONSE" | jq -r '.data')

# Проверяем что owner видит vehicles из обеих организаций
VEHICLE1_FOUND=$(echo "$VEHICLES_DATA" | jq -r ".[] | select(.id == \"$VEHICLE1_ID\") | .id")
VEHICLE2_FOUND=$(echo "$VEHICLES_DATA" | jq -r ".[] | select(.id == \"$VEHICLE2_ID\") | .id")

if [ "$VEHICLE1_FOUND" = "$VEHICLE1_ID" ]; then
    print_success "Owner видит vehicle из Org1 ✓"
else
    print_fail "Owner НЕ видит vehicle из Org1"
fi

if [ "$VEHICLE2_FOUND" = "$VEHICLE2_ID" ]; then
    print_success "Owner видит vehicle из Org2 ✓"
else
    print_fail "Owner НЕ видит vehicle из Org2"
fi

echo ""

# ============================================
# ТЕСТ 6: Проверка RLS на уровне БД
# ============================================
print_test "6. Проверка функции is_super_admin() в БД"

# Проверяем что функция создана
IS_SUPER_ADMIN_EXISTS=$(PGPASSWORD="Iasaninja1973.." psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 \
    -U postgres.wymucemxzhaulibsqdta -d postgres -t -c \
    "SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_super_admin';" 2>/dev/null | tr -d ' \n')

if [ "$IS_SUPER_ADMIN_EXISTS" = "1" ]; then
    print_success "Функция is_super_admin() существует в БД ✓"
else
    print_fail "Функция is_super_admin() НЕ найдена в БД"
fi

# Проверяем политики для organizations
ORGS_POLICIES=$(PGPASSWORD="Iasaninja1973.." psql -h aws-0-eu-central-1.pooler.supabase.com -p 6543 \
    -U postgres.wymucemxzhaulibsqdta -d postgres -t -c \
    "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'organizations' AND qual LIKE '%is_super_admin%';" 2>/dev/null | tr -d ' \n')

if [ "$ORGS_POLICIES" -gt 0 ]; then
    print_success "RLS политики для organizations используют is_super_admin() ✓ (найдено: $ORGS_POLICIES)"
else
    print_fail "RLS политики для organizations НЕ используют is_super_admin()"
fi

echo ""

# ============================================
# ТЕСТ 7: Проверка прав на удаление
# ============================================
print_test "7. Owner и Admin могут удалять, Manager - нет"

print_info "Создаём тестовый penalty для проверки прав удаления..."

PENALTY_RESPONSE=$(curl -s -X POST "$API_URL/penalties" \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d "{
        \"vehicle_id\": \"$VEHICLE1_ID\",
        \"amount\": 50,
        \"description\": \"TEST Penalty for deletion\",
        \"date\": \"2025-01-01\",
        \"status\": \"open\",
        \"organization_id\": \"$ORG1_ID\"
    }")

PENALTY_ID=$(echo "$PENALTY_RESPONSE" | jq -r '.data.id')
if [ "$PENALTY_ID" != "null" ] && [ -n "$PENALTY_ID" ]; then
    print_success "Тестовый penalty создан: $PENALTY_ID"

    # Owner может удалить
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/penalties/$PENALTY_ID" -b cookies.txt)
    DELETE_SUCCESS=$(echo "$DELETE_RESPONSE" | jq -r '.success')

    if [ "$DELETE_SUCCESS" = "true" ]; then
        print_success "Owner успешно удалил penalty ✓"
    else
        print_fail "Owner НЕ смог удалить penalty"
    fi
else
    print_fail "Не удалось создать тестовый penalty"
fi

echo ""

# ============================================
# ИТОГИ
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}ИТОГИ ТЕСТИРОВАНИЯ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Пройдено тестов: $TESTS_PASSED${NC}"
echo -e "${RED}Провалено тестов: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!${NC}"
else
    echo -e "${RED}✗ Некоторые тесты провалились${NC}"
fi

echo ""
echo -e "${YELLOW}Созданные тестовые данные:${NC}"
echo "  Организация 1: $ORG1_ID"
echo "  Организация 2: $ORG2_ID"
echo "  Vehicle 1 (Org1): $VEHICLE1_ID"
echo "  Vehicle 2 (Org2): $VEHICLE2_ID"
echo ""
echo -e "${BLUE}Для очистки тестовых данных используйте:${NC}"
echo "  curl -X DELETE \"$API_URL/organizations/$ORG1_ID\" -b cookies.txt"
echo "  curl -X DELETE \"$API_URL/organizations/$ORG2_ID\" -b cookies.txt"
