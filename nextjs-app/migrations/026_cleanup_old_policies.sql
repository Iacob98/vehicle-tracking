-- Migration 026: Очистка старых RLS политик
--
-- Удаляем все старые политики с суффиксом "_policy", которые ссылаются на user_metadata
-- Новые политики без суффикса "_policy" уже созданы в миграции 025

-- VEHICLES
DROP POLICY IF EXISTS "vehicles_select_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_policy" ON vehicles;

-- CAR_EXPENSES
DROP POLICY IF EXISTS "car_expenses_select_policy" ON car_expenses;
DROP POLICY IF EXISTS "car_expenses_insert_policy" ON car_expenses;
DROP POLICY IF EXISTS "car_expenses_update_policy" ON car_expenses;
DROP POLICY IF EXISTS "car_expenses_delete_policy" ON car_expenses;

-- VEHICLE_DOCUMENTS
DROP POLICY IF EXISTS "Users can view documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can insert documents for their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can update documents from their organization" ON vehicle_documents;
DROP POLICY IF EXISTS "Users can delete documents from their organization" ON vehicle_documents;

-- PENALTIES
DROP POLICY IF EXISTS "penalties_all" ON penalties;

-- MAINTENANCES (если есть)
DROP POLICY IF EXISTS "maintenances_all" ON maintenances;

-- TEAM_MEMBERS
DROP POLICY IF EXISTS "team_members_all" ON team_members;

-- RENTAL_CONTRACTS (если есть)
DROP POLICY IF EXISTS "rental_contracts_all" ON rental_contracts;

-- EXPENSES
DROP POLICY IF EXISTS "expenses_all" ON expenses;

-- TEAMS (если есть старые политики)
DROP POLICY IF EXISTS "teams_all" ON teams;

-- USERS (если есть старые политики)
DROP POLICY IF EXISTS "users_all" ON users;

-- ORGANIZATIONS
DROP POLICY IF EXISTS "org_select" ON organizations;
DROP POLICY IF EXISTS "org_select_policy" ON organizations;
DROP POLICY IF EXISTS "org_insert_policy" ON organizations;
DROP POLICY IF EXISTS "org_update_policy" ON organizations;
DROP POLICY IF EXISTS "org_delete_policy" ON organizations;
