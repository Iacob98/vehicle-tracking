# Fleet Management System

## Overview
A comprehensive, multi-language (Russian and German) fleet management web application built with Streamlit. It enables organizations to manage vehicles, teams, users, penalties, maintenance, materials, and expenses. The system provides a complete solution for fleet operations management with real-time dashboards and analytics, supporting multi-tenancy for data isolation between organizations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Streamlit web application framework.
- **UI Pattern**: Multi-page application with tabbed interfaces and organization-based access control.
- **Authentication**: Session-based authentication with login/registration, secure logout, and multi-tenancy support.
- **Language Support**: Internationalization system for Russian and German.
- **Navigation**: Sidebar-based navigation with icon-based menu and organization header.
- **State Management**: Streamlit session state for authentication, language, and user interactions.

### Backend Architecture
- **Database ORM**: SQLAlchemy with declarative base models.
- **Database Connection**: PostgreSQL with connection pooling.
- **Authentication System**: Custom authentication with password hashing and organization management.
- **Multi-Tenancy**: Organization-based data isolation with automatic filtering on all database operations.
- **Data Models**: Comprehensive ERM including Organizations, Users (with roles: admin, manager, team_lead, worker), Vehicles, Teams, Vehicle Assignments, Penalties (with receipt uploads), Maintenance, Materials/Equipment, Expense Tracking (car and brigade), Material Assignment History, and Document Management (for vehicles and users).

### Data Storage Solutions
- **Primary Database**: PostgreSQL with custom enum types and multi-tenant architecture.
- **Schema Design**: Normalized relational database with foreign key constraints and `organization_id` in every table for data isolation.
- **Data Types**: UUID primary keys, PostgreSQL enums, timestamps, secure password hashing.
- **Security**: Cascading deletion on organization removal, unique constraints within organization scope.

### Authentication and Authorization
- **Organization Registration**: Self-service organization creation with admin user setup.
- **Secure Authentication**: Email/password authentication with salted SHA-256 password hashing.
- **Role-Based Access**: Four-tier user role system (admin, manager, team_lead, worker).
- **Multi-Tenant Security**: Complete data isolation between organizations.
- **Session Management**: Streamlit session state for authentication tracking.

### Key Features
- **Dashboard Analytics**: Real-time metrics with Plotly visualizations for expenses, vehicles, and teams.
- **Multi-Entity Management**: CRUD operations for all core entities (vehicles, users, teams, materials, penalties, expenses, documents).
- **Document Management**: File attachments with expiry dates for vehicles and users, including alerts for expiring documents.
- **Expense Management**: Categorized car and brigade expenses with receipt uploads and integration with maintenance and material systems.
- **Vehicle Assignment System**: Driver selection and multi-step assignment process.
- **Equipment Return Tracking**: Two-stage return process (mark for return, confirm) with automatic penalty creation for broken equipment.
- **CSV Import/Export**: Bulk data operations with preview and validation.
- **Search and Filtering**: Advanced filtering across all entity types.
- **Historical Tracking**: Vehicle assignments, team compositions (snapshots), and expense trends.
- **Multi-Language Support**: Russian and German translations across the application.
- **Photo Management**: Vehicle photo upload and display.

## External Dependencies

### Core Framework Dependencies
- **Streamlit**: Web application framework.
- **SQLAlchemy**: Database ORM.
- **Plotly**: Interactive charts and visualizations.
- **Pandas**: Data manipulation and CSV export.

### Database Dependencies
- **PostgreSQL**: Primary database system.

### Python Standard Libraries
- **uuid**: For unique identifier generation.
- **datetime**: For date and time handling.
- **enum**: For enumeration support.
- **os**: For environment variable management.

## Next.js Migration (In Progress)

### Migration Overview
Started migration to modern tech stack: Next.js + Supabase for better scalability, security, and developer experience.

### Current Status
- ✅ **Next.js Project Structure**: Created with TypeScript, Tailwind CSS, App Router
- ✅ **Supabase Integration**: Client and server configurations ready
- ✅ **Database Schema**: Complete SQL schema with enhanced security (organization_id added to all tables)
- ⏳ **Row Level Security**: Base RLS policies created, requires refinement (see RLS_SECURITY_NOTES.md)
- ⏳ **Authentication**: Awaiting Supabase project setup
- ⏳ **UI Migration**: Not started
- ⏳ **Data Migration**: Not started

### Architecture Changes
**Enhanced Security:**
- Added `organization_id` to: vehicles, materials, penalties, maintenances, expenses
- Supabase Row Level Security (RLS) for automatic multi-tenant isolation
- JWT-based authentication with user metadata

**Migration Files:**
- `nextjs-app/` - Next.js application
- `nextjs-app/lib/database-schema.sql` - Complete database schema
- `nextjs-app/lib/RLS_SECURITY_NOTES.md` - Security considerations and improvements needed
- `nextjs-app/MIGRATION_GUIDE.md` - Step-by-step migration instructions

### Next Steps
1. Setup Supabase project and get API keys
2. Execute database schema in Supabase
3. Implement authentication system
4. Migrate UI components
5. Data and file migration
6. Parallel system testing
7. Final cutover

### Technology Stack (New)
- **Frontend**: Next.js 15 with TypeScript, React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Real-time)
- **Deployment**: Vercel or Replit (TBD)
- **Testing**: Playwright for E2E (planned)