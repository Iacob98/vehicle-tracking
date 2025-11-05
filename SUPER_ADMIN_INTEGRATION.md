# Super Admin Integration - Complete Implementation

## 📋 Overview

The Super Admin feature allows users with `owner` role or `admin` role without organization (organization_id = NULL) to select which organization to create resources for. This enables centralized management of multi-tenant data.

---

## 🎯 Definition of Super Admin

```typescript
function isSuperAdmin(user: User): boolean {
  return user.role === 'owner' || (user.role === 'admin' && user.organization_id === null);
}
```

**Super Admin Users:**
1. **Owner** - role='owner', organization_id=NULL
2. **Admin without Organization** - role='admin', organization_id=NULL

**Non-Super Admin Users:**
- **Admin with Organization** - role='admin', organization_id=<uuid>
- **Manager** - role='manager', organization_id=<uuid>
- **Viewer** - role='viewer', organization_id=<uuid>
- **Driver** - role='driver', organization_id=<uuid>

---

## ✅ Integration Status by Resource

### Fully Integrated Resources

#### 1. Organizations (app/dashboard/organizations/new/)
- [x] Server component loads organizations
- [x] Client component shows OrganizationSelect
- [x] API endpoint handles organization selection
- [x] Schema includes organization_id validation

**Files:**
- [app/dashboard/organizations/new/page.tsx](nextjs-app/app/dashboard/organizations/new/page.tsx)
- [app/dashboard/organizations/new/OrganizationForm.tsx](nextjs-app/app/dashboard/organizations/new/OrganizationForm.tsx)
- [app/api/organizations/route.ts](nextjs-app/app/api/organizations/route.ts)

#### 2. Teams (app/dashboard/teams/new/)
- [x] Server component loads organizations
- [x] Client component shows OrganizationSelect
- [x] Form validation includes organization_id
- [x] API endpoint uses getOrgIdForCreate()

**Files:**
- [app/dashboard/teams/new/page.tsx](nextjs-app/app/dashboard/teams/new/page.tsx)
- [app/dashboard/teams/new/TeamForm.tsx](nextjs-app/app/dashboard/teams/new/TeamForm.tsx)
- [app/api/teams/route.ts](nextjs-app/app/api/teams/route.ts)

#### 3. Penalties (app/dashboard/penalties/new/)
- [x] Server component loads organizations
- [x] Client component shows OrganizationSelect
- [x] Form validation includes organization_id
- [x] API endpoint uses getOrgIdForCreate()

**Files:**
- [app/dashboard/penalties/new/page.tsx](nextjs-app/app/dashboard/penalties/new/page.tsx)
- [app/dashboard/penalties/new/PenaltyForm.tsx](nextjs-app/app/dashboard/penalties/new/PenaltyForm.tsx)
- [app/api/penalties/route.ts](nextjs-app/app/api/penalties/route.ts)

#### 4. Car Expenses (app/dashboard/car-expenses/new/)
- [x] Server component loads organizations
- [x] Client component shows OrganizationSelect
- [x] Form validation includes organization_id
- [x] API endpoint uses getOrgIdForCreate()

**Files:**
- [app/dashboard/car-expenses/new/page.tsx](nextjs-app/app/dashboard/car-expenses/new/page.tsx)
- [app/dashboard/car-expenses/new/CarExpenseForm.tsx](nextjs-app/app/dashboard/car-expenses/new/CarExpenseForm.tsx)
- [app/api/car-expenses/route.ts](nextjs-app/app/api/car-expenses/route.ts)

#### 5. Maintenance (app/dashboard/maintenance/new/)
- [x] Server component loads organizations
- [x] Client component shows OrganizationSelect
- [x] Form validation includes organization_id
- [x] API endpoint uses getOrgIdForCreate()

**Files:**
- [app/dashboard/maintenance/new/page.tsx](nextjs-app/app/dashboard/maintenance/new/page.tsx)
- [app/dashboard/maintenance/new/MaintenanceForm.tsx](nextjs-app/app/dashboard/maintenance/new/MaintenanceForm.tsx)
- [app/api/maintenance/route.ts](nextjs-app/app/api/maintenance/route.ts)

#### 6. Users (app/dashboard/users/new/)
- [x] Server component loads organizations
- [x] Client component shows OrganizationSelect
- [x] Schema includes organization_id field
- [x] Client-side validation for Super Admin
- [x] API endpoint uses getOrgIdForCreate()

**Files:**
- [app/dashboard/users/new/page.tsx](nextjs-app/app/dashboard/users/new/page.tsx)
- [app/dashboard/users/new/UserForm.tsx](nextjs-app/app/dashboard/users/new/UserForm.tsx)
- [app/api/users/route.ts](nextjs-app/app/api/users/route.ts)
- [lib/schemas/users.schema.ts](nextjs-app/lib/schemas/users.schema.ts)

---

## 🏗️ Implementation Pattern

This pattern is consistently applied across all integrated resources.

### Server Component (page.tsx)

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/api-response';

export default async function NewResourcePage() {
  const supabase = await createServerClient();
  const currentUser = await getCurrentUser();
  const isSuperAdminUser = isSuperAdmin(currentUser);

  // Load organizations for Super Admin
  let organizations = [];
  if (isSuperAdminUser) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    organizations = data || [];
  }

  return (
    <ResourceForm
      currentUser={currentUser}
      organizations={organizations}
    />
  );
}
```

### Client Component (Form.tsx)

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OrganizationSelect } from '@/components/ui/organization-select';

// Inline type definitions (avoid importing from server-only modules)
type UserRole = 'owner' | 'admin' | 'manager' | 'viewer' | 'driver';

interface User {
  id: string;
  email: string;
  role: UserRole;
  organization_id: string | null;
}

interface Organization {
  id: string;
  name: string;
}

interface ResourceFormProps {
  currentUser: User;
  organizations: Organization[];
}

function isSuperAdmin(user: User): boolean {
  return user.role === 'owner' || (user.role === 'admin' && user.organization_id === null);
}

export function ResourceForm({ currentUser, organizations }: ResourceFormProps) {
  const showOrgSelect = isSuperAdmin(currentUser);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      organization_id: undefined,
      // ... other fields
    },
  });

  const selectedOrgId = watch('organization_id');

  const onSubmit = async (data: FormData) => {
    // Client-side validation for Super Admin
    if (showOrgSelect && !data.organization_id) {
      setError('organization_id', {
        type: 'manual',
        message: 'Organization ID обязателен',
      });
      return;
    }

    // Prepare submission data
    const submitData: any = {
      // ... copy all required fields
    };

    // Add organization_id if Super Admin selected one
    if (showOrgSelect && data.organization_id) {
      submitData.organization_id = data.organization_id;
    }

    await post(submitData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Organization Selection for Super Admin */}
      {showOrgSelect && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Организация *
          </label>
          <OrganizationSelect
            organizations={organizations}
            value={selectedOrgId}
            onChange={(value) => setValue('organization_id', value)}
            placeholder="Выберите организацию"
          />
          {errors.organization_id && (
            <p className="text-red-500 text-sm mt-1">
              {errors.organization_id.message}
            </p>
          )}
        </div>
      )}

      {/* Rest of form fields */}
    </form>
  );
}
```

### Schema (schemas/*.schema.ts)

```typescript
export const createResourceSchema = z.object({
  organization_id: z.string().optional(),
  // ... other fields
});
```

### API Endpoint (app/api/*/route.ts)

```typescript
import {
  checkAuthentication,
  checkOwnerOrOrganizationId,
  apiBadRequest,
} from '@/lib/api-response';
import { getUserQueryContext, getOrgIdForCreate } from '@/lib/query-helpers';

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check authentication
    const authError = checkAuthentication(user);
    if (authError) return authError;

    // Check organization_id with owner support
    const { orgId, isSuperAdmin, error: orgError } = checkOwnerOrOrganizationId(user);
    if (orgError) return orgError;

    // Get request body
    const body = await request.json();

    // Determine final organization_id
    const userContext = getUserQueryContext(user);
    const finalOrgId = getOrgIdForCreate(userContext, body.organization_id);

    // Validate organization_id is present
    if (!finalOrgId) {
      return apiBadRequest('Organization ID обязателен');
    }

    // Create resource with finalOrgId
    const { data, error } = await supabase
      .from('resources')
      .insert({
        organization_id: finalOrgId,
        // ... other fields
      })
      .select()
      .single();

    if (error) throw error;

    return apiCreated(data);
  } catch (error: any) {
    return apiErrorFromUnknown(error, { context: 'POST /api/resources' });
  }
}
```

---

## 🔧 Helper Functions

### lib/query-helpers.ts

```typescript
export function getUserQueryContext(user: User | null) {
  if (!user) return null;

  const role = (user.user_metadata?.role || 'viewer') as UserRole;
  const orgId = user.user_metadata?.organization_id || null;

  return {
    userId: user.id,
    role,
    organizationId: orgId,
    isSuperAdmin: role === 'owner' || (role === 'admin' && orgId === null),
  };
}

export function getOrgIdForCreate(
  userContext: UserQueryContext | null,
  providedOrgId?: string
): string | null {
  if (!userContext) return null;

  // Super Admin can specify organization
  if (userContext.isSuperAdmin) {
    return providedOrgId || null;
  }

  // Regular users use their organization
  return userContext.organizationId;
}
```

### lib/api-response.ts

```typescript
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;

  const role = (user.user_metadata?.role || 'viewer') as UserRole;
  const orgId = user.user_metadata?.organization_id || null;

  return role === 'owner' || (role === 'admin' && orgId === null);
}

export function checkOwnerOrOrganizationId(user: User | null) {
  if (!user) {
    return { orgId: null, isSuperAdmin: false, error: apiUnauthorized() };
  }

  const role = (user.user_metadata?.role || 'viewer') as UserRole;
  const orgId = user.user_metadata?.organization_id || null;
  const isSuperAdminUser = role === 'owner' || (role === 'admin' && orgId === null);

  // Super Admin users don't need organization_id
  if (isSuperAdminUser) {
    return { orgId: null, isSuperAdmin: true, error: null };
  }

  // Regular users must have organization_id
  if (!orgId) {
    return { orgId: null, isSuperAdmin: false, error: apiForbidden('Organization ID required') };
  }

  return { orgId, isSuperAdmin: false, error: null };
}
```

---

## 🎨 UI Component

### components/ui/organization-select.tsx

```typescript
'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Organization {
  id: string;
  name: string;
}

interface OrganizationSelectProps {
  organizations: Organization[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function OrganizationSelect({
  organizations,
  value,
  onChange,
  placeholder = 'Выберите организацию',
}: OrganizationSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Owner User Creates Resource

**Setup:**
- User: role='owner', organization_id=NULL
- Navigate to any resource creation form

**Expected Behavior:**
1. Organization dropdown is visible
2. Dropdown shows all organizations
3. User selects "Test Company"
4. Submits form
5. Resource is created with organization_id = "550e8400-e29b-41d4-a716-446655440000"

### Scenario 2: Admin without Organization Creates Resource

**Setup:**
- User: role='admin', organization_id=NULL
- Navigate to any resource creation form

**Expected Behavior:**
1. Organization dropdown is visible
2. Dropdown shows all organizations
3. User selects organization
4. Submits form
5. Resource is created with selected organization_id

### Scenario 3: Admin with Organization Creates Resource

**Setup:**
- User: role='admin', organization_id="550e8400-e29b-41d4-a716-446655440000" (Test Company)
- Navigate to any resource creation form

**Expected Behavior:**
1. Organization dropdown is NOT visible
2. User fills in other form fields
3. Submits form
4. Resource is created with organization_id = "550e8400-e29b-41d4-a716-446655440000" (automatically)

### Scenario 4: Super Admin Submits without Selecting Organization

**Setup:**
- User: role='owner', organization_id=NULL
- Navigate to resource creation form
- DO NOT select organization

**Expected Behavior:**
1. Form validation fails
2. Error message: "Organization ID обязателен"
3. Form is not submitted

---

## 🚫 Validation Rules

### Client-Side Validation

```typescript
if (showOrgSelect && !data.organization_id) {
  setError('organization_id', {
    type: 'manual',
    message: 'Organization ID обязателен для создания ресурса',
  });
  return;
}
```

### Server-Side Validation

```typescript
const finalOrgId = getOrgIdForCreate(userContext, body.organization_id);

if (!finalOrgId) {
  return apiBadRequest('Organization ID обязателен');
}
```

---

## 📊 Database Constraints

### Owner Role Constraint

```sql
ALTER TABLE public.users
ADD CONSTRAINT owner_no_org_check
CHECK (
  (role != 'owner') OR
  (role = 'owner' AND organization_id IS NULL)
);
```

**Purpose:** Ensures owner users ALWAYS have organization_id = NULL

---

## 🔐 Row Level Security (RLS)

RLS policies are already configured to support Super Admin users:

```sql
-- Example: Users can access resources from their organization
-- OR if they are Super Admin (owner or admin without org)
CREATE POLICY "Users can access their organization's resources"
ON public.resources
FOR SELECT
USING (
  organization_id = (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid
  OR (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'owner'
    OR (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      AND (auth.jwt() -> 'user_metadata' ->> 'organization_id') IS NULL
    )
  )
);
```

---

## ✅ Checklist for New Resource Integration

When adding Super Admin support to a new resource, follow this checklist:

- [ ] **Server Component (page.tsx)**
  - [ ] Import `getCurrentUser` and `isSuperAdmin`
  - [ ] Check if user is Super Admin
  - [ ] Load organizations if Super Admin
  - [ ] Pass `currentUser` and `organizations` to client component

- [ ] **Client Component (Form.tsx)**
  - [ ] Add inline type definitions for User, Organization
  - [ ] Add inline `isSuperAdmin` function
  - [ ] Compute `showOrgSelect = isSuperAdmin(currentUser)`
  - [ ] Add `organization_id` to form default values
  - [ ] Add `OrganizationSelect` component conditionally
  - [ ] Add client-side validation for organization_id
  - [ ] Include organization_id in submission data

- [ ] **Schema (schemas/*.schema.ts)**
  - [ ] Add `organization_id: z.string().optional()`

- [ ] **API Endpoint (app/api/*/route.ts)**
  - [ ] Use `checkOwnerOrOrganizationId()` instead of checking orgId directly
  - [ ] Use `getUserQueryContext()` to get user context
  - [ ] Use `getOrgIdForCreate()` to determine final organization_id
  - [ ] Validate finalOrgId is not null
  - [ ] Use finalOrgId when creating resource

- [ ] **Testing**
  - [ ] Test as owner user (sees dropdown)
  - [ ] Test as admin without org (sees dropdown)
  - [ ] Test as admin with org (no dropdown)
  - [ ] Test validation when no org selected (Super Admin)
  - [ ] Test resource is created with correct organization_id

---

## 📝 Summary

The Super Admin integration is **COMPLETE** for all primary resources:

✅ Organizations
✅ Teams
✅ Penalties
✅ Car Expenses
✅ Maintenance
✅ Users

All resources follow the established pattern and include:
- Organization selection dropdown for Super Admin users
- Client and server-side validation
- Proper API handling with `getOrgIdForCreate()`
- Consistent UX across all forms

**Status:** Ready for production use
**Last Updated:** 2025-11-05
