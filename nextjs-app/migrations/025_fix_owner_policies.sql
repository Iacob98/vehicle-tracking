-- Migration 025: Исправление RLS политик для роли owner
--
-- ПРОБЛЕМА:
-- 1. get_user_organization_id() возвращает только JWT данные, что для owner = NULL
-- 2. При INSERT owner не может создавать записи для организаций, потому что
--    проверка "organization_id = NULL" проваливается
-- 3. Нужно изменить логику: owner обходит проверку organization_id полностью
--
-- РЕШЕНИЕ:
-- Изменить функцию get_user_organization_id() чтобы она брала данные из users таблицы
-- И упростить логику политик: owner всегда может выполнять операции

-- =============================================
-- Исправляем helper функцию для organization_id
-- =============================================
DROP FUNCTION IF EXISTS public.get_user_organization_id() CASCADE;

CREATE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
    (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );
$$;

-- =============================================
-- VEHICLES - исправленные политики
-- =============================================
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- TEAMS
-- =============================================
DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "teams_insert" ON teams;
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- USERS
-- =============================================
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND (organization_id = get_user_organization_id() OR id = auth.uid())
  )
);

DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- PENALTIES
-- =============================================
DROP POLICY IF EXISTS "penalties_select" ON penalties;
CREATE POLICY "penalties_select" ON penalties FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "penalties_insert" ON penalties;
CREATE POLICY "penalties_insert" ON penalties FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "penalties_update" ON penalties;
CREATE POLICY "penalties_update" ON penalties FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "penalties_delete" ON penalties;
CREATE POLICY "penalties_delete" ON penalties FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- VEHICLE_DOCUMENTS
-- =============================================
DROP POLICY IF EXISTS "vehicle_documents_select" ON vehicle_documents;
CREATE POLICY "vehicle_documents_select" ON vehicle_documents FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "vehicle_documents_insert" ON vehicle_documents;
CREATE POLICY "vehicle_documents_insert" ON vehicle_documents FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicle_documents_update" ON vehicle_documents;
CREATE POLICY "vehicle_documents_update" ON vehicle_documents FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicle_documents_delete" ON vehicle_documents;
CREATE POLICY "vehicle_documents_delete" ON vehicle_documents FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- EXPENSES
-- =============================================
DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- CAR_EXPENSES
-- =============================================
DROP POLICY IF EXISTS "car_expenses_select" ON car_expenses;
CREATE POLICY "car_expenses_select" ON car_expenses FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "car_expenses_insert" ON car_expenses;
CREATE POLICY "car_expenses_insert" ON car_expenses FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager', 'driver')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "car_expenses_update" ON car_expenses;
CREATE POLICY "car_expenses_update" ON car_expenses FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "car_expenses_delete" ON car_expenses;
CREATE POLICY "car_expenses_delete" ON car_expenses FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- ORGANIZATIONS
-- =============================================
DROP POLICY IF EXISTS "organizations_select" ON organizations;
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (
  get_user_role() = 'owner'
  OR
  (
    get_user_role() = 'admin'
    AND id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "organizations_insert" ON organizations;
CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (
  get_user_role() = 'owner'
);

DROP POLICY IF EXISTS "organizations_update" ON organizations;
CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (
  get_user_role() = 'owner'
  OR
  (
    get_user_role() = 'admin'
    AND id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "organizations_delete" ON organizations;
CREATE POLICY "organizations_delete" ON organizations FOR DELETE USING (
  get_user_role() = 'owner'
);

-- =============================================
-- TEAM_MEMBERS
-- =============================================
DROP POLICY IF EXISTS "team_members_select" ON team_members;
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "team_members_update" ON team_members;
CREATE POLICY "team_members_update" ON team_members FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "team_members_delete" ON team_members;
CREATE POLICY "team_members_delete" ON team_members FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- TEAM_MEMBER_DOCUMENTS
-- =============================================
DROP POLICY IF EXISTS "team_member_documents_select" ON team_member_documents;
CREATE POLICY "team_member_documents_select" ON team_member_documents FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "team_member_documents_insert" ON team_member_documents;
CREATE POLICY "team_member_documents_insert" ON team_member_documents FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "team_member_documents_update" ON team_member_documents;
CREATE POLICY "team_member_documents_update" ON team_member_documents FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "team_member_documents_delete" ON team_member_documents;
CREATE POLICY "team_member_documents_delete" ON team_member_documents FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- USER_DOCUMENTS
-- =============================================
DROP POLICY IF EXISTS "user_documents_select" ON user_documents;
CREATE POLICY "user_documents_select" ON user_documents FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "user_documents_insert" ON user_documents;
CREATE POLICY "user_documents_insert" ON user_documents FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "user_documents_update" ON user_documents;
CREATE POLICY "user_documents_update" ON user_documents FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "user_documents_delete" ON user_documents;
CREATE POLICY "user_documents_delete" ON user_documents FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);

-- =============================================
-- VEHICLE_ASSIGNMENTS
-- =============================================
DROP POLICY IF EXISTS "vehicle_assignments_select" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_select" ON vehicle_assignments FOR SELECT USING (
  get_user_role() = 'owner'
  OR organization_id = get_user_organization_id()
);

DROP POLICY IF EXISTS "vehicle_assignments_insert" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_insert" ON vehicle_assignments FOR INSERT WITH CHECK (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicle_assignments_update" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_update" ON vehicle_assignments FOR UPDATE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() IN ('admin', 'manager')
    AND organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "vehicle_assignments_delete" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_delete" ON vehicle_assignments FOR DELETE USING (
  (get_user_role() = 'owner')
  OR
  (
    get_user_role() = 'admin'
    AND organization_id = get_user_organization_id()
  )
);
