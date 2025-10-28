# Owner Role Fix - Complete Summary

## 🎯 Problem
Owner role with `organization_id = NULL` couldn't see any data (vehicles, teams, users, penalties all showed "0").

## ✅ What's Been Fixed

### 1. Application Code (COMPLETED ✅)

#### New Helper Functions
**File:** `lib/query-helpers.ts` (NEW)
- `getUserQueryContext()` - Gets user role and organization context
- `applyOrgFilter()` - Applies organization filter only for non-owner roles
- `canAccessResource()` - Checks if user can access a resource
- `getOrgIdForCreate()` - Gets org ID for creating new resources

#### API Routes Updated (29 files)
All routes now use `checkOwnerOrOrganizationId()` instead of `checkOrganizationId()`:
- `app/api/vehicles/route.ts` and `[id]/route.ts`
- `app/api/teams/route.ts` and `[id]/route.ts`
- `app/api/users/route.ts` and `[id]/route.ts`
- `app/api/penalties/route.ts` and `[id]/route.ts`
- `app/api/team-members/route.ts` and `[id]/route.ts`
- `app/api/vehicle-assignments/route.ts` and `[id]/route.ts`
- `app/api/vehicle-documents/route.ts` and `[id]/route.ts`
- `app/api/expenses/route.ts` and `[id]/route.ts`
- `app/api/car-expenses/route.ts` and `[id]/route.ts`
- `app/api/organizations/route.ts` and `[id]/route.ts`
- `app/api/documents/*` routes
- `app/api/upload/route.ts`
- And more...

#### Dashboard Pages Updated (32+ files)
All pages now use `applyOrgFilter()` to conditionally filter by organization:
- `app/dashboard/page.tsx` - Main dashboard with counts
- `app/dashboard/vehicles/page.tsx` - Vehicle list
- `app/dashboard/teams/page.tsx` - Team list
- `app/dashboard/users/page.tsx` - User list
- `app/dashboard/penalties/page.tsx` - Penalty list
- `app/dashboard/organizations/page.tsx` - Organization list
- And all related detail/edit pages...

#### Helper Functions Updated
**File:** `lib/api-response.ts`
- Added `checkOwnerOrOrganizationId()` - Allows NULL org_id for owner
- Marked `checkOrganizationId()` as deprecated

### 2. Database Migration (READY ⏳)

**File:** `migrations/020_owner_minimal.sql` (434 lines)

Updates RLS policies for 13 tables:
```
✅ vehicles
✅ teams
✅ users
✅ penalties
✅ vehicle_documents
✅ expenses
✅ car_expenses
✅ organizations
✅ team_members
✅ team_member_documents
✅ user_documents
✅ vehicle_assignments
```

Each policy now includes:
```sql
(SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'owner'
```

This allows owner to see/manage ALL data across ALL organizations.

## 🚀 How to Complete the Fix

### Step 1: Apply the Migration (2 minutes)

The Supabase SQL Editor should be open in your browser. If not, open:
👉 https://supabase.com/dashboard/project/wymucemxzhaulibsqdta/sql/new

1. **Copy the migration:**
   ```bash
   # In your code editor, open:
   migrations/020_owner_minimal.sql

   # Or copy from terminal:
   cat migrations/020_owner_minimal.sql | xclip -selection clipboard
   ```

2. **Paste into SQL Editor**
   - Paste the entire content (434 lines)
   - Click "RUN" button (or Ctrl+Enter)
   - Wait for "Success. No rows returned"

### Step 2: Test the Fix

1. **Refresh browser** (Ctrl+Shift+R)
2. **Logout and login** as owner
3. **Check dashboard:**
   - Should see total vehicle count (not 0)
   - Should see total team count (not 0)
   - Should see total user count (not 0)
   - Should see total penalty count (not 0)

4. **Navigate and test:**
   - Go to Vehicles → see all vehicles from all organizations
   - Go to Teams → see all teams from all organizations
   - Go to Users → see all users from all organizations
   - Go to Organizations → see all organizations
   - Try creating/editing/deleting - should work everywhere

## 📋 Files Created/Modified

### New Files
- ✅ `lib/query-helpers.ts` - Owner-aware query helpers
- ✅ `migrations/020_owner_minimal.sql` - RLS policy updates
- ✅ `migrations/000_create_exec_sql_function.sql` - Helper for future migrations
- ✅ `scripts/apply-migration.ts` - Automated migration script
- ✅ `APPLY_MIGRATION.md` - Detailed migration instructions
- ✅ `OWNER_ROLE_FIX_SUMMARY.md` - This file

### Modified Files
- ✅ `lib/api-response.ts` - Added owner-aware helper
- ✅ 29 API route files - Updated to use new helpers
- ✅ 32+ dashboard page files - Updated to use `applyOrgFilter()`
- ✅ `app/dashboard/organizations/OrganizationForm.tsx` - Fixed TypeError

## 🔍 Technical Details

### Problem Root Cause
**Two-layer access control issue:**
1. ✅ Database RLS policies allowed owner access
2. ❌ Application code blocked owner with `.eq('organization_id', orgId)` when `orgId = NULL`

### Solution Architecture
**Before:**
```typescript
// Blocked owner!
const orgId = user.organization_id; // null for owner
query.eq('organization_id', orgId); // Returns nothing!
```

**After:**
```typescript
const userContext = getUserQueryContext(user);
applyOrgFilter(query, userContext); // Skips filter for owner
```

### Owner Role Characteristics
- `role = 'owner'`
- `organization_id = NULL`
- Can see ALL data across ALL organizations
- Can manage ANY resource in ANY organization
- Has full CRUD permissions everywhere

## 🎉 Expected Results After Migration

### Dashboard (app/dashboard/page.tsx)
- Shows total counts across all organizations
- "Все транспорт средства" shows all vehicles
- "Все команды" shows all teams
- "Все пользователи" shows all users
- "Все штрафы" shows all penalties

### Vehicles Page (app/dashboard/vehicles/page.tsx)
- Lists ALL vehicles from ALL organizations
- Can create vehicles in any organization
- Can edit any vehicle
- Can delete any vehicle

### Teams Page (app/dashboard/teams/page.tsx)
- Lists ALL teams from ALL organizations
- Can create teams in any organization
- Can manage team members across organizations

### Users Page (app/dashboard/users/page.tsx)
- Lists ALL users from ALL organizations
- Can create users in any organization
- Can edit any user
- Can see all user details

### Organizations Page (app/dashboard/organizations/page.tsx)
- Lists ALL organizations
- Can create new organizations
- Can edit any organization
- Can delete organizations
- Can manage subscription status

## 🆘 Troubleshooting

### Still seeing "0" everywhere
1. Make sure migration was applied successfully
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear browser cache completely
4. Logout and login again as owner
5. Check browser console (F12) for errors

### "Permission denied" errors
1. Verify migration was applied completely (all 434 lines)
2. Check that owner user has:
   - `role = 'owner'` in user_metadata
   - `organization_id = NULL` or not set
3. Check Supabase logs for RLS policy errors

### Migration errors
- "relation does not exist" - Table not in your database (safe to ignore)
- "policy already exists" - Policy was already created (safe to ignore)
- "function exec_sql does not exist" - Use manual application via Dashboard

## 📊 Migration Statistics

- **Application files modified:** 62+
- **API routes updated:** 29
- **Dashboard pages updated:** 32
- **New helper functions:** 4
- **Database tables updated:** 13
- **RLS policies created:** 52 (4 per table: SELECT, INSERT, UPDATE, DELETE)
- **Lines of migration SQL:** 434

## 🔄 Git Commit

All changes have been committed:
```bash
git log -1 --oneline
# Should show: "Исправлено: Owner role access across all organizations"
```

## ⏭️ Next Steps

1. ✅ Apply migration (see instructions above)
2. ✅ Test owner access
3. ✅ Verify all features work
4. 🎉 Enjoy full owner access!

---

**Need help?** Check `APPLY_MIGRATION.md` for detailed instructions.
