# Next Steps - Migration Completion Roadmap

**Priority:** Production Security & Readiness
**Timeline:** 2-3 weeks to production-ready
**Last Updated:** 2025-10-10

---

## 🚨 CRITICAL - This Week (16 hours)

### 1. Complete RLS Policies (8 hours) - BLOCKER
**Why:** Prevents cross-tenant data leakage
**Files:** SQL migrations in `nextjs-app/lib/`

```sql
-- Example: Add WITH CHECK to UPDATE policies
ALTER POLICY "vehicle_assignments_update" ON vehicle_assignments
FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Example: Cross-tenant FK validation
CREATE POLICY "vehicle_assignments_insert_safe" ON vehicle_assignments
FOR INSERT
WITH CHECK (
  -- Verify team belongs to user's org
  EXISTS (SELECT 1 FROM teams WHERE id = team_id
          AND organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
  AND
  -- Verify vehicle belongs to user's org
  EXISTS (SELECT 1 FROM vehicles WHERE id = vehicle_id
          AND organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
);
```

**Tables to Fix:**
- vehicle_assignments
- expenses
- penalties
- maintenances
- car_expenses
- team_member_documents
- user_documents

**Verification:**
```sql
-- Test cross-tenant protection
-- Should FAIL if working correctly
INSERT INTO vehicle_assignments (vehicle_id, team_id, start_date)
VALUES (
  (SELECT id FROM vehicles WHERE organization_id = 'other-org' LIMIT 1),
  (SELECT id FROM teams WHERE organization_id = 'my-org' LIMIT 1),
  CURRENT_DATE
);
```

### 2. Implement Storage RLS (4 hours) - SECURITY
**Why:** File access currently unrestricted
**Files:** Supabase Dashboard → Storage → Policies

Create policies for each bucket (documents, vehicles, expenses, penalties):

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- Users can only read files from their organization
CREATE POLICY "Users can read own org files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
  -- Note: You'll need to encode org_id in file path or metadata
);

-- Allow service_role full access
CREATE POLICY "Service role bypass"
ON storage.objects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

**Alternative:** If storage path includes organization_id, use path-based policies.

### 3. Add Service Role Bypass Policies (2 hours)
**Why:** Backend operations need to bypass RLS
**Files:** SQL migration

```sql
-- Add to ALL tables
CREATE POLICY "service_role_bypass_all" ON vehicles
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Repeat for: users, teams, penalties, expenses, etc.
```

### 4. Environment Security Audit (2 hours)
**Why:** Prevent key exposure

**Checklist:**
- [ ] Verify `.env.local` in `.gitignore`
- [ ] Confirm `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` never used in client components
- [ ] Check no secrets in git history: `git log --all --full-history --source -- .env.local`
- [ ] Validate Supabase project security settings
- [ ] Ensure ANON key used for client, SERVICE_ROLE only in API routes

---

## 🔴 HIGH PRIORITY - Week 2 (24 hours)

### 5. Add Database Constraints (6 hours)
**Why:** Prevents invalid data at database level

```sql
-- NOT NULL constraints
ALTER TABLE vehicles ALTER COLUMN name SET NOT NULL;
ALTER TABLE penalties ALTER COLUMN amount SET NOT NULL;
ALTER TABLE car_expenses ALTER COLUMN amount SET NOT NULL;

-- CHECK constraints
ALTER TABLE penalties ADD CONSTRAINT penalty_amount_positive CHECK (amount > 0);
ALTER TABLE car_expenses ADD CONSTRAINT expense_amount_positive CHECK (amount > 0);
ALTER TABLE expenses ADD CONSTRAINT general_expense_amount_positive CHECK (amount > 0);
ALTER TABLE vehicles ADD CONSTRAINT license_plate_not_empty CHECK (license_plate <> '');

-- Add indexes for date queries
CREATE INDEX idx_penalties_date ON penalties(date);
CREATE INDEX idx_car_expenses_date ON car_expenses(date);
CREATE INDEX idx_maintenances_date ON maintenances(date);
CREATE INDEX idx_vehicle_documents_date_expiry ON vehicle_documents(date_expiry);
```

### 6. Standardize Form Validation (10 hours)
**Why:** Consistent data quality and UX

**Pattern for all forms:**
```typescript
// schemas/vehicle.ts
import { z } from 'zod';

export const vehicleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  license_plate: z.string().min(1, 'License plate is required'),
  vin: z.string().length(17, 'VIN must be 17 characters').optional(),
  status: z.enum(['active', 'repair', 'unavailable', 'rented']),
  is_rental: z.boolean(),
  rental_monthly_price: z.number().positive().optional(),
});

// Use in forms with react-hook-form
const form = useForm({
  resolver: zodResolver(vehicleSchema),
});
```

**Forms to update:**
- [x] Vehicles (already has validation)
- [ ] Teams
- [ ] Users
- [ ] Penalties
- [ ] Maintenance
- [ ] Car Expenses
- [ ] General Expenses

### 7. Implement Pagination (8 hours)
**Why:** Performance with large datasets

**Pattern:**
```typescript
// app/dashboard/vehicles/page.tsx
const searchParams = await params;
const page = Number(searchParams.page) || 1;
const limit = 50;
const offset = (page - 1) * limit;

const { data, count } = await supabase
  .from('vehicles')
  .select('*', { count: 'exact' })
  .eq('organization_id', orgId)
  .range(offset, offset + limit - 1);

const totalPages = Math.ceil((count || 0) / limit);
```

**Pages to update:**
- Vehicles list
- Penalties list
- Expenses list
- Documents list
- Users list

---

## 🟡 MEDIUM PRIORITY - Week 3 (20 hours)

### 8. Add Test Coverage (16 hours)

**Unit Tests (8 hours):**
```typescript
// __tests__/lib/storage.test.ts
import { uploadFile } from '@/lib/storage';

describe('File Upload', () => {
  it('should upload file to correct bucket', async () => {
    const file = new File(['test'], 'test.pdf');
    const url = await uploadFile(file, 'documents');
    expect(url).toContain('/documents/');
  });
});
```

**Integration Tests (8 hours):**
```typescript
// __tests__/api/vehicles.test.ts
import { createServerClient } from '@/lib/supabase/server';

describe('Vehicles API', () => {
  it('should only return vehicles from user org', async () => {
    // Mock user with org_id
    const supabase = await createServerClient();
    const { data } = await supabase.from('vehicles').select('*');

    // Verify all vehicles have same organization_id
    expect(data.every(v => v.organization_id === mockOrgId)).toBe(true);
  });
});
```

**E2E Tests (Playwright):**
- Auth flow
- Vehicle CRUD
- Document upload

**Setup:**
```bash
cd nextjs-app
npm install -D @playwright/test vitest
npx playwright install
```

### 9. Error Handling Standardization (4 hours)

**Create error handler:**
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
  }
}

export const errorResponses = {
  UNAUTHORIZED: new AppError('UNAUTHORIZED', 'Not authenticated', 401),
  FORBIDDEN: new AppError('FORBIDDEN', 'Access denied', 403),
  NOT_FOUND: new AppError('NOT_FOUND', 'Resource not found', 404),
  VALIDATION_ERROR: new AppError('VALIDATION_ERROR', 'Invalid data', 400),
};

// Use in API routes
export async function DELETE(request: Request) {
  try {
    // ... logic
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { code: error.code, message: error.message, details: error.details },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An error occurred' },
      { status: 500 }
    );
  }
}
```

---

## 🟢 NICE-TO-HAVE - Post-Launch (40+ hours)

### 10. Internationalization (16 hours)
**Tool:** next-intl

```bash
npm install next-intl
```

**Setup:**
```typescript
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const messages = await import(`../../messages/${locale}.json`);

  return (
    <NextIntlClientProvider locale={locale} messages={messages.default}>
      {children}
    </NextIntlClientProvider>
  );
}
```

**Translation files:**
- `messages/ru.json` - Russian
- `messages/de.json` - German

### 11. Analytics Charts (12 hours)
**Tool:** Recharts

```bash
npm install recharts
```

**Implementation:**
```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function ExpenseChart({ data }) {
  return (
    <BarChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="amount" fill="#8884d8" />
    </BarChart>
  );
}
```

**Charts to add:**
- Dashboard: Vehicle status pie chart
- Dashboard: Monthly expenses bar chart (6 months)
- Analytics: Expense breakdown by vehicle
- Analytics: Expense breakdown by category

### 12. Telegram Integration (6 hours)

**Approach:** Edge Function

```typescript
// app/api/bug-report/route.ts
export async function POST(request: Request) {
  const { title, description, priority, category } = await request.json();
  const user = await getUser();

  const message = `
🐛 Bug Report
Priority: ${priority}
Category: ${category}

${title}

${description}

User: ${user.email}
Org: ${user.organization_id}
Time: ${new Date().toISOString()}
  `;

  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    }),
  });

  return NextResponse.json({ success: true });
}
```

**Environment variables:**
```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 13. Password Migration (6 hours)

**Approach: Force Reset**

```typescript
// app/login/actions.ts
export async function loginWithMigration(email: string, password: string) {
  const supabase = await createServerClient();

  // Try Supabase Auth first
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error && error.message.includes('Invalid login credentials')) {
    // Check if user exists in legacy users table
    const { data: legacyUser } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('email', email)
      .single();

    if (legacyUser) {
      // Verify SHA-256 password
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (hash === legacyUser.password_hash) {
        // Force password reset
        return {
          requiresReset: true,
          message: 'Please reset your password to continue',
          userId: legacyUser.id
        };
      }
    }
  }

  return { data, error };
}
```

**Alternative: One-time migration script** (more complex, requires Supabase Admin API)

---

## 📋 Decision Points (Need Product Owner Input)

**Before starting work, get answers to:**

1. **Password Migration:** Force reset (easy) vs automatic migration (complex)?
2. **Multi-Org Support:** Will users ever need access to multiple organizations?
3. **Telegram Priority:** Critical for launch or can wait?
4. **Analytics Depth:** Basic tables or full interactive charts?
5. **Production Timeline:** When must system be live?
6. **Data Migration:** Fresh start or migrate existing Streamlit data?
7. **File Storage:** What retention policy? Delete old files?
8. **Materials Module:** Permanently removed or might restore later?

---

## 🎯 Recommended Sequence

### Week 1 Focus: Security
1. Fix RLS policies (8h)
2. Storage RLS (4h)
3. Service role bypass (2h)
4. Environment audit (2h)

**Goal:** System is secure for production data

### Week 2 Focus: Stability
5. Database constraints (6h)
6. Form validation (10h)
7. Pagination (8h)

**Goal:** System handles edge cases and large datasets

### Week 3 Focus: Quality
8. Test coverage (16h)
9. Error handling (4h)

**Goal:** Confidence in production readiness

### Post-Launch: Polish
10. i18n (16h)
11. Analytics charts (12h)
12. Telegram integration (6h)
13. Password migration (6h)

**Goal:** Feature parity with Streamlit

---

## 📊 Progress Tracking

Create `.taskmaster/` directory and use Task Master or update this checklist:

### Critical Week 1
- [ ] RLS WITH CHECK clauses added
- [ ] Cross-tenant FK validation in RLS
- [ ] Service role bypass policies
- [ ] Storage RLS policies
- [ ] Environment security audit passed
- [ ] All security tests passing

### High Priority Week 2
- [ ] NOT NULL constraints added
- [ ] CHECK constraints added
- [ ] Performance indexes added
- [ ] Zod schemas for all forms
- [ ] Pagination on all list views
- [ ] Loading states improved

### Medium Priority Week 3
- [ ] Unit test coverage ≥60%
- [ ] Integration tests for CRUD
- [ ] E2E tests for auth + critical flows
- [ ] Error handling standardized
- [ ] Error messages user-friendly

### Nice-to-Have Post-Launch
- [ ] next-intl configured
- [ ] All strings translated (ru/de)
- [ ] Recharts integrated
- [ ] Analytics charts restored
- [ ] Telegram bot working
- [ ] Password migration completed

---

## 🚀 Deployment Checklist

Before going to production:

### Pre-Deployment
- [ ] All critical security fixes deployed
- [ ] Database migrations tested in staging
- [ ] Environment variables configured
- [ ] Supabase project limits reviewed
- [ ] Backup strategy defined

### Deployment
- [ ] Deploy to Vercel/production
- [ ] Run database migrations
- [ ] Verify RLS policies active
- [ ] Test authentication flow
- [ ] Test file uploads
- [ ] Smoke test critical flows

### Post-Deployment
- [ ] Monitor error rates (Sentry/Vercel Analytics)
- [ ] Check database performance
- [ ] Verify all users can log in
- [ ] Monitor file storage usage
- [ ] Set up alerts for failures

### Rollback Plan
- [ ] Database snapshot before migration
- [ ] Keep Streamlit running in parallel (1-2 weeks)
- [ ] Have rollback scripts ready
- [ ] Document rollback procedure

---

**Created:** 2025-10-10
**Owner:** Development Team
**Review:** Weekly until production launch

For detailed analysis, see `migration_audit.md`
