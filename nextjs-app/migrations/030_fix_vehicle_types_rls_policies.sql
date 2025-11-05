-- Migration 030: Fix vehicle types RLS policies to use public.users table
-- Problem: auth.jwt() -> 'role' doesn't contain user_metadata by default in Supabase
-- Solution: Join with public.users table to get the role

-- Drop existing policies
DROP POLICY IF EXISTS "vehicle_types_select_all" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_insert_policy" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_update_policy" ON vehicle_types;
DROP POLICY IF EXISTS "vehicle_types_delete_policy" ON vehicle_types;
DROP POLICY IF EXISTS "service_role_bypass_rls_vehicle_types" ON vehicle_types;

-- Create new RLS policies using public.users table
-- Everyone can view all vehicle types
CREATE POLICY "vehicle_types_select_all"
  ON vehicle_types
  FOR SELECT
  USING (true);

-- Only admin, manager, and owner can insert
CREATE POLICY "vehicle_types_insert_policy"
  ON vehicle_types
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'manager', 'owner')
    )
  );

-- Only admin, manager, and owner can update
CREATE POLICY "vehicle_types_update_policy"
  ON vehicle_types
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'manager', 'owner')
    )
  );

-- Only admin and owner can delete
CREATE POLICY "vehicle_types_delete_policy"
  ON vehicle_types
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'owner')
    )
  );

-- Service role bypass
CREATE POLICY "service_role_bypass_rls_vehicle_types"
  ON vehicle_types
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add index to improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_users_id_role ON public.users(id, role);

COMMENT ON POLICY "vehicle_types_insert_policy" ON vehicle_types IS 'Allow admin, manager, and owner to create universal vehicle types. Uses public.users table for role check.';
