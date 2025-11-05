# Authentication System Verification

## Status: ✅ FIXES APPLIED

This document outlines all fixes applied to the authentication system and provides verification steps.

---

## 🔧 Fixes Applied

### 1. API Client - Cookie Authentication (lib/api-client.ts)
**Problem:** All API requests returned 401 Unauthorized
**Fix:** Added `credentials: 'include'` to all 5 fetch functions

```typescript
credentials: 'include'  // Sends cookies with request
```

### 2. Organization Creation API (app/api/organizations/route.ts)
**Problem:** 500 error - invalid status code
**Fix:** Changed from `apiSuccess()` with string message to `apiCreated()`

```typescript
// Before: return apiSuccess(organization, 'Организация успешно создана');
// After:
return apiCreated(organization);
```

### 3. User Creation API Complete Rewrite (app/api/users/route.ts)
**Problem:** Users created with SHA-256 passwords couldn't log in (Supabase requires bcrypt)
**Fix:** Complete rewrite to use Supabase Admin API

**Key Changes:**
- Use `supabaseAdmin.auth.admin.createUser()` for proper bcrypt password hashing
- Set `email_confirm: true` to auto-confirm emails
- Properly set `user_metadata` with role, organization_id, etc.
- Handle both automatic and manual `public.users` record creation
- Better error handling for duplicate emails

### 4. Database Schema - password_hash Column
**Problem:** NOT NULL constraint on password_hash in public.users
**Fix:** Made column nullable (passwords stored only in auth.users)

```sql
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
```

### 5. Database - NULL Token Fields in auth.users
**Problem:** Supabase Auth doesn't support NULL in token fields (requires empty strings)
**Fix:** Updated all token fields to empty strings

```sql
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change = COALESCE(email_change, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change_token_new IS NULL
  OR email_change_token_current IS NULL
  OR reauthentication_token IS NULL
  OR email_change IS NULL;
```

### 6. User Role Restoration - iasa@gmail.com
**Problem:** User was incorrectly set to owner role
**Fix:** Restored to admin role with Test Company organization

```sql
-- Restore in public.users
UPDATE public.users
SET
  role = 'admin',
  organization_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE email = 'iasa@gmail.com';

-- Restore in auth.users metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(raw_user_meta_data, '{role}', '"admin"'),
  '{organization_id}', '"550e8400-e29b-41d4-a716-446655440000"'
)
WHERE email = 'iasa@gmail.com';

-- Update password to bcrypt hash
UPDATE auth.users
SET encrypted_password = crypt('Admin123', gen_salt('bf'))
WHERE email = 'iasa@gmail.com';
```

### 7. Super Admin Organization Selection
**Implementation:** Added organization selection dropdown to all resource creation forms

**Affected Forms:**
- [x] Organizations (app/dashboard/organizations/new/)
- [x] Teams (app/dashboard/teams/new/)
- [x] Penalties (app/dashboard/penalties/new/)
- [x] Car Expenses (app/dashboard/car-expenses/new/)
- [x] Maintenance (app/dashboard/maintenance/new/)
- [x] Users (app/dashboard/users/new/)

**Pattern:**
- Server component (page.tsx) loads organizations for Super Admin users
- Client component shows `<OrganizationSelect>` conditionally
- Form validation includes organization_id check for Super Admin
- API endpoints use `getOrgIdForCreate()` to determine final organization_id

### 8. User Schema Validation (lib/schemas/users.schema.ts)
**Problem:** Missing organization_id field causing validation errors
**Fix:** Added optional organization_id field

```typescript
export const createUserSchema = userSchema.extend({
  role: userRoleSchema,
  password: z.string().min(8)...,
  confirmPassword: z.string().min(1),
  organization_id: z.string().optional(),  // ADDED
}).refine(...)
```

---

## 🧪 Manual Verification Steps

### Test 1: Existing User Login (iasa@gmail.com)
**Purpose:** Verify authentication works for existing users

1. Open browser to http://localhost:3000/login
2. Enter credentials:
   - Email: `iasa@gmail.com`
   - Password: `Admin123`
3. Click "Войти"

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to /dashboard
- ✅ User metadata shows:
  - Role: admin
  - Organization: Test Company

**If login fails:**
- Check browser console for errors
- Check Next.js terminal output for API errors
- Verify user exists in database

---

### Test 2: Create New User via Dashboard
**Purpose:** Verify new users are created with proper bcrypt passwords

1. Login as iasa@gmail.com (admin of Test Company)
2. Navigate to /dashboard/users/new
3. Fill in form:
   - Email: `test-user-${Date.now()}@example.com`
   - Password: `TestPass123`
   - Confirm Password: `TestPass123`
   - First Name: `Test`
   - Last Name: `User`
   - Role: `viewer`
   - Phone: `+1234567890`
   - **Organization:** Test Company (should be pre-selected for admin)
4. Click "Создать пользователя"

**Expected Result:**
- ✅ User created successfully
- ✅ Success message shown
- ✅ Redirected to /dashboard/users

**Verification:**
- Check that new user appears in users list
- Note the email address for next test

---

### Test 3: Login with Newly Created User
**Purpose:** Verify newly created users can log in (bcrypt password works)

1. Sign out from current session
2. Go to /login
3. Enter new user credentials from Test 2
4. Click "Войти"

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to /dashboard
- ✅ Limited permissions visible (viewer role)

---

### Test 4: Super Admin Organization Selection
**Purpose:** Verify owner users can select organization when creating resources

**Prerequisites:** Create an owner user or use existing owner account

1. Login as owner user (organization_id = NULL)
2. Navigate to /dashboard/users/new
3. Check form:
   - ✅ Organization dropdown is visible
   - ✅ Dropdown shows all organizations
4. Select "Test Company" from dropdown
5. Fill in user details
6. Submit form

**Expected Result:**
- ✅ User created successfully
- ✅ User assigned to selected organization
- ✅ No validation errors about missing organization_id

**Test for other forms:**
- Repeat for /dashboard/teams/new
- Repeat for /dashboard/penalties/new
- Repeat for /dashboard/car-expenses/new
- Repeat for /dashboard/maintenance/new

---

### Test 5: Admin with Organization (No Dropdown)
**Purpose:** Verify non-Super Admin users don't see organization selection

1. Login as admin with organization (iasa@gmail.com)
2. Navigate to /dashboard/users/new
3. Check form:
   - ✅ Organization dropdown is NOT visible
   - ✅ Users created are automatically assigned to admin's organization

---

## 🔍 Database Verification Queries

### Check User Authentication Status
```sql
SELECT
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  (encrypted_password LIKE '$2a$%' OR encrypted_password LIKE '$2b$%' OR encrypted_password LIKE '$2y$%') as is_bcrypt_password,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'organization_id' as organization_id,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name
FROM auth.users
WHERE email = 'iasa@gmail.com';
```

**Expected:**
- email_confirmed: true
- is_bcrypt_password: true
- role: admin
- organization_id: 550e8400-e29b-41d4-a716-446655440000

### Check public.users Synchronization
```sql
SELECT
  u.id,
  u.email,
  u.role,
  u.organization_id,
  u.first_name,
  u.last_name,
  o.name as organization_name,
  u.password_hash IS NULL as password_hash_is_null
FROM public.users u
LEFT JOIN public.organizations o ON u.organization_id = o.id
WHERE u.email = 'iasa@gmail.com';
```

**Expected:**
- role: admin
- organization_id: 550e8400-e29b-41d4-a716-446655440000
- organization_name: Test Company
- password_hash_is_null: true (passwords only in auth.users)

### Check Token Fields
```sql
SELECT
  email,
  confirmation_token = '' as confirmation_token_empty,
  recovery_token = '' as recovery_token_empty,
  email_change_token_new = '' as email_change_token_new_empty,
  reauthentication_token = '' as reauthentication_token_empty
FROM auth.users
WHERE email = 'iasa@gmail.com';
```

**Expected:** All token fields should be empty strings (not NULL)

---

## 🎯 Test Scripts

### Test Login Script
```bash
cd /home/iacob/Work/FahrzeugVerfolgung/nextjs-app
npx tsx scripts/test-login.ts iasa@gmail.com Admin123
```

### Test User Creation Script
```bash
cd /home/iacob/Work/FahrzeugVerfolgung/nextjs-app
npx tsx scripts/test-create-user.ts
```

### Update User Password Script (if needed)
```bash
cd /home/iacob/Work/FahrzeugVerfolgung/nextjs-app
npx tsx scripts/update-user-password.ts <email> <new_password>
```

---

## 📋 Role Hierarchy Summary

### Owner (role='owner', organization_id=NULL)
- Full system access
- Can manage ALL organizations
- Can create/delete organizations
- Can create resources for any organization
- Sees organization selection dropdown in all forms

### Admin without Organization (role='admin', organization_id=NULL)
- Can manage resources across all organizations
- Cannot create/delete organizations
- Can create resources for any organization
- Sees organization selection dropdown in all forms

### Admin with Organization (role='admin', organization_id=<uuid>)
- Can manage resources within assigned organization only
- Cannot create/delete organizations
- Resources created are automatically assigned to their organization
- Does NOT see organization selection dropdown

### Manager (role='manager', organization_id=<uuid>)
- Limited permissions within assigned organization
- Cannot create users
- Can manage vehicles, expenses, maintenance, etc.

### Viewer (role='viewer', organization_id=<uuid>)
- Read-only access within assigned organization
- Cannot create or modify any resources

---

## ✅ Success Criteria

All systems are working correctly if:

1. ✅ iasa@gmail.com can log in with Admin123
2. ✅ New users created via dashboard can immediately log in
3. ✅ Owner users see organization selection dropdown
4. ✅ Admin users with organization_id don't see dropdown
5. ✅ All token fields in auth.users are empty strings (not NULL)
6. ✅ All passwords in auth.users are bcrypt hashes (start with $2a$, $2b$, or $2y$)
7. ✅ public.users has password_hash as NULL (passwords only in auth.users)
8. ✅ User metadata syncs between auth.users and public.users

---

## 🐛 Common Issues & Solutions

### Issue: "Database error querying schema" on login
**Cause:** NULL values in auth.users token fields
**Solution:** Run the token field UPDATE query above

### Issue: New users can't log in
**Cause:** Password created with SHA-256 instead of bcrypt
**Solution:** Use Supabase Admin API (`auth.admin.createUser()`) - already fixed in `/app/api/users/route.ts`

### Issue: "Organization ID обязателен" even when selected
**Cause:** Schema missing organization_id field or client-side validation issue
**Solution:** Already fixed in `lib/schemas/users.schema.ts` and UserForm.tsx

### Issue: 401 Unauthorized on API requests
**Cause:** Missing credentials in fetch requests
**Solution:** Already fixed - all fetch calls now include `credentials: 'include'`

### Issue: 500 error creating organization
**Cause:** apiSuccess() called with string instead of status code
**Solution:** Already fixed - using apiCreated() instead

---

## 📝 Files Modified

1. [lib/api-client.ts](nextjs-app/lib/api-client.ts) - Added credentials: 'include'
2. [app/api/organizations/route.ts](nextjs-app/app/api/organizations/route.ts) - Fixed apiSuccess call
3. [app/api/users/route.ts](nextjs-app/app/api/users/route.ts) - Complete rewrite
4. [lib/schemas/users.schema.ts](nextjs-app/lib/schemas/users.schema.ts) - Added organization_id
5. [app/dashboard/users/new/UserForm.tsx](nextjs-app/app/dashboard/users/new/UserForm.tsx) - Added org selection
6. [app/dashboard/teams/new/TeamForm.tsx](nextjs-app/app/dashboard/teams/new/TeamForm.tsx) - Added org selection
7. [app/dashboard/penalties/new/PenaltyForm.tsx](nextjs-app/app/dashboard/penalties/new/PenaltyForm.tsx) - Added org selection
8. [app/dashboard/car-expenses/new/CarExpenseForm.tsx](nextjs-app/app/dashboard/car-expenses/new/CarExpenseForm.tsx) - Added org selection
9. [app/dashboard/maintenance/new/MaintenanceForm.tsx](nextjs-app/app/dashboard/maintenance/new/MaintenanceForm.tsx) - Added org selection

## 🗄️ Database Changes

1. `ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;`
2. Updated all NULL token fields to empty strings in auth.users
3. Restored iasa@gmail.com to admin role with Test Company
4. Updated iasa@gmail.com password to bcrypt hash

---

**Last Updated:** 2025-11-05
**Status:** All fixes applied, ready for manual verification
