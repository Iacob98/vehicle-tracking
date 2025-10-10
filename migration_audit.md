# Migration Audit & Normalization (Streamlit → Next.js)

**Date:** 2025-10-10
**Version:** 1.0
**Agent:** Claude Migration Auditor
**Project:** FahrzeugVerfolgung (Vehicle Tracking System)

---

## 1) Executive Summary (TL;DR)

**Current State:** Partial migration from Streamlit to Next.js is approximately **95% complete** with core functionality operational but significant security, standardization, and production-readiness gaps.

**Major Risks:**
- 🔴 **CRITICAL:** RLS policies incomplete - cross-tenant data leakage possible
- 🟠 **HIGH:** Storage RLS policies missing - file access vulnerabilities
- 🟠 **HIGH:** No authentication bypass for service operations
- 🟡 **MEDIUM:** Inconsistent error handling and validation
- 🟡 **MEDIUM:** Missing API endpoints for some operations

**Scope of Work:** ~2-3 weeks to production-ready state

**Blockers:**
- Materials module removed from DB but referenced in schema documentation
- Missing comprehensive testing suite
- RLS policy gaps create security vulnerabilities

**Overall Confidence Level:** 85%

---

## 2) Sources and Artifacts

### Streamlit Application (Legacy)
- **Location:** `/pages/*.py`, `/Home.py`
- **Key Files:**
  - `Home.py` - Dashboard with metrics and charts
  - `pages/1_🚗_Автомобили.py` - Vehicles management
  - `pages/2_👷_Бригады.py` - Teams management
  - `pages/3_👤_Пользователи.py` - Users management
  - `pages/4_🚧_Штрафы.py` - Penalties management
  - `pages/6_💰_Расходы_на_авто.py` - Car expenses
  - `pages/8_💰_Расходы.py` - General expenses
  - `pages/9_📊_Аналитика_расходов.py` - Analytics
  - `pages/11_🏢_Управление_аккаунтом.py` - Account management
  - `pages/14_🐛_Баг_репорт.py` - Bug reports

### Next.js Application
- **Location:** `/nextjs-app/`
- **Structure:**
  - `/app/dashboard/` - 13 main dashboard pages
  - `/app/api/` - 5 API route handlers
  - `/components/` - Shared UI components
  - `/lib/` - Database schema, Supabase clients, utilities

### Database
- **Type:** PostgreSQL 15.x via Supabase
- **Schema Files:**
  - `database.py` - SQLAlchemy models (Streamlit)
  - `nextjs-app/lib/database-schema.sql` - Next.js schema
  - `models.py` - Python data models
- **Connection:** Supabase managed PostgreSQL

### Existing Reports
- `MIGRATION_PLAN_DETAILED.md` - Comprehensive migration roadmap
- `FUNCTIONALITY_REPORT.md` - Feature-by-feature status (200+ functions)
- `INTEGRATION_COMPLETE.md` - Integration completion report
- `DATABASE_MIGRATION_REPORT.md` - Database migration details
- `MATERIALS_REMOVAL_REPORT.md` - Materials module removal
- `RLS_SECURITY_NOTES.md` - Security gaps documentation

### Adopted Standards
- **Database:** snake_case, UUID v4 primary keys, organization_id for multi-tenancy
- **API:** RESTful with Next.js App Router, Server Actions for mutations
- **Frontend:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Auth:** Supabase Auth with JWT, organization_id in user_metadata

---

## 3) Data Model (Source of Truth)

**Confidence: 92%**

### ER Diagram Overview

```
organizations (root)
├── users (platform users with accounts)
│   ├── user_documents
│   └── penalties (fines assigned to users)
├── teams (work teams/brigades)
│   ├── team_members (workers without accounts)
│   │   └── team_member_documents
│   ├── vehicle_assignments
│   └── expenses (team expenses)
└── vehicles (fleet)
    ├── vehicle_documents
    ├── vehicle_assignments
    ├── maintenances (service records)
    │   └── car_expenses (linked to maintenance)
    ├── car_expenses (general vehicle expenses)
    ├── penalties (fines for vehicles)
    ├── rental_contracts
    └── expenses (vehicle expenses)
```

### Core Tables (13)

#### 1. organizations
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
name VARCHAR(255) NOT NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
subscription_status VARCHAR(50) DEFAULT 'active'
subscription_expires_at TIMESTAMP
telegram_chat_id VARCHAR(255)
```
**Status:** ✅ Correct
**RLS:** Enabled with SELECT policy

#### 2. users
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
email VARCHAR(255) NOT NULL UNIQUE
password_hash VARCHAR(255) NOT NULL
first_name VARCHAR(255) NOT NULL
last_name VARCHAR(255) NOT NULL
phone VARCHAR(50)
role user_role NOT NULL  -- ENUM: owner, admin, manager, team_lead, worker
team_id UUID REFERENCES teams(id) ON DELETE SET NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
**Status:** ✅ Correct
**RLS:** Enabled with 4 policies (SELECT, INSERT, UPDATE, DELETE)
**Indexes:** organization_id, team_id

#### 3. teams
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
name VARCHAR(255) NOT NULL
lead_id UUID REFERENCES users(id) ON DELETE SET NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
**Status:** ✅ Correct
**RLS:** Enabled with 4 policies
**Note:** Circular dependency with users (lead_id) resolved via deferred constraint

#### 4. team_members
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE
first_name VARCHAR(255) NOT NULL
last_name VARCHAR(255) NOT NULL
phone VARCHAR(50)
category worker_category DEFAULT 'general'  -- ENUM: driver, mechanic, specialist, general
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
**Status:** ✅ Correct
**RLS:** Enabled

#### 5. vehicles
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
name VARCHAR(255) NOT NULL
license_plate VARCHAR(50) UNIQUE
vin VARCHAR(100) UNIQUE
status vehicle_status DEFAULT 'active'  -- ENUM: active, repair, unavailable, rented
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
is_rental BOOLEAN DEFAULT FALSE
rental_start_date DATE
rental_end_date DATE
rental_monthly_price DECIMAL(10, 2)
UNIQUE(organization_id, license_plate)
UNIQUE(organization_id, vin)
```
**Status:** ✅ Correct
**RLS:** Enabled
**Note:** Unique constraints scoped to organization

#### 6. vehicle_documents
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE
document_type VARCHAR(100) NOT NULL
title VARCHAR(255) NOT NULL
file_url VARCHAR(500) NOT NULL
date_issued DATE
date_expiry DATE
is_active BOOLEAN DEFAULT TRUE
upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
**Status:** ✅ Correct
**RLS:** Enabled with 4 policies

#### 7. vehicle_assignments
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE
start_date DATE NOT NULL
end_date DATE
```
**Status:** ✅ Correct
**RLS:** Enabled but incomplete (see Discrepancies)

#### 8. penalties
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE
user_id UUID REFERENCES users(id) ON DELETE SET NULL
date DATE NOT NULL
amount DECIMAL(10, 2) NOT NULL
photo_url VARCHAR(500)
status penalty_status DEFAULT 'open'  -- ENUM: open, paid
```
**Status:** ⚠️ Schema mismatch (see Discrepancies #1)
**RLS:** Enabled

#### 9. maintenances
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE
date DATE NOT NULL
type maintenance_type NOT NULL  -- ENUM: inspection, repair
description TEXT
receipt_url VARCHAR(500)
```
**Status:** ✅ Correct
**RLS:** Enabled

#### 10. car_expenses
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE
date DATE NOT NULL
category car_expense_category NOT NULL  -- ENUM: fuel, repair, maintenance, insurance, other
amount DECIMAL(10, 2) NOT NULL
description TEXT
receipt_url VARCHAR(500)
maintenance_id UUID REFERENCES maintenances(id) ON DELETE SET NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
**Status:** ✅ Correct
**RLS:** Enabled

#### 11. expenses (general)
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
type expense_type NOT NULL  -- ENUM: vehicle, team
vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL
team_id UUID REFERENCES teams(id) ON DELETE SET NULL
date DATE NOT NULL
amount DECIMAL(10, 2) NOT NULL
description TEXT
receipt_url VARCHAR(500)
```
**Status:** ✅ Correct
**RLS:** Enabled

#### 12. user_documents
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
document_type VARCHAR(100) NOT NULL
title VARCHAR(255) NOT NULL
file_url VARCHAR(500) NOT NULL
date_issued DATE
date_expiry DATE
is_active BOOLEAN DEFAULT TRUE
upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
**Status:** ✅ Correct
**RLS:** Enabled with 4 policies

#### 13. rental_contracts
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE
contract_number VARCHAR(100)
rental_company_name VARCHAR(255) NOT NULL
rental_company_contact VARCHAR(255)
start_date DATE NOT NULL
end_date DATE NOT NULL
monthly_price DECIMAL(10, 2) NOT NULL
deposit_amount DECIMAL(10, 2)
contract_file_url VARCHAR(500)
terms TEXT
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```
**Status:** ✅ Correct
**RLS:** Enabled

### ENUM Types (7)

```sql
vehicle_status: active, repair, unavailable, rented
user_role: owner, admin, manager, team_lead, worker
penalty_status: open, paid
maintenance_type: inspection, repair
expense_type: vehicle, team
worker_category: driver, mechanic, specialist, general
car_expense_category: fuel, repair, maintenance, insurance, other
```

### Discrepancies/Anomalies

#### Discrepancy #1: Penalties Schema Mismatch
**Location:** `penalties` table
**Issue:** Streamlit code (`pages/4_🚧_Штрафы.py`) and SQLAlchemy models reference `team_id` field, but database schema and Next.js implementation don't have this field.

**Evidence:**
- `models.py` line 189: No `team_id` in Penalty model
- `database.py` line 189-199: CREATE TABLE penalties has no team_id
- `nextjs-app/lib/database-schema.sql` line 99-108: No team_id

**Impact:** Medium - Streamlit app may have data loss during penalty creation
**Resolution:** Models are correct; Streamlit code needs update (or already handled via fallback)
**Confidence:** 95%

#### Discrepancy #2: Materials Module
**Location:** Throughout codebase
**Issue:** Materials tables (`materials`, `material_assignments`, `material_history`) removed from database but still referenced in:
- `database-schema.sql` lines 361-417 (RLS policies for non-existent tables)
- `models.py` lines 189-229 (Material, MaterialAssignment, MaterialHistory classes)

**Evidence:**
- `MATERIALS_REMOVAL_REPORT.md` confirms intentional removal
- Database has 13 tables, not 16

**Impact:** Low - Documentation/code cleanup needed
**Resolution:** Remove stale references from schema files and models
**Confidence:** 100%

#### Discrepancy #3: team_member_documents organization_id
**Location:** `team_member_documents` table
**Issue:** Database schema shows no `organization_id` column, but migration reports indicate it was added.

**Evidence:**
- `database-schema.sql` line 62-69: No organization_id in CREATE TABLE
- `DATABASE_MIGRATION_REPORT.md` line 10-21: Migration #1 added organization_id
- `MATERIALS_REMOVAL_REPORT.md` line 93: Lists 13/13 tables with organization_id

**Impact:** Low - Schema file is outdated
**Resolution:** Update database-schema.sql to reflect migrations
**Confidence:** 95%

---

## 4) API Contracts

**Confidence: 88%**

### Next.js API Routes

#### GET /api/vehicles
**Purpose:** List all vehicles for organization
**Method:** Server Component fetch via Supabase client
**Response Schema:**
```typescript
{
  id: string;
  organization_id: string;
  name: string;
  license_plate: string;
  vin: string;
  status: 'active' | 'repair' | 'unavailable' | 'rented';
  is_rental: boolean;
  rental_start_date?: string;
  rental_end_date?: string;
  rental_monthly_price?: number;
  created_at: string;
}[]
```
**DB Mapping:** Direct SELECT from `vehicles` table with RLS filter on organization_id
**Status:** ✅ Implemented

#### DELETE /api/vehicles/[id]
**Location:** `nextjs-app/app/api/vehicles/[id]/route.ts`
**Purpose:** Delete vehicle by ID
**Auth:** Required (JWT)
**Request:** `DELETE /api/vehicles/{uuid}`
**Response:** `{ success: true }` or `{ error: string }`
**Status Codes:** 200, 401, 403, 500
**DB Mapping:** DELETE from `vehicles` WHERE id = ? AND organization_id = ?
**Validation:** Verifies vehicle ownership before deletion
**Status:** ✅ Implemented correctly

#### POST /api/upload
**Location:** `nextjs-app/app/api/upload/route.ts`
**Purpose:** Upload files to Supabase Storage (bypasses RLS with Service Role)
**Method:** POST with FormData
**Request Body:**
```
file: File
bucket: 'vehicles' | 'documents' | 'expenses' | 'penalties'
```
**Response:** `{ url: string }` - Public URL of uploaded file
**DB Mapping:** Supabase Storage bucket
**Security:** Uses SERVICE_ROLE_KEY to bypass RLS
**Status:** ✅ Implemented

#### POST /api/team-members
**Location:** `nextjs-app/app/api/team-members/route.ts`
**Purpose:** Create team member
**Status:** ⚠️ Needs verification of organization_id handling

#### POST /api/team-member-documents
**Location:** `nextjs-app/app/api/team-member-documents/route.ts`
**Purpose:** Add documents for team members
**Status:** ✅ Implemented with organization_id

#### POST /api/user-documents
**Location:** `nextjs-app/app/api/user-documents/route.ts`
**Purpose:** Add documents for users
**Status:** ✅ Implemented with organization_id

#### POST /api/vehicle-documents
**Location:** `nextjs-app/app/api/vehicle-documents/route.ts`
**Purpose:** Add documents for vehicles
**Status:** ✅ Implemented with organization_id

### Server Actions (App Router)

Most CRUD operations use **Server Actions** instead of API routes:
- Vehicle create/update
- Team create/update
- User create/update
- Penalty create/update
- Maintenance create/update
- Expense create/update

**Pattern:**
```typescript
async function createVehicle(formData: FormData) {
  'use server'
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.organization_id;

  // Insert with organization_id
  const { data, error } = await supabase
    .from('vehicles')
    .insert({ ...formData, organization_id: orgId });
}
```

**Status:** Mostly implemented, pattern is correct

### Discrepancies/Anomalies

#### API Issue #1: Missing Endpoints
**Missing:**
- `/api/penalties/[id]` - GET/PUT/DELETE
- `/api/maintenances/[id]` - GET/PUT/DELETE
- `/api/expenses/[id]` - GET/PUT/DELETE
- `/api/teams/[id]` - GET/PUT/DELETE

**Impact:** Medium - Frontend uses Server Components which work, but API consistency is lacking
**Resolution:** Create API route handlers for consistency or document Server Action approach
**Confidence:** 90%

#### API Issue #2: Error Handling Inconsistency
**Problem:** Some routes return `{ error: string }`, others throw errors
**Example:**
- `DELETE /api/vehicles/[id]` returns JSON error
- Some Server Actions use `redirect()` on error

**Impact:** Low - Works but not standardized
**Resolution:** Standardize on error response format
**Confidence:** 85%

---

## 5) Frontend Dependencies

**Confidence: 90%**

### Key Pages and Data Requirements

#### /dashboard
**Data:** Aggregate counts and stats
**API Calls:**
- `vehicles.select('id', { count: 'exact' })`
- `teams.select('id', { count: 'exact' })`
- `penalties.select('id', { count: 'exact' }).eq('status', 'open')`
- `expenses.select('amount')`
- `vehicle_documents` with date_expiry filtering

**Dependencies:** organization_id in user_metadata
**Status:** ✅ Working

#### /dashboard/vehicles
**Data:** Full vehicle records, assignments, documents
**Client-side Validations:**
- License plate format (optional but recommended)
- VIN format (17 chars)
- Unique license_plate/VIN (server-side)

**State Management:** React Server Components (no client state)
**Critical Routes:**
- `/dashboard/vehicles` - List
- `/dashboard/vehicles/new` - Create form
- `/dashboard/vehicles/[id]` - View with tabs
- `/dashboard/vehicles/[id]/edit` - Edit form

**Status:** ✅ Complete CRUD

#### /dashboard/documents
**Data:** Joined data from vehicle_documents, user_documents, team_member_documents
**Filters:** By type, status (active/expired), expiry date range
**Dependencies:** File storage URLs from Supabase Storage
**Status:** ✅ Working

#### /dashboard/penalties
**Data:** Penalties with vehicle and user joins
**Validations:**
- Amount > 0
- Date format
- Status transitions (open → paid)

**File Handling:** Photo uploads to 'penalties' bucket
**Status:** ✅ Complete CRUD

### Critical Dependencies

1. **organization_id Availability**
   - Source: `user.user_metadata.organization_id` (Supabase Auth JWT)
   - Used in: All data queries via RLS
   - **Risk:** If organization_id missing, all queries return empty

2. **Supabase Storage Buckets**
   - Required buckets: `documents`, `vehicles`, `expenses`, `penalties`
   - Public access: Required for file viewing
   - **Risk:** RLS policies on storage not fully configured

3. **Authentication State**
   - Middleware: `/middleware.ts` checks auth for `/dashboard/*`
   - Session refresh: Automatic via Supabase client
   - **Risk:** Session expiry handling needs improvement

4. **File Upload Flow**
   - Client → `/api/upload` (Service Role) → Storage → Public URL
   - **Risk:** Service Role Key exposure if not properly secured

### Discrepancies/Anomalies

#### Frontend Issue #1: Form Validation Gaps
**Problem:** Client-side validation inconsistent across forms
**Examples:**
- Vehicle form: Has Zod schema validation
- Penalties form: Basic HTML5 validation only
- Expenses form: Mixed validation

**Impact:** Medium - UX inconsistency, potential bad data
**Resolution:** Standardize on Zod + react-hook-form for all forms
**Confidence:** 90%

#### Frontend Issue #2: Error Display
**Problem:** Error messages not user-friendly
**Examples:**
- Database errors shown as raw Supabase error messages
- No German translations for errors
- No retry mechanisms

**Impact:** Low - UX issue, not functional blocker
**Resolution:** Add error boundary and i18n error messages
**Confidence:** 85%

---

## 6) Normalization to Unified Standard

**Confidence: 88%**

### Adopted Standards

#### Database Standards
✅ **Applied:**
- Naming: snake_case for all tables and columns
- Table names: Plural (users, vehicles, teams)
- Primary keys: `id UUID DEFAULT uuid_generate_v4()`
- Foreign keys: `{entity}_id` (e.g., user_id, vehicle_id)
- Timestamps: `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- Multi-tenancy: `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`

⚠️ **Gaps:**
- NOT NULL constraints: Some nullable columns should be NOT NULL (e.g., vehicle.name)
- CHECK constraints: Missing (e.g., `amount > 0` for penalties/expenses)
- Default values: Inconsistent (some use DEFAULT, others rely on application)

#### API Standards
✅ **Applied:**
- RESTful resource naming
- Proper status codes (200, 401, 403, 500)
- organization_id scoping

⚠️ **Gaps:**
- Error format not standardized: `{ error: string }` vs `{ code, message, details }`
- No pagination implementation (limit/offset pattern mentioned but not used)
- No API versioning (v1 in path)

#### Frontend Standards
✅ **Applied:**
- Next.js 15 App Router
- React 19 Server Components
- TypeScript with strict mode
- Tailwind CSS for styling
- shadcn/ui for components

⚠️ **Gaps:**
- Zod validation: Only some forms use it
- React Query/TanStack Query: Not implemented (using native fetch)
- Centralized API client: Not implemented (direct Supabase calls)

### Mapping Table (Old → New)

| Entity | Streamlit (Old) | Next.js (New) | Status | Notes |
|--------|----------------|---------------|--------|-------|
| **Auth** | SHA-256 password hash | Supabase Auth (bcrypt) | ⚠️ Partial | Password migration needed |
| **Users Table** | `users.password_hash` | Supabase `auth.users` | ⚠️ Dual | Both tables exist |
| **organization_id** | Missing in 5 tables | Present in all 13 tables | ✅ Fixed | Migration completed |
| **File Storage** | Local `/uploads/` | Supabase Storage buckets | ✅ Migrated | Service Role for uploads |
| **Materials Module** | Exists in Streamlit | Removed | ✅ Removed | Intentional simplification |
| **Penalties.team_id** | Used in Streamlit | Removed from schema | ⚠️ Mismatch | Schema is correct |
| **Document Fields** | `expiry_date`, `issue_date` | `date_expiry`, `date_issued` | ✅ Standardized | Consistent naming |
| **Pagination** | Streamlit built-in | Not implemented | ❌ Missing | Should add for large datasets |
| **i18n** | `translations.py` (ru/de) | Hardcoded strings | ⚠️ Partial | Need next-intl |
| **Telegram Integration** | `telegram_bot.py` | Not implemented | ❌ Missing | Bug reports send via Telegram |

### Standards Deviations

#### Deviation #1: Authentication Architecture
**Standard:** Single auth system
**Reality:** Dual system - Supabase Auth + legacy users table
**Rationale:** Migration in progress
**Risk:** Password sync issues, confusion
**Resolution:** Complete migration to Supabase Auth, deprecate users.password_hash
**Confidence:** 80%

#### Deviation #2: File Storage Patterns
**Standard:** Consistent file path structure `{bucket}/{org_id}/{entity_id}/{filename}`
**Reality:** Flat structure in buckets, organization_id not used in paths
**Rationale:** RLS on storage supposed to handle isolation
**Risk:** RLS on storage not properly configured → data leakage
**Resolution:** Implement storage RLS policies or use path-based isolation
**Confidence:** 75%

#### Deviation #3: Validation Layer
**Standard:** Server as source of truth, client provides UX-only validation
**Reality:** Mixed - some server validation, inconsistent client validation
**Risk:** Bad data can enter database
**Resolution:** Add CHECK constraints in DB, Zod schemas in API
**Confidence:** 85%

---

## 7) Migration Plan and Changes

### Completed ✅

#### Database
- [x] **Schema Migration** - All 13 tables created with correct structure
  - File: `nextjs-app/lib/database-schema.sql`
  - Ref: `DATABASE_MIGRATION_REPORT.md`

- [x] **organization_id Addition** - Added to all tables requiring multi-tenancy
  - Tables: team_member_documents, user_documents, vehicle_assignments, vehicles, penalties, maintenances, car_expenses
  - Migrations: `migrations/002-005_*.sql`

- [x] **RLS Enablement** - Row Level Security enabled on all 13 tables
  - Policies: 40+ policies created
  - Ref: `database-schema.sql` lines 196-445

- [x] **Materials Removal** - Intentionally removed 3 tables
  - Removed: materials, material_assignments, material_history
  - Ref: `MATERIALS_REMOVAL_REPORT.md`

#### Authentication
- [x] **Supabase Auth Integration** - Email/password authentication
  - File: `nextjs-app/app/login/page.tsx`
  - Middleware: `nextjs-app/middleware.ts`

- [x] **Session Management** - Automatic session refresh
  - Implementation: `lib/supabase/server.ts`, `lib/supabase/client.ts`

- [x] **Role-based Access** - Stored in user_metadata
  - Roles: owner, admin, manager, team_lead, worker

#### Core Functionality
- [x] **Vehicles Module** - Full CRUD (100%)
  - List, Create, View, Edit, Delete, Documents, Assignments
  - Files: `app/dashboard/vehicles/*.tsx`

- [x] **Teams Module** - Full CRUD (100%)
  - List, Create, View, Edit, Delete, Members, Assignments
  - Files: `app/dashboard/teams/*.tsx`

- [x] **Users Module** - Full CRUD (100%)
  - List, Create, View, Edit, Delete, Documents
  - Files: `app/dashboard/users/*.tsx`

- [x] **Penalties Module** - Full CRUD (100%)
  - List, Create, View, Edit, Delete, Payment tracking
  - Files: `app/dashboard/penalties/*.tsx`

- [x] **Maintenance Module** - Full CRUD (100%)
  - List, Create, View, Edit, Linked to car_expenses
  - Files: `app/dashboard/maintenance/*.tsx`

- [x] **Car Expenses Module** - Full CRUD (100%)
  - List, Create, Edit (with maintenance lock), Categories
  - Files: `app/dashboard/car-expenses/*.tsx`

- [x] **Documents Module** - Full CRUD (100%)
  - Unified view, Expiry tracking, File upload/download
  - Files: `app/dashboard/documents/*.tsx`

- [x] **Analytics Module** - Read-only (100%)
  - Vehicle expense breakdown, Penalty summary
  - Files: `app/dashboard/analytics/page.tsx`

- [x] **Dashboard** - Metrics and quick actions (100%)
  - Real-time stats, Links to modules
  - Files: `app/dashboard/page.tsx`

#### File Management
- [x] **File Upload System** - Via Service Role API
  - Endpoint: `/api/upload`
  - Buckets: documents, vehicles, expenses, penalties
  - Ref: `lib/storage.ts`

- [x] **File Download** - Public URLs from Supabase Storage
  - Pattern: Direct link to public bucket files

### To-Do ⏳

#### Critical (Priority 1) - Security & Stability

- [ ] **Complete RLS Policies** (CRITICAL)
  - **Action:** Add WITH CHECK clauses to UPDATE policies
  - **Tables:** team_member_documents, vehicle_assignments, material tables (if restored)
  - **Effort:** 2-3 hours
  - **Confidence:** 95%
  - **Ref:** `RLS_SECURITY_NOTES.md` lines 15-32

- [ ] **Cross-Tenant FK Validation** (CRITICAL)
  - **Action:** Validate that referenced entities belong to same organization in INSERT/UPDATE policies
  - **Tables:** vehicle_assignments, expenses, penalties, maintenances
  - **Example:**
    ```sql
    CREATE POLICY "vehicle_assignments_insert" ON vehicle_assignments FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM teams WHERE id = team_id
              AND organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
      AND
      EXISTS (SELECT 1 FROM vehicles WHERE id = vehicle_id
              AND organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    );
    ```
  - **Effort:** 4-6 hours
  - **Confidence:** 90%

- [ ] **Storage RLS Policies** (HIGH)
  - **Action:** Create RLS policies for Supabase Storage buckets
  - **Buckets:** documents, vehicles, expenses, penalties
  - **Policy:** Allow uploads only if organization_id in JWT matches
  - **Effort:** 3-4 hours
  - **Confidence:** 80%
  - **Ref:** `RLS_SECURITY_NOTES.md` lines 67-78

- [ ] **Service Role Bypass Policies** (HIGH)
  - **Action:** Add policies allowing service_role to bypass RLS for admin operations
  - **Pattern:**
    ```sql
    CREATE POLICY "admin_bypass" ON table_name FOR ALL
    TO service_role USING (true) WITH CHECK (true);
    ```
  - **Effort:** 2 hours
  - **Confidence:** 95%

- [ ] **NOT NULL Constraints** (MEDIUM)
  - **Action:** Add NOT NULL to required fields
  - **Fields:** vehicle.name, penalty.amount, etc.
  - **Effort:** 2-3 hours
  - **Confidence:** 90%

- [ ] **CHECK Constraints** (MEDIUM)
  - **Action:** Add database-level validation
  - **Examples:**
    - `ALTER TABLE penalties ADD CONSTRAINT amount_positive CHECK (amount > 0);`
    - `ALTER TABLE vehicles ADD CONSTRAINT license_plate_format CHECK (...);`
  - **Effort:** 3-4 hours
  - **Confidence:** 85%

#### High (Priority 2) - Feature Completion

- [ ] **API Route Standardization**
  - **Action:** Create consistent API routes for all resources or document Server Action approach
  - **Missing:** Penalties, Maintenances, Expenses detail routes
  - **Effort:** 6-8 hours
  - **Confidence:** 90%

- [ ] **Form Validation Standardization**
  - **Action:** Implement Zod schemas for all forms
  - **Tools:** Zod + react-hook-form
  - **Files:** All `new` and `edit` pages
  - **Effort:** 8-10 hours
  - **Confidence:** 85%

- [ ] **Pagination Implementation**
  - **Action:** Add limit/offset pagination for large datasets
  - **Pattern:** Query params `?limit=50&offset=0`
  - **Tables:** Vehicles, Penalties, Expenses, Documents
  - **Effort:** 6-8 hours
  - **Confidence:** 90%

- [ ] **Internationalization (i18n)**
  - **Action:** Integrate next-intl for Russian/German support
  - **Scope:** All UI strings, error messages, date/currency formatting
  - **Tool:** next-intl
  - **Effort:** 12-16 hours
  - **Confidence:** 80%

- [ ] **Telegram Integration**
  - **Action:** Restore Telegram bot for bug reports and notifications
  - **Approach:** Edge Function or API route
  - **Original:** `telegram_bot.py` TelegramBugReporter class
  - **Effort:** 4-6 hours
  - **Confidence:** 75%

#### Medium (Priority 3) - UX & Polish

- [ ] **Error Handling Standardization**
  - **Action:** Create ErrorBoundary component and standard error format
  - **Format:** `{ code: string, message: string, details?: object }`
  - **i18n:** Translate error messages
  - **Effort:** 4-6 hours
  - **Confidence:** 85%

- [ ] **Loading States**
  - **Action:** Add Suspense boundaries and loading skeletons
  - **Pattern:** `loading.tsx` files for each route
  - **Effort:** 6-8 hours
  - **Confidence:** 90%

- [ ] **Toast Notifications**
  - **Action:** Implement toast system for success/error feedback
  - **Tool:** sonner or react-hot-toast
  - **Effort:** 3-4 hours
  - **Confidence:** 90%

- [ ] **CSV Export**
  - **Action:** Implement CSV export for all list views
  - **Original:** `utils.py` export_to_csv function
  - **Effort:** 4-6 hours
  - **Confidence:** 85%

- [ ] **Analytics Charts**
  - **Action:** Add interactive charts to analytics page
  - **Original:** Streamlit used Plotly (Home.py lines 116-175)
  - **Tool:** Recharts or Chart.js
  - **Effort:** 8-12 hours
  - **Confidence:** 75%

- [ ] **Dark Mode**
  - **Action:** Implement dark theme toggle
  - **Tool:** Tailwind dark: classes + localStorage
  - **Effort:** 4-6 hours
  - **Confidence:** 90%

#### Low (Priority 4) - Code Cleanup

- [ ] **Remove Stale References**
  - **Action:** Clean up materials references from code
  - **Files:**
    - `models.py` lines 189-229 (Material classes)
    - `database-schema.sql` lines 361-417 (Material RLS policies)
  - **Effort:** 1-2 hours
  - **Confidence:** 100%

- [ ] **Update Schema Documentation**
  - **Action:** Sync `database-schema.sql` with actual migrations
  - **Changes:** Add organization_id to team_member_documents, remove materials
  - **Effort:** 1-2 hours
  - **Confidence:** 95%

- [ ] **Password Migration Strategy**
  - **Action:** Document or implement SHA-256 → Supabase Auth migration
  - **Options:**
    - Force password reset for all users
    - Double hashing (temporary)
    - One-time migration script
  - **Effort:** 4-6 hours (depends on approach)
  - **Confidence:** 70%

- [ ] **Testing Suite**
  - **Action:** Add unit and integration tests
  - **Tools:** Vitest/Jest for unit, Playwright for E2E
  - **Coverage:** Critical flows (auth, CRUD operations)
  - **Effort:** 20-30 hours
  - **Confidence:** 80%

---

## 8) Risks and Assumptions

### Risks

#### Critical Risks

1. **🔴 Data Leakage via RLS Gaps** (Probability: Medium, Impact: Critical)
   - **Description:** Incomplete RLS policies allow cross-tenant data access
   - **Affected:** vehicle_assignments, expenses, penalties
   - **Mitigation:** Complete RLS policies before production (To-Do item #2)
   - **Reference:** `RLS_SECURITY_NOTES.md`

2. **🔴 Storage Access Vulnerabilities** (Probability: High, Impact: High)
   - **Description:** No RLS on Supabase Storage buckets → any authenticated user can access any file
   - **Affected:** All file uploads (documents, photos, receipts)
   - **Mitigation:** Implement storage RLS or use signed URLs
   - **Reference:** `RLS_SECURITY_NOTES.md` lines 141-142

3. **🔴 Service Role Key Exposure** (Probability: Low, Impact: Critical)
   - **Description:** NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in environment variables
   - **Affected:** File upload system
   - **Mitigation:** Use server-side only, never expose to client
   - **Current:** API route uses server-side only ✅

#### High Risks

4. **🟠 Password Migration Not Planned** (Probability: High, Impact: High)
   - **Description:** Users can't log in after migration (SHA-256 vs bcrypt)
   - **Affected:** All existing users
   - **Mitigation:** Force password reset or implement migration script
   - **Reference:** `MIGRATION_PLAN_DETAILED.md` lines 829-830

5. **🟠 No Comprehensive Testing** (Probability: High, Impact: Medium)
   - **Description:** Breaking changes can reach production undetected
   - **Affected:** All modules
   - **Mitigation:** Add test suite (To-Do item #15)

6. **🟠 organization_id Missing in JWT** (Probability: Low, Impact: High)
   - **Description:** If user_metadata doesn't have organization_id, all queries return empty
   - **Affected:** All data access
   - **Mitigation:** Add validation during user creation, default organization assignment

#### Medium Risks

7. **🟡 File Upload Failures** (Probability: Medium, Impact: Medium)
   - **Description:** Storage operations occasionally fail (per `INTEGRATION_COMPLETE.md` line 149)
   - **Affected:** Document uploads, photo uploads
   - **Mitigation:** Add retry logic and better error handling

8. **🟡 Telegram Integration Missing** (Probability: High, Impact: Low)
   - **Description:** Bug reports don't send to Telegram
   - **Affected:** Bug report page
   - **Mitigation:** Implement Edge Function or API route for Telegram (To-Do item #8)

9. **🟡 No Data Migration Script** (Probability: High, Impact: Medium)
   - **Description:** Existing Streamlit data not migrated to Supabase
   - **Affected:** Production deployment
   - **Mitigation:** Create export/import scripts for data and files
   - **Reference:** `MIGRATION_PLAN_DETAILED.md` lines 373-379

10. **🟡 Performance Not Tested** (Probability: Medium, Impact: Medium)
    - **Description:** No load testing, large datasets may be slow
    - **Affected:** Lists with hundreds of records
    - **Mitigation:** Implement pagination, test with realistic data volumes

### Assumptions

1. **✅ Single Organization per User**
   - **Assumption:** Each user belongs to exactly one organization
   - **Evidence:** `organization_id` in user_metadata (single value)
   - **Risk if Wrong:** Multi-org users can't switch context
   - **Confidence:** 95%

2. **✅ Supabase Production Ready**
   - **Assumption:** Supabase handles production scale and security
   - **Evidence:** Widely used managed service
   - **Risk if Wrong:** Performance/uptime issues
   - **Confidence:** 90%

3. **✅ Materials Not Needed**
   - **Assumption:** Materials module removal is intentional and permanent
   - **Evidence:** `MATERIALS_REMOVAL_REPORT.md` confirms decision
   - **Risk if Wrong:** Need to rebuild module (~2-3 weeks)
   - **Confidence:** 100%

4. **⚠️ Service Role Key is Secure**
   - **Assumption:** SERVICE_ROLE_KEY never exposed to client
   - **Evidence:** Used only in API route `/api/upload`
   - **Risk if Wrong:** Complete database compromise
   - **Confidence:** 85% (needs environment audit)

5. **⚠️ RLS is Primary Security Layer**
   - **Assumption:** RLS policies alone provide sufficient multi-tenancy isolation
   - **Evidence:** Standard Supabase pattern
   - **Risk if Wrong:** Data leakage between organizations
   - **Confidence:** 75% (RLS incomplete)

6. **⚠️ No Concurrent Multi-Org Access**
   - **Assumption:** Users don't need to access multiple organizations simultaneously
   - **Evidence:** Single organization_id in JWT
   - **Risk if Wrong:** System redesign needed for multi-org support
   - **Confidence:** 80%

7. **❓ File Storage Quota Sufficient**
   - **Assumption:** Supabase free/paid tier has enough storage
   - **Evidence:** Unknown - need to check plan limits
   - **Risk if Wrong:** Upload failures, need to upgrade or implement cleanup
   - **Confidence:** 60%

8. **❓ Database Size Within Limits**
   - **Assumption:** Supabase plan supports expected data volume
   - **Evidence:** Unknown - depends on plan and usage
   - **Risk if Wrong:** Performance degradation or quota errors
   - **Confidence:** 70%

---

## 9) Questions for Product Owner

### Q1: Password Migration Strategy
**Where Found:** Authentication system
**Possible Interpretations:**
- A) Force all users to reset passwords on first Next.js login
  - Pros: Simple, secure
  - Cons: User friction, support burden
- B) Implement one-time migration script (SHA-256 → Supabase Auth)
  - Pros: Transparent to users
  - Cons: Complex, requires Supabase Auth API understanding
- C) Run both systems in parallel temporarily
  - Pros: Gradual migration
  - Cons: Increased complexity, data sync issues

**Recommended:** Option A (force password reset)
**Impact if Wrong:** Users locked out or insecure temporary solution
**Confidence in Recommendation:** 75%

### Q2: Materials Module Future
**Where Found:** Database schema cleanup
**Question:** Is the materials module permanently removed or might it be needed in the future?
**Context:** Tables dropped, code removed, but models still in `models.py`
**Impact:** Affects code cleanup priority
**Recommended:** Confirm permanent removal and clean up all references
**Confidence in Recommendation:** 90%

### Q3: Multi-Organization Support
**Where Found:** Authentication architecture
**Question:** Will users ever need to access multiple organizations (e.g., admin of multiple fleets)?
**Context:** Current design: one organization_id per user in JWT
**Impact if Yes:** Major architectural change required
**Impact if No:** Can optimize for single-org use case
**Recommended:** Clarify requirement before production
**Confidence in Recommendation:** 85%

### Q4: File Storage Requirements
**Where Found:** Supabase Storage usage
**Question:** What are expected file storage volumes and retention policies?
**Context:**
- Current: Public buckets, no size limits implemented
- Documents, photos, receipts accumulate indefinitely
**Recommended:** Define retention policy (e.g., delete old receipts after 7 years)
**Impact if Wrong:** Unexpected costs or quota exceeded
**Confidence in Recommendation:** 70%

### Q5: Telegram Integration Priority
**Where Found:** Bug report feature
**Question:** Is Telegram integration for bug reports critical for launch?
**Context:**
- Streamlit had `telegram_bot.py` integration
- Next.js implementation: bug report form works but doesn't send to Telegram
**Impact:** Medium - affects monitoring and issue response time
**Recommended:** Implement if team actively uses Telegram for monitoring
**Confidence in Recommendation:** 60%

### Q6: Analytics and Reporting
**Where Found:** Analytics page
**Question:** What level of analytics is needed? Just summaries or detailed charts?
**Context:**
- Streamlit had Plotly interactive charts (6-month trends, pie charts)
- Next.js has basic tables and sums
**Impact:** Affects scope of analytics implementation (8-20 hours)
**Recommended:** Prioritize based on business value
**Confidence in Recommendation:** 75%

### Q7: Production Deployment Timeline
**Where Found:** Overall project status
**Question:** What is target production launch date?
**Context:**
- 95% functionally complete
- Critical security gaps exist
- ~2-3 weeks work remaining for production-ready
**Impact:** Determines which To-Do items are must-have vs nice-to-have
**Recommended:** Minimum 3 weeks for security hardening + testing
**Confidence in Recommendation:** 80%

### Q8: Data Migration Approach
**Where Found:** Existing Streamlit data
**Question:** How to handle existing production data in Streamlit PostgreSQL?
**Options:**
- A) Fresh start with manual data entry
- B) Full migration with export/import scripts
- C) Run both systems in parallel during transition

**Context:** `MIGRATION_PLAN_DETAILED.md` mentions data migration but no scripts exist
**Recommended:** Option B with validation
**Impact if Wrong:** Data loss or duplicate entry
**Confidence in Recommendation:** 70%

---

## Appendix A — Detailed Schema Analysis

### Index Coverage Analysis

**Current Indexes:** 16 indexes created
**Missing Recommended Indexes:**
- `penalties.date` - For date range queries in analytics
- `car_expenses.date` - For date range queries
- `maintenances.date` - For date range queries
- `vehicle_documents.date_expiry` - For expiring documents queries

**Recommendation:** Add date indexes for performance

### Foreign Key Integrity

**Total FK Constraints:** 32 across all tables
**Cascading Deletes:** Properly configured on organization_id (ON DELETE CASCADE)
**Soft Deletes:** Not implemented (could add is_deleted flag)

**Circular Dependencies:**
- `teams.lead_id` → `users.id`
- `users.team_id` → `teams.id`
- **Resolution:** Handled via SET NULL on delete

### Data Type Consistency

**UUIDs:** All primary keys use UUID v4 ✅
**Timestamps:** All use TIMESTAMP (not TIMESTAMPTZ) ⚠️
  - **Impact:** Timezone issues for international use
  - **Recommendation:** Migrate to TIMESTAMPTZ

**Decimals:** All monetary values use DECIMAL(10, 2) ✅
**Booleans:** Proper BOOLEAN type used ✅

---

## Appendix B — API Endpoint Matrix

### Implemented Endpoints

| Method | Endpoint | Purpose | Auth | Status |
|--------|----------|---------|------|--------|
| DELETE | /api/vehicles/[id] | Delete vehicle | Required | ✅ |
| POST | /api/upload | Upload file to storage | Required | ✅ |
| POST | /api/team-members | Create team member | Required | ✅ |
| POST | /api/team-member-documents | Upload team member doc | Required | ✅ |
| POST | /api/user-documents | Upload user document | Required | ✅ |
| POST | /api/vehicle-documents | Upload vehicle document | Required | ✅ |

### Missing Endpoints (Using Server Components Instead)

Most CRUD operations use Server Components with direct Supabase calls instead of API routes:
- Vehicles: GET, POST, PUT via Server Components
- Teams: GET, POST, PUT via Server Components
- Users: GET, POST, PUT via Server Components
- Penalties: GET, POST, PUT via Server Components
- Maintenance: GET, POST, PUT via Server Components
- Expenses: GET, POST via Server Components

**Note:** This is a valid Next.js 15 App Router pattern but inconsistent with REST API approach.

---

## Appendix C — RLS Policy Inventory

### Tables with Complete RLS (4 policies each)

1. users
2. teams
3. team_members
4. team_member_documents
5. user_documents
6. vehicle_documents
7. vehicle_assignments

### Tables with Partial RLS (1 ALL policy)

1. vehicles
2. penalties
3. maintenances
4. car_expenses
5. expenses
6. rental_contracts

### RLS Policy Gaps (CRITICAL)

**Missing WITH CHECK on UPDATE:**
- team_member_documents
- vehicle_assignments
- All tables with partial RLS

**Missing Cross-Tenant Validation:**
- vehicle_assignments (vehicle + team must be same org)
- expenses (vehicle/team + org validation)
- penalties (vehicle + user + org validation)
- car_expenses (vehicle + org validation)

**Missing Service Role Bypass:**
- All tables lack service_role policies

**Recommendation:** Address before production (see To-Do #1, #2, #4)

---

## FINAL RECOMMENDATIONS

### Immediate Actions (This Week)

1. **🔴 CRITICAL: Fix RLS Policies** (8 hours)
   - Add WITH CHECK clauses
   - Add cross-tenant FK validation
   - Add service_role bypass policies
   - **BLOCKER for production**

2. **🟠 HIGH: Storage RLS** (4 hours)
   - Implement storage bucket policies
   - **SECURITY RISK if not addressed**

3. **🟡 MEDIUM: Environment Audit** (2 hours)
   - Verify SERVICE_ROLE_KEY never exposed to client
   - Check .env.local is in .gitignore
   - Validate all secrets

### Pre-Production (Next 2 Weeks)

4. **Add Database Constraints** (6 hours)
   - NOT NULL constraints
   - CHECK constraints (amount > 0, etc.)
   - Prevents invalid data

5. **Standardize Form Validation** (10 hours)
   - Zod schemas for all forms
   - Consistent error handling
   - Improves data quality

6. **Implement Pagination** (8 hours)
   - Add to vehicles, penalties, expenses, documents
   - Prevents performance issues with large datasets

7. **Add Basic Test Coverage** (16 hours)
   - Auth flow
   - Critical CRUD operations
   - RLS policy validation
   - Reduces regression risk

### Post-Launch Enhancements

8. **Internationalization** (16 hours)
   - next-intl integration
   - Translate all strings
   - Russian/German support

9. **Analytics Charts** (12 hours)
   - Recharts implementation
   - Match Streamlit functionality

10. **Telegram Integration** (6 hours)
    - Bug report notifications
    - Optional: document expiry alerts

---

## DEPLOYMENT READINESS ASSESSMENT

### Current Score: 60/100

**Breakdown:**
- **Functionality:** 95% ✅ (19/20 points)
- **Security:** 40% 🔴 (8/20 points) - RLS gaps
- **Stability:** 65% 🟡 (13/20 points) - No tests
- **Performance:** 70% 🟡 (14/20 points) - No pagination
- **UX/Polish:** 75% 🟡 (15/20 points) - Missing i18n, charts

### Production-Ready Checklist

- [ ] RLS policies complete with cross-tenant validation
- [ ] Storage RLS policies implemented
- [ ] Service role bypass policies added
- [ ] Database constraints (NOT NULL, CHECK) added
- [ ] Environment variables audited and secured
- [ ] Basic test coverage (auth + critical flows)
- [ ] Error handling standardized
- [ ] Pagination implemented for large lists
- [ ] Password migration strategy decided and documented
- [ ] Data migration from Streamlit planned
- [ ] Load testing performed
- [ ] Monitoring and alerting configured

**Estimated Time to Production Ready:** 2-3 weeks with focused effort

---

**Report Generated:** 2025-10-10
**Next Review:** After RLS policy fixes
**Contact:** See Q1-Q8 for product owner decisions needed
