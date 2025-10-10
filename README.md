# Vehicle Tracking System (FahrzeugVerfolgung)

Fleet management system for tracking vehicles, teams, expenses, penalties, and maintenance.

## 🚀 Project Status

Currently in migration from **Streamlit** to **Next.js 15** with **Supabase** backend.

**Migration Progress:** ~95% functionally complete

## 🏗️ Architecture

### Legacy (Streamlit)
- **Location:** `Home.py`, `pages/*.py`
- **Framework:** Streamlit + SQLAlchemy
- **Status:** Legacy, being phased out

### New (Next.js)
- **Location:** `nextjs-app/`
- **Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Storage + Auth)
- **Status:** Active development

## 📋 Features

- ✅ Vehicle Management (CRUD)
- ✅ Team Management
- ✅ User Management
- ✅ Penalties & Fines
- ✅ Expenses Tracking
- ✅ Maintenance Records
- ✅ Document Management
- ✅ Multi-tenant (Organization-based)
- 🚧 Analytics Dashboard (in progress)
- 🚧 File Upload/Storage (RLS policies needed)

## 🛠️ Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components

### Backend
- Supabase
  - PostgreSQL database
  - Row Level Security (RLS)
  - Storage for documents
  - Authentication

### Legacy
- Python 3.11+
- Streamlit
- SQLAlchemy
- PostgreSQL

## 📦 Installation

### Next.js App

```bash
cd nextjs-app
npm install
cp .env.example .env.local
# Add your Supabase credentials to .env.local
npm run dev
```

### Streamlit (Legacy)

```bash
pip install -r requirements.txt
streamlit run Home.py
```

## 🔒 Environment Variables

Required for Next.js app:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📚 Documentation

- [Migration Plan](MIGRATION_PLAN_DETAILED.md)
- [Migration Audit](migration_audit.md)
- [Next Steps](NEXT_STEPS.md)
- [Architecture Diagram](ARCHITECTURE_DIAGRAM.md)

## 🚧 Known Issues

See `AUDIT_SUMMARY.md` for detailed list of known issues and priorities.

**Critical fixes needed before production:**
1. Complete RLS policies for cross-tenant protection
2. Add Storage RLS policies
3. Implement service role bypass for backend operations

## 📈 Development Roadmap

**Phase 1:** ✅ Feature parity (95% complete)
**Phase 2:** 🚧 Security hardening (in progress)
**Phase 3:** 📅 Testing & validation
**Phase 4:** 📅 Production deployment
**Phase 5:** 📅 Legacy decommission

## 🤝 Contributing

This is a private project currently under active development.

## 📄 License

Private - All rights reserved

## 👤 Author

Iacob98

---

**Last Updated:** January 2025
