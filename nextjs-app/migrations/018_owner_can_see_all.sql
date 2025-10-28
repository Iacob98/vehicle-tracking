-- Migration 018: Owner может видеть все данные всех организаций
-- Owner role имеет organization_id = NULL и должен иметь полный доступ

-- =============================================
-- VEHICLES
-- =============================================
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT USING (
  -- Owner видит все
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR
  -- Остальные видят только свою организацию
  organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- TEAMS
-- =============================================
DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "teams_insert" ON teams;
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- PENALTIES
-- =============================================
DROP POLICY IF EXISTS "penalties_select" ON penalties;
CREATE POLICY "penalties_select" ON penalties FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "penalties_insert" ON penalties;
CREATE POLICY "penalties_insert" ON penalties FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "penalties_update" ON penalties;
CREATE POLICY "penalties_update" ON penalties FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "penalties_delete" ON penalties;
CREATE POLICY "penalties_delete" ON penalties FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- VEHICLE_DOCUMENTS
-- =============================================
DROP POLICY IF EXISTS "vehicle_documents_select" ON vehicle_documents;
CREATE POLICY "vehicle_documents_select" ON vehicle_documents FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "vehicle_documents_insert" ON vehicle_documents;
CREATE POLICY "vehicle_documents_insert" ON vehicle_documents FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "vehicle_documents_update" ON vehicle_documents;
CREATE POLICY "vehicle_documents_update" ON vehicle_documents FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "vehicle_documents_delete" ON vehicle_documents;
CREATE POLICY "vehicle_documents_delete" ON vehicle_documents FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- EXPENSES
-- =============================================
DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- MAINTENANCE_RECORDS
-- =============================================
DROP POLICY IF EXISTS "maintenance_records_select" ON maintenance_records;
CREATE POLICY "maintenance_records_select" ON maintenance_records FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "maintenance_records_insert" ON maintenance_records;
CREATE POLICY "maintenance_records_insert" ON maintenance_records FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "maintenance_records_update" ON maintenance_records;
CREATE POLICY "maintenance_records_update" ON maintenance_records FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "maintenance_records_delete" ON maintenance_records;
CREATE POLICY "maintenance_records_delete" ON maintenance_records FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- USERS (public.users table)
-- =============================================
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  OR id = auth.uid()  -- Users can see themselves
);

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
    OR id = auth.uid()  -- Users can update themselves
  )
);

DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- TEAM_MEMBERS
-- =============================================
DROP POLICY IF EXISTS "team_members_select" ON team_members;
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "team_members_update" ON team_members;
CREATE POLICY "team_members_update" ON team_members FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "team_members_delete" ON team_members;
CREATE POLICY "team_members_delete" ON team_members FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- TEAM_MEMBER_DOCUMENTS
-- =============================================
DROP POLICY IF EXISTS "team_member_documents_select" ON team_member_documents;
CREATE POLICY "team_member_documents_select" ON team_member_documents FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "team_member_documents_insert" ON team_member_documents;
CREATE POLICY "team_member_documents_insert" ON team_member_documents FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "team_member_documents_update" ON team_member_documents;
CREATE POLICY "team_member_documents_update" ON team_member_documents FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "team_member_documents_delete" ON team_member_documents;
CREATE POLICY "team_member_documents_delete" ON team_member_documents FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- VEHICLE_ASSIGNMENTS
-- =============================================
DROP POLICY IF EXISTS "vehicle_assignments_select" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_select" ON vehicle_assignments FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "vehicle_assignments_insert" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_insert" ON vehicle_assignments FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "vehicle_assignments_update" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_update" ON vehicle_assignments FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "vehicle_assignments_delete" ON vehicle_assignments;
CREATE POLICY "vehicle_assignments_delete" ON vehicle_assignments FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- CAR_EXPENSES
-- =============================================
DROP POLICY IF EXISTS "car_expenses_select" ON car_expenses;
CREATE POLICY "car_expenses_select" ON car_expenses FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "car_expenses_insert" ON car_expenses;
CREATE POLICY "car_expenses_insert" ON car_expenses FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager', 'driver')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "car_expenses_update" ON car_expenses;
CREATE POLICY "car_expenses_update" ON car_expenses FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "car_expenses_delete" ON car_expenses;
CREATE POLICY "car_expenses_delete" ON car_expenses FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- ORGANIZATIONS
-- =============================================
DROP POLICY IF EXISTS "organizations_select" ON organizations;
CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (
  -- Owner видит все организации
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR
  -- Admin видит только свою организацию
  (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "organizations_insert" ON organizations;
CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (
  -- Только owner может создавать организации
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
);

DROP POLICY IF EXISTS "organizations_update" ON organizations;
CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (
  -- Owner может редактировать любую организацию
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR
  -- Admin может редактировать только свою организацию
  (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    AND id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "organizations_delete" ON organizations;
CREATE POLICY "organizations_delete" ON organizations FOR DELETE USING (
  -- Только owner может удалять организации
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
);

-- =============================================
-- USER_DOCUMENTS
-- =============================================
DROP POLICY IF EXISTS "user_documents_select" ON user_documents;
CREATE POLICY "user_documents_select" ON user_documents FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "user_documents_insert" ON user_documents;
CREATE POLICY "user_documents_insert" ON user_documents FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "user_documents_update" ON user_documents;
CREATE POLICY "user_documents_update" ON user_documents FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "user_documents_delete" ON user_documents;
CREATE POLICY "user_documents_delete" ON user_documents FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

-- =============================================
-- VEHICLE_OWNERSHIP
-- =============================================
DROP POLICY IF EXISTS "vehicle_ownership_select" ON vehicle_ownership;
CREATE POLICY "vehicle_ownership_select" ON vehicle_ownership FOR SELECT USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
  OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
);

DROP POLICY IF EXISTS "vehicle_ownership_insert" ON vehicle_ownership;
CREATE POLICY "vehicle_ownership_insert" ON vehicle_ownership FOR INSERT WITH CHECK (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "vehicle_ownership_update" ON vehicle_ownership;
CREATE POLICY "vehicle_ownership_update" ON vehicle_ownership FOR UPDATE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin', 'manager')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);

DROP POLICY IF EXISTS "vehicle_ownership_delete" ON vehicle_ownership;
CREATE POLICY "vehicle_ownership_delete" ON vehicle_ownership FOR DELETE USING (
  (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('owner', 'admin')
  AND (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
    OR organization_id::text = (auth.jwt() -> 'user_metadata')::json->>'organization_id'
  )
);
