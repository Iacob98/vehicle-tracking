-- First, we need to create the exec_sql helper function
-- This function allows executing arbitrary SQL from the service role
-- Run this FIRST in Supabase Dashboard SQL Editor before running other migrations

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- Grant execute permission to authenticated users (will be restricted by service role)
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.exec_sql IS 'Helper function to execute SQL statements from Node.js scripts using service role';
