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
