# System Architecture - FahrzeugVerfolgung

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 15 App (React 19 Server Components)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Dashboard   │  │   Vehicles   │  │    Teams     │  ...    │
│  │  /dashboard  │  │  /vehicles   │  │   /teams     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────┐           │
│  │     Supabase Client (ANON KEY)                  │           │
│  │  - Auth: getUser(), signIn(), signOut()         │           │
│  │  - Database: .from('table').select()            │           │
│  │  - Storage: Public URLs only                    │           │
│  └────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (Vercel)                      │
├─────────────────────────────────────────────────────────────────┤
│  App Router                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │  Server Components   │  │   API Routes         │           │
│  │  - Fetch data on     │  │  /api/upload         │           │
│  │    server side       │  │  /api/vehicles/[id]  │           │
│  │  - RLS enforced      │  │  /api/documents      │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                      │                          │
│  ┌──────────────────────────────────▼────────────────┐         │
│  │  Supabase Server Client (SERVICE ROLE KEY)        │         │
│  │  - Bypasses RLS for file uploads                  │         │
│  │  - Admin operations                               │         │
│  └──────────────────────────────────────────────────┘         │
│                                                                 │
│  Middleware: /middleware.ts                                    │
│  - Checks auth for /dashboard/* routes                        │
│  - Redirects unauthenticated to /login                        │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ PostgreSQL Protocol
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Database (15.x)                               │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │organizations │  │    users     │  │    teams     │   │ │
│  │  │  (root)      │  │ (auth users) │  │  (brigades)  │   │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │ │
│  │         │                  │                  │           │ │
│  │         └──────────────────┴──────────────────┘           │ │
│  │                           │                                │ │
│  │         ┌─────────────────┼─────────────────┐             │ │
│  │         │                 │                 │             │ │
│  │   ┌─────▼──────┐  ┌──────▼─────┐  ┌───────▼────┐        │ │
│  │   │  vehicles  │  │ penalties  │  │  expenses  │  ...   │ │
│  │   │ (fleet)    │  │  (fines)   │  │ (costs)    │        │ │
│  │   └────────────┘  └────────────┘  └────────────┘        │ │
│  │                                                            │ │
│  │  All tables have:                                         │ │
│  │  - organization_id (FK to organizations)                  │ │
│  │  - RLS policies (filter by org_id from JWT)              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Auth System                                               │ │
│  │  - Email/Password authentication                           │ │
│  │  - JWT tokens with user_metadata.organization_id          │ │
│  │  - Session management (cookies)                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Storage Buckets                                           │ │
│  │  - documents/ (vehicle/user/team member docs)             │ │
│  │  - vehicles/ (vehicle photos)                             │ │
│  │  - expenses/ (expense receipts)                           │ │
│  │  - penalties/ (penalty photos)                            │ │
│  │  ⚠️ RLS NOT CONFIGURED (security gap)                     │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Example: Create Vehicle

```
┌──────────┐
│  User    │
└────┬─────┘
     │ 1. Fill form at /dashboard/vehicles/new
     │
     ▼
┌────────────────────────────────────┐
│  VehicleForm Component (Client)    │
│  - Zod validation                  │
│  - Handle file upload              │
└────┬───────────────────────────────┘
     │ 2. Submit form
     │
     ▼
┌────────────────────────────────────┐
│  uploadFile() → /api/upload        │
│  - FormData with file + bucket     │
└────┬───────────────────────────────┘
     │ 3. Upload to Storage
     │
     ▼
┌────────────────────────────────────┐
│  API Route /api/upload             │
│  - Uses SERVICE_ROLE_KEY           │
│  - Bypasses Storage RLS            │
│  - Returns public URL              │
└────┬───────────────────────────────┘
     │ 4. Get file URL
     │
     ▼
┌────────────────────────────────────┐
│  Server Action: createVehicle()    │
│  - Get user from JWT               │
│  - Extract organization_id         │
│  - Insert into vehicles table      │
└────┬───────────────────────────────┘
     │ 5. INSERT query
     │
     ▼
┌────────────────────────────────────┐
│  Supabase RLS Policy Check         │
│  - Verify org_id matches JWT       │
│  - Allow INSERT                    │
└────┬───────────────────────────────┘
     │ 6. Success
     │
     ▼
┌────────────────────────────────────┐
│  Redirect to /dashboard/vehicles   │
│  - Vehicle appears in list         │
└────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────────┐
│  /login      │
└──────┬───────┘
       │ 1. User enters email/password
       ▼
┌──────────────────────────────────────┐
│  signInWithPassword()                │
│  - Supabase Auth API                 │
└──────┬───────────────────────────────┘
       │ 2. Verify credentials
       ▼
┌──────────────────────────────────────┐
│  Supabase Auth                       │
│  - Check email/password              │
│  - Generate JWT token                │
│  - Set session cookie                │
└──────┬───────────────────────────────┘
       │ 3. JWT contains:
       │    - user.id
       │    - user.email
       │    - user.user_metadata.organization_id
       ▼
┌──────────────────────────────────────┐
│  Middleware                          │
│  - Check auth.getUser()              │
│  - Redirect to /dashboard if authed  │
└──────┬───────────────────────────────┘
       │ 4. Access granted
       ▼
┌──────────────────────────────────────┐
│  /dashboard                          │
│  - All DB queries filtered by org_id │
└──────────────────────────────────────┘
```

## RLS Security Model

```
User logs in
    ↓
JWT created with:
  {
    "sub": "user-uuid",
    "email": "user@example.com",
    "user_metadata": {
      "organization_id": "org-uuid-123"  ← KEY!
    }
  }
    ↓
Every DB query passes through RLS:

  SELECT * FROM vehicles
    ↓
  RLS Policy applies:
    WHERE organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
    ↓
  ⚠️ CURRENT ISSUE: Some policies incomplete
    ↓
  Result: User sees only their org's vehicles
```

## Multi-Tenancy Isolation

```
┌───────────────────────────────────────────────────────┐
│  Organization A (org-uuid-aaa)                        │
│                                                        │
│  Users:                                               │
│  - user-1 (john@companyA.com)                        │
│  - user-2 (jane@companyA.com)                        │
│                                                        │
│  Data:                                                │
│  - 5 vehicles (all have organization_id = org-aaa)   │
│  - 3 teams                                            │
│  - 10 penalties                                       │
│                                                        │
│  ↓ RLS ensures isolation ↓                           │
│  Users ONLY see data with organization_id = org-aaa  │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│  Organization B (org-uuid-bbb)                        │
│                                                        │
│  Users:                                               │
│  - user-3 (alice@companyB.com)                       │
│                                                        │
│  Data:                                                │
│  - 8 vehicles (all have organization_id = org-bbb)   │
│  - 2 teams                                            │
│  - 5 penalties                                        │
│                                                        │
│  ↓ RLS ensures isolation ↓                           │
│  Users ONLY see data with organization_id = org-bbb  │
└───────────────────────────────────────────────────────┘

⚠️ RISK: If RLS policies have gaps, Org A users could
         accidentally see Org B data!
```

## File Upload Flow (Current Implementation)

```
┌──────────────┐
│  Client      │
└──────┬───────┘
       │ 1. User selects file
       ▼
┌────────────────────────────────────┐
│  uploadFile(file, 'documents')     │
│  - FormData with file              │
└──────┬─────────────────────────────┘
       │ 2. POST to /api/upload
       ▼
┌────────────────────────────────────┐
│  API Route (Server)                │
│  - Uses SERVICE_ROLE_KEY           │
│  - Bypasses Storage RLS            │
└──────┬─────────────────────────────┘
       │ 3. Upload to Supabase Storage
       ▼
┌────────────────────────────────────┐
│  Supabase Storage                  │
│  Bucket: documents/                │
│  Path: random-uuid.pdf             │
│  ⚠️ No RLS → anyone can access!    │
└──────┬─────────────────────────────┘
       │ 4. Return public URL
       ▼
┌────────────────────────────────────┐
│  https://...supabase.co/           │
│    storage/v1/object/public/       │
│    documents/abc123.pdf            │
└────────────────────────────────────┘

🔴 SECURITY GAP: Files in public bucket accessible
                  by anyone with URL!
```

## Current vs Ideal State

### Current State ⚠️
- ✅ Multi-tenancy architecture in place
- ✅ RLS enabled on all tables
- ⚠️ RLS policies incomplete (cross-tenant gaps)
- ❌ Storage RLS missing
- ✅ Auth working via Supabase
- ⚠️ No comprehensive testing
- ✅ Core CRUD functional

### Ideal State 🎯
- ✅ Multi-tenancy architecture
- ✅ RLS enabled on all tables
- ✅ RLS policies complete with cross-tenant validation
- ✅ Storage RLS protecting files
- ✅ Auth working via Supabase
- ✅ 60%+ test coverage
- ✅ All CRUD functional
- ✅ Performance optimized (pagination)
- ✅ Error handling standardized
- ✅ Production monitoring

## Technology Stack Layers

```
┌─────────────────────────────────────────────┐
│  Presentation Layer                         │
│  - React 19 (Server Components)             │
│  - Tailwind CSS                             │
│  - shadcn/ui components                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Application Layer                          │
│  - Next.js 15 (App Router)                  │
│  - TypeScript (strict mode)                 │
│  - Server Actions                           │
│  - API Routes                               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Authentication Layer                       │
│  - Supabase Auth                            │
│  - JWT tokens                               │
│  - Session management                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Data Access Layer                          │
│  - Supabase JS Client                       │
│  - RLS enforcement                          │
│  - Query optimization                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Database Layer                             │
│  - PostgreSQL 15.x                          │
│  - Row Level Security                       │
│  - Foreign Keys & Constraints               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Storage Layer                              │
│  - Supabase Storage                         │
│  - Public buckets                           │
│  - ⚠️ RLS not configured                    │
└─────────────────────────────────────────────┘
```

---

**Key Architectural Decisions:**

1. **Server Components First:** Render on server, reduce client JS
2. **RLS for Security:** Database-level multi-tenancy isolation
3. **Service Role for Uploads:** Bypass RLS for file operations
4. **organization_id Everywhere:** Core to multi-tenancy design
5. **JWT-based Auth:** Stateless authentication with Supabase

**Known Trade-offs:**

- Service Role Key required for uploads (security risk if exposed)
- No API versioning (v1) yet
- Pagination not implemented (performance impact later)
- Storage RLS missing (security gap)

**Migration from Streamlit:**

- From: Monolithic Python app with local files
- To: Distributed Next.js app with cloud storage
- Benefit: Scalability, modern stack, better UX
- Cost: Increased complexity, RLS learning curve
