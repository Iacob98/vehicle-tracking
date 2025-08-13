import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
import streamlit as st

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/fleet_db')

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session() -> Session:
    """Get database session"""
    return SessionLocal()

def init_db():
    """Initialize database with schema"""
    try:
        with engine.connect() as conn:
            # Create enum types if they don't exist
            conn.execute(text("""
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
                        CREATE TYPE vehicle_status AS ENUM ('active', 'repair', 'unavailable');
                    END IF;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
                        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'team_lead', 'worker');
                    END IF;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'penalty_status') THEN
                        CREATE TYPE penalty_status AS ENUM ('open', 'paid');
                    END IF;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
                        CREATE TYPE maintenance_type AS ENUM ('inspection', 'repair');
                    END IF;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_type') THEN
                        CREATE TYPE material_type AS ENUM ('material', 'equipment');
                    END IF;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_status') THEN
                        CREATE TYPE material_status AS ENUM ('active', 'returned', 'broken');
                    END IF;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_type') THEN
                        CREATE TYPE expense_type AS ENUM ('vehicle', 'team');
                    END IF;
                END $$;
            """))
            
            conn.execute(text("""
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_event') THEN
                        CREATE TYPE material_event AS ENUM ('assigned', 'returned', 'broken');
                    END IF;
                END $$;
            """))
            
            # Create tables in correct order
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS teams (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    lead_id UUID,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    phone TEXT,
                    role user_role NOT NULL,
                    team_id UUID REFERENCES teams(id)
                );
            """))
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS vehicles (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    license_plate TEXT UNIQUE,
                    vin TEXT UNIQUE,
                    status vehicle_status DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS vehicle_assignments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
                    start_date DATE NOT NULL,
                    end_date DATE
                );
            """))
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS penalties (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id),
                    date DATE NOT NULL,
                    amount NUMERIC(10,2) NOT NULL,
                    photo_url TEXT,
                    status penalty_status DEFAULT 'open'
                );
            """))
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS maintenances (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    type maintenance_type NOT NULL,
                    description TEXT,
                    receipt_url TEXT
                );
            """))
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS materials (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    type material_type NOT NULL,
                    description TEXT
                );
            """))
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS material_assignments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
                    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
                    quantity INTEGER NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE,
                    status material_status DEFAULT 'active'
                );
            """))
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS material_history (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
                    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    event material_event NOT NULL,
                    description TEXT
                );
            """))
            
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS expenses (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    type expense_type NOT NULL,
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    amount NUMERIC(10,2) NOT NULL,
                    description TEXT,
                    receipt_url TEXT
                );
            """))
            
            # Add foreign key constraint for team lead
            conn.execute(text("""
                DO $$ BEGIN
                    ALTER TABLE teams ADD CONSTRAINT fk_teams_lead_id 
                    FOREIGN KEY (lead_id) REFERENCES users(id);
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))
            
            conn.commit()
            
    except SQLAlchemyError as e:
        raise Exception(f"Database initialization failed: {str(e)}")

def execute_query(query: str, params: dict = None):
    """Execute a query and return results"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            if result.returns_rows:
                return result.fetchall()
            conn.commit()
            return True
    except SQLAlchemyError as e:
        raise Exception(f"Query execution failed: {str(e)}")
