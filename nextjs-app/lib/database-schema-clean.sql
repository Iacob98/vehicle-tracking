-- Fleet Management Database Schema for Supabase
-- Clean version - drops existing types and tables first

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (in reverse order of dependencies)
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS rental_contracts CASCADE;
DROP TABLE IF EXISTS user_documents CASCADE;
DROP TABLE IF EXISTS car_expenses CASCADE;
DROP TABLE IF EXISTS maintenances CASCADE;
DROP TABLE IF EXISTS penalties CASCADE;
DROP TABLE IF EXISTS vehicle_assignments CASCADE;
DROP TABLE IF EXISTS vehicle_documents CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS team_member_documents CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS car_expense_category CASCADE;
DROP TYPE IF EXISTS worker_category CASCADE;
DROP TYPE IF EXISTS expense_type CASCADE;
DROP TYPE IF EXISTS maintenance_type CASCADE;
DROP TYPE IF EXISTS penalty_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS vehicle_status CASCADE;

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
    status penalty_status DEFAULT 'open',
    description TEXT
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

-- Similar policies for all other tables...
-- (Simplified for brevity - add full policies for production)

-- Vehicles
CREATE POLICY "vehicles_all" ON vehicles FOR ALL
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Penalties
CREATE POLICY "penalties_all" ON penalties FOR ALL
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Maintenances
CREATE POLICY "maintenances_all" ON maintenances FOR ALL
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Car expenses
CREATE POLICY "car_expenses_all" ON car_expenses FOR ALL
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Team members
CREATE POLICY "team_members_all" ON team_members FOR ALL
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Rental contracts
CREATE POLICY "rental_contracts_all" ON rental_contracts FOR ALL
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');

-- Expenses
CREATE POLICY "expenses_all" ON expenses FOR ALL
    USING (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id')
    WITH CHECK (organization_id::text = auth.jwt()->'user_metadata'->>'organization_id');
