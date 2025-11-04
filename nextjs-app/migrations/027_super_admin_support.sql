-- Migration 027: Поддержка Super Admin (owner ИЛИ admin с NULL organization_id)
--
-- ЦЕЛЬ: Дать возможность admin с organization_id = NULL видеть все организации
--
-- РЕШЕНИЕ:
-- 1. Создать helper функцию is_super_admin() которая возвращает true для:
--    - role = 'owner'
--    - role = 'admin' AND organization_id IS NULL
-- 2. Обновить все RLS политики чтобы использовать is_super_admin() вместо get_user_role() = 'owner'

-- =============================================
-- Helper Function: is_super_admin()
-- =============================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (
    -- Owner всегда super admin
    get_user_role() = 'owner'
    OR
    -- Admin с NULL organization_id - тоже super admin
    (
      get_user_role() = 'admin'
      AND get_user_organization_id() IS NULL
    )
  );
$$;

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: VEHICLES
-- =============================================

DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: TEAMS
-- =============================================

DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "teams_insert" ON teams;
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: USERS
-- =============================================

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND (organization_id = get_user_organization_id() OR id = auth.uid())
  )
);

DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: ORGANIZATIONS
-- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Super admin видит ВСЕ организации
-- =============================================

DROP POLICY IF EXISTS "organizations_select" ON organizations;
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (
  -- Super admin (owner ИЛИ admin с NULL org_id) видит ВСЕ организации
  is_super_admin()
  OR
  -- Обычный admin видит только свою организацию
  (
    get_user_role() = 'admin'
    AND id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "organizations_insert" ON organizations;
CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (
  is_super_admin()
);

DROP POLICY IF EXISTS "organizations_update" ON organizations;
CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "organizations_delete" ON organizations;
CREATE POLICY "organizations_delete" ON organizations FOR DELETE USING (
  is_super_admin()
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: PENALTIES
-- =============================================

DROP POLICY IF EXISTS "penalties_select" ON penalties;
CREATE POLICY "penalties_select" ON penalties FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "penalties_insert" ON penalties;
CREATE POLICY "penalties_insert" ON penalties FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "penalties_update" ON penalties;
CREATE POLICY "penalties_update" ON penalties FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "penalties_delete" ON penalties;
CREATE POLICY "penalties_delete" ON penalties FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: VEHICLE_DOCUMENTS
-- =============================================

DROP POLICY IF EXISTS "vehicle_documents_select" ON vehicle_documents;
CREATE POLICY "vehicle_documents_select" ON vehicle_documents FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "vehicle_documents_insert" ON vehicle_documents;
CREATE POLICY "vehicle_documents_insert" ON vehicle_documents FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicle_documents_update" ON vehicle_documents;
CREATE POLICY "vehicle_documents_update" ON vehicle_documents FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicle_documents_delete" ON vehicle_documents;
CREATE POLICY "vehicle_documents_delete" ON vehicle_documents FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: EXPENSES
-- =============================================

DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: CAR_EXPENSES
-- =============================================

DROP POLICY IF EXISTS "car_expenses_select" ON car_expenses;
CREATE POLICY "car_expenses_select" ON car_expenses FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "car_expenses_insert" ON car_expenses;
CREATE POLICY "car_expenses_insert" ON car_expenses FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "car_expenses_update" ON car_expenses;
CREATE POLICY "car_expenses_update" ON car_expenses FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "car_expenses_delete" ON car_expenses;
CREATE POLICY "car_expenses_delete" ON car_expenses FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: TEAM_MEMBERS
-- =============================================

DROP POLICY IF EXISTS "team_members_select" ON team_members;
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "team_members_update" ON team_members;
CREATE POLICY "team_members_update" ON team_members FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "team_members_delete" ON team_members;
CREATE POLICY "team_members_delete" ON team_members FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: TEAM_MEMBER_DOCUMENTS
-- =============================================

DROP POLICY IF EXISTS "team_member_documents_select" ON team_member_documents;
CREATE POLICY "team_member_documents_select" ON team_member_documents FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "team_member_documents_insert" ON team_member_documents;
CREATE POLICY "team_member_documents_insert" ON team_member_documents FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "team_member_documents_update" ON team_member_documents;
CREATE POLICY "team_member_documents_update" ON team_member_documents FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "team_member_documents_delete" ON team_member_documents;
CREATE POLICY "team_member_documents_delete" ON team_member_documents FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: USER_DOCUMENTS
-- =============================================

DROP POLICY IF EXISTS "user_documents_select" ON user_documents;
CREATE POLICY "user_documents_select" ON user_documents FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "user_documents_insert" ON user_documents;
CREATE POLICY "user_documents_insert" ON user_documents FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "user_documents_update" ON user_documents;
CREATE POLICY "user_documents_update" ON user_documents FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "user_documents_delete" ON user_documents;
CREATE POLICY "user_documents_delete" ON user_documents FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ОБНОВЛЕНИЕ RLS ПОЛИТИК: VEHICLE_ASSIGNMENTS
-- =============================================

DROP POLICY IF EXISTS "vehicle_assignments_select" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_select" ON vehicle_assignments FOR SELECT USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "vehicle_assignments_insert" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_insert" ON vehicle_assignments FOR INSERT WITH CHECK (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicle_assignments_update" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_update" ON vehicle_assignments FOR UPDATE USING (
  is_super_admin()
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicle_assignments_delete" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_delete" ON vehicle_assignments FOR DELETE USING (
  is_super_admin()
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);
