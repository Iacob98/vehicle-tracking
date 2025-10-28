# How to Apply Migration 020 - Owner Role Fix

## The Problem
Your owner role with `organization_id = NULL` cannot see any data because:
- ✅ Application code is fixed (all 29 API routes + 32 pages updated)
- ❌ Database RLS policies are NOT updated yet (this migration fixes it)

## Quick Fix - Apply Migration Now

### Option 1: Supabase Dashboard (RECOMMENDED - 2 minutes)

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/wymucemxzhaulibsqdta/sql/new
   - Or: Supabase Dashboard → SQL Editor → New Query

2. **Copy the migration SQL:**
   - Open file: `migrations/020_owner_minimal.sql`
   - Select all (Ctrl+A) and copy (Ctrl+C)

3. **Paste and Run:**
   - Paste into the SQL Editor
   - Click "RUN" button (or press Ctrl+Enter)
   - Wait for "Success. No rows returned" message

4. **Verify:**
   - Refresh your browser
   - Login as owner
   - You should now see ALL vehicles, teams, users across ALL organizations

### Option 2: Create exec_sql Function First (for automated migrations)

If you want to run migrations from Node.js scripts in the future:

1. **Open Supabase SQL Editor:**
   - https://supabase.com/dashboard/project/wymucemxzhaulibsqdta/sql/new

2. **Copy and run this first:**
   ```sql
   CREATE OR REPLACE FUNCTION public.exec_sql(query text)
   RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     EXECUTE query;
   END;
   $$;

   GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
   GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
   ```

3. **Then run the migration script:**
   ```bash
   npx tsx scripts/apply-migration.ts
   ```

### Option 3: Use psql directly (if you have database password)

```bash
psql "postgresql://postgres.[project-ref]:[YOUR-DB-PASSWORD]@db.wymucemxzhaulibsqdta.supabase.co:5432/postgres" -f migrations/020_owner_minimal.sql
```

## What This Migration Does

Updates RLS (Row Level Security) policies for 13 tables:
- `vehicles`, `teams`, `users`, `penalties`
- `vehicle_documents`, `expenses`, `car_expenses`
- `organizations`, `team_members`, `team_member_documents`
- `user_documents`, `vehicle_assignments`

**Each policy adds this check:**
```sql
(SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
```

This allows owner role to:
- ✅ See ALL data across ALL organizations
- ✅ Create/update/delete in ANY organization
- ✅ Manage all vehicles, teams, users, penalties

## After Applying

1. **Clear browser cache** (or hard refresh: Ctrl+Shift+R)
2. **Logout and login again** as owner
3. **Dashboard should show:**
   - Total vehicles count (not just 0)
   - Total teams count
   - Total users count
   - Total penalties count
4. **Test access:**
   - Navigate to Vehicles page → see all vehicles
   - Navigate to Teams page → see all teams
   - Navigate to Users page → see all users
   - Navigate to Organizations page → see all organizations

## Troubleshooting

### "Permission denied" errors
- Make sure you ran the ENTIRE migration (all 434 lines)
- Check that you're logged in as owner role

### Still seeing "0" everywhere
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache completely
- Logout and login again
- Check browser console for errors

### "relation does not exist" errors
- The migration only includes tables that exist in your database
- If you see this error, the table was already excluded from the migration

## Need Help?

If you still have issues after applying the migration:
1. Check browser console for errors (F12 → Console tab)
2. Check Supabase logs (Dashboard → Logs → Postgres)
3. Verify owner user has `role = 'owner'` and `organization_id = NULL`
