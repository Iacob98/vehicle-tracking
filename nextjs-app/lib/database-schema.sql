-- Fleet Management Database Schema for Supabase
-- Full schema based on models.py

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE vehicle_status AS ENUM ('active', 'repair', 'unavailable', 'rented');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'team_lead', 'worker');
CREATE TYPE penalty_status AS ENUM ('open', 'paid');
CREATE TYPE maintenance_type AS ENUM ('inspection', 'repair');
CREATE TYPE expense_type AS ENUM ('vehicle', 'team');
CREATE TYPE worker_category AS ENUM ('driver', 'mechanic', 'specialist', 'general');
CREATE TYPE car_expense_category AS ENUM ('fuel', 'repair', 'maintenance', 'insurance', 'other');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subscription_status VARCHAR(50) DEFAULT 'active',
    subscription_expires_at TIMESTAMP,
    telegram_chat_id VARCHAR(255)
);

-- Teams table (without lead_id to avoid circular dependency)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    lead_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (platform users with accounts)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team members (workers without accounts)
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    category worker_category DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team member documents
CREATE TABLE team_member_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    expiry_date DATE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table (with organization_id for security)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    license_plate VARCHAR(50),
    vin VARCHAR(100),
    status vehicle_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Rental-related fields
    is_rental BOOLEAN DEFAULT FALSE,
    rental_start_date DATE,
    rental_end_date DATE,
    rental_monthly_price DECIMAL(10, 2),
    UNIQUE(organization_id, license_plate),
    UNIQUE(organization_id, vin)
);

-- Vehicle assignments
CREATE TABLE vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE
);

-- Penalties table (with organization_id for security)
CREATE TABLE penalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    photo_url VARCHAR(500),
    status penalty_status DEFAULT 'open'
);

-- Maintenance table (with organization_id for security)
CREATE TABLE maintenances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type maintenance_type NOT NULL,
    description TEXT,
    receipt_url VARCHAR(500)
);

-- Car expenses table (specific expenses for vehicles)
CREATE TABLE car_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category car_expense_category NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    receipt_url VARCHAR(500),
    maintenance_id UUID REFERENCES maintenances(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle documents table
CREATE TABLE vehicle_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    date_issued DATE,
    date_expiry DATE,
    is_active BOOLEAN DEFAULT TRUE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User documents table
CREATE TABLE user_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    date_issued DATE,
    date_expiry DATE,
    is_active BOOLEAN DEFAULT TRUE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rental contracts
CREATE TABLE rental_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    contract_number VARCHAR(100),
    rental_company_name VARCHAR(255) NOT NULL,
    rental_company_contact VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_price DECIMAL(10, 2) NOT NULL,
    deposit_amount DECIMAL(10, 2),
    contract_file_url VARCHAR(500),
    terms TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table (unified for vehicle and team expenses, with organization_id)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type expense_type NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    receipt_url VARCHAR(500)
);

-- Add foreign key constraints after all tables are created
ALTER TABLE teams ADD CONSTRAINT fk_teams_lead_id 
    FOREIGN KEY (lead_id) REFERENCES users(id) ON DELETE SET NULL;

-- Row Level Security (RLS) - Enable on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using auth.uid() and organization_id from JWT claims)
-- Assumption: Supabase Auth JWT contains organization_id in metadata

-- Organizations: Users can only view their own organization
CREATE POLICY "org_select" ON organizations FOR SELECT 
    USING (id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Teams: Users can access teams in their organization
CREATE POLICY "teams_select" ON teams FOR SELECT 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "teams_insert" ON teams FOR INSERT 
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "teams_update" ON teams FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "teams_delete" ON teams FOR DELETE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Users: Users can access users in their organization
CREATE POLICY "users_select" ON users FOR SELECT 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "users_insert" ON users FOR INSERT 
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "users_update" ON users FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "users_delete" ON users FOR DELETE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Team members: Access based on organization
CREATE POLICY "team_members_select" ON team_members FOR SELECT 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "team_members_insert" ON team_members FOR INSERT 
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "team_members_update" ON team_members FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "team_members_delete" ON team_members FOR DELETE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Team member documents: Via team_members organization
CREATE POLICY "team_member_docs_select" ON team_member_documents FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.id = team_member_documents.team_member_id 
        AND team_members.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "team_member_docs_insert" ON team_member_documents FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.id = team_member_documents.team_member_id 
        AND team_members.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "team_member_docs_update" ON team_member_documents FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.id = team_member_documents.team_member_id 
        AND team_members.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "team_member_docs_delete" ON team_member_documents FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.id = team_member_documents.team_member_id 
        AND team_members.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

-- Vehicles: Organization-scoped access
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT 
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Vehicle assignments: Via team organization
CREATE POLICY "vehicle_assignments_select" ON vehicle_assignments FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = vehicle_assignments.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "vehicle_assignments_insert" ON vehicle_assignments FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = vehicle_assignments.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "vehicle_assignments_update" ON vehicle_assignments FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = vehicle_assignments.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "vehicle_assignments_delete" ON vehicle_assignments FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = vehicle_assignments.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

-- Penalties: Organization-scoped access
CREATE POLICY "penalties_select" ON penalties FOR SELECT 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "penalties_insert" ON penalties FOR INSERT 
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "penalties_update" ON penalties FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "penalties_delete" ON penalties FOR DELETE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Maintenances: Organization-scoped access
CREATE POLICY "maintenances_select" ON maintenances FOR SELECT 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "maintenances_insert" ON maintenances FOR INSERT 
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "maintenances_update" ON maintenances FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "maintenances_delete" ON maintenances FOR DELETE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Materials: Organization-scoped access
CREATE POLICY "materials_select" ON materials FOR SELECT 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "materials_insert" ON materials FOR INSERT 
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "materials_update" ON materials FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "materials_delete" ON materials FOR DELETE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Material assignments: Via team organization
CREATE POLICY "material_assignments_select" ON material_assignments FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = material_assignments.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "material_assignments_insert" ON material_assignments FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = material_assignments.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "material_assignments_update" ON material_assignments FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = material_assignments.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "material_assignments_delete" ON material_assignments FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = material_assignments.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

-- Material history: Via team organization
CREATE POLICY "material_history_select" ON material_history FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = material_history.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

CREATE POLICY "material_history_insert" ON material_history FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM teams 
        WHERE teams.id = material_history.team_id 
        AND teams.organization_id::text = auth.jwt()->'user_metadata'->>'organization_id'
    ));

-- Rental contracts: Via organization
CREATE POLICY "rental_contracts_select" ON rental_contracts FOR SELECT 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "rental_contracts_insert" ON rental_contracts FOR INSERT 
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "rental_contracts_update" ON rental_contracts FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "rental_contracts_delete" ON rental_contracts FOR DELETE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Expenses: Organization-scoped access
CREATE POLICY "expenses_select" ON expenses FOR SELECT 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "expenses_insert" ON expenses FOR INSERT 
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "expenses_update" ON expenses FOR UPDATE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

CREATE POLICY "expenses_delete" ON expenses FOR DELETE 
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Performance indexes
CREATE INDEX idx_teams_organization ON teams(organization_id);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_team ON users(team_id);
CREATE INDEX idx_team_members_organization ON team_members(organization_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_vehicle_assignments_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX idx_vehicle_assignments_team ON vehicle_assignments(team_id);
CREATE INDEX idx_penalties_vehicle ON penalties(vehicle_id);
CREATE INDEX idx_penalties_user ON penalties(user_id);
CREATE INDEX idx_maintenances_vehicle ON maintenances(vehicle_id);
CREATE INDEX idx_material_assignments_material ON material_assignments(material_id);
CREATE INDEX idx_material_assignments_team ON material_assignments(team_id);
CREATE INDEX idx_material_history_material ON material_history(material_id);
CREATE INDEX idx_material_history_team ON material_history(team_id);
CREATE INDEX idx_rental_contracts_organization ON rental_contracts(organization_id);
CREATE INDEX idx_rental_contracts_vehicle ON rental_contracts(vehicle_id);
CREATE INDEX idx_expenses_vehicle ON expenses(vehicle_id);
CREATE INDEX idx_expenses_team ON expenses(team_id);

-- IMPORTANT NOTES FOR MIGRATION:
-- 1. This schema DIFFERS from models.py by adding organization_id to:
--    - vehicles, materials, penalties, maintenances, expenses
-- 2. This is REQUIRED for proper multi-tenant security in Supabase
-- 3. You must either:
--    A) Add these columns to current PostgreSQL BEFORE migration
--    B) Accept data loss and rebuild these tables from scratch in Supabase
-- 4. All RLS policies now enforce organization-level isolation
