"""
Simple database initialization without complex SQL blocks
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/fleet_db')

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=20,
    max_overflow=0
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session() -> Session:
    """Get database session"""
    return SessionLocal()

def execute_query(query, params=None):
    """Execute a query and return results with better error handling"""
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            with engine.connect() as connection:
                if params:
                    result = connection.execute(text(query), params)
                else:
                    result = connection.execute(text(query))
                
                # If it's a SELECT query, fetch results
                if query.strip().upper().startswith('SELECT'):
                    return result.fetchall()
                else:
                    connection.commit()
                    return True
        except Exception as e:
            retry_count += 1
            print(f"Database error (attempt {retry_count}/{max_retries}): {e}")
            
            if retry_count >= max_retries:
                # If this is an SSL connection error, try to dispose and recreate the engine
                if "SSL connection has been closed unexpectedly" in str(e):
                    engine.dispose()
                raise e
            
            # Wait a bit before retrying
            import time
            time.sleep(1)

def migrate_user_role_enum():
    """Ensure user_role enum has 'owner' value - safe to run multiple times"""
    try:
        with engine.connect() as conn:
            # Check if owner role exists
            result = conn.execute(text("""
                SELECT COUNT(*) FROM pg_enum 
                WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'owner'
            """))
            
            if result.scalar() == 0:
                conn.execute(text("ALTER TYPE user_role ADD VALUE 'owner'"))
                conn.commit()
                print("✅ Added 'owner' role to user_role enum")
            
    except Exception as e:
        print(f"⚠️ Could not migrate user_role enum: {e}")
        # Don't fail the app startup
        pass

def init_db():
    """Initialize database with simple approach"""
    try:
        # Always run enum migration first
        migrate_user_role_enum()
        
        # Check if database is already initialized
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'organizations'"))
            count = result.scalar()
            if count and count > 0:
                print("Database already initialized")
                return True
        
        # Use autocommit for individual DDL statements  
        with engine.connect() as conn:
            # Set autocommit mode
            trans = conn.begin()
            
            try:
                # Create enum types using simple CREATE statements with error handling
                enum_statements = [
                    "CREATE TYPE vehicle_status AS ENUM ('active', 'repair', 'unavailable')",
                    "CREATE TYPE user_role AS ENUM ('admin', 'manager', 'team_lead', 'worker')",
                    "CREATE TYPE penalty_status AS ENUM ('open', 'paid')",
                    "CREATE TYPE maintenance_type AS ENUM ('inspection', 'repair')",
                    "CREATE TYPE material_type AS ENUM ('material', 'equipment')",
                    "CREATE TYPE material_status AS ENUM ('active', 'returned', 'broken')",
                    "CREATE TYPE expense_type AS ENUM ('vehicle', 'team')",
                    "CREATE TYPE material_event AS ENUM ('assigned', 'returned', 'broken')"
                ]
                
                for stmt in enum_statements:
                    try:
                        conn.execute(text(stmt))
                    except Exception:
                        pass  # Type already exists
                
                # Migration: Add 'owner' to user_role enum if it doesn't exist
                try:
                    result = conn.execute(text("""
                        SELECT COUNT(*) FROM pg_enum 
                        WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'owner'
                    """))
                    if result.scalar() == 0:
                        conn.execute(text("ALTER TYPE user_role ADD VALUE 'owner'"))
                        print("Added 'owner' role to user_role enum")
                except Exception as e:
                    print(f"Could not add 'owner' to enum: {e}")
                    pass
                
                # Create organizations table first
                try:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS organizations (
                            id UUID PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            subscription_status VARCHAR(50) DEFAULT 'active',
                            subscription_expires_at TIMESTAMP
                        )
                    """))
                    print("Organizations table created successfully")
                except Exception as e:
                    print(f"Error creating organizations table: {e}")
                    raise
                
                # Create tables without foreign key dependencies first
                table_statements = [
                """CREATE TABLE IF NOT EXISTS teams (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    lead_id UUID,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                
                """CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    phone TEXT,
                    role user_role NOT NULL,
                    team_id UUID REFERENCES teams(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                
                """CREATE TABLE IF NOT EXISTS vehicles (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    license_plate TEXT,
                    vin TEXT,
                    status vehicle_status DEFAULT 'active',
                    photo_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(organization_id, license_plate),
                    UNIQUE(organization_id, vin)
                )""",
                
                """CREATE TABLE IF NOT EXISTS vehicle_assignments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
                    start_date DATE NOT NULL,
                    end_date DATE
                )""",
                
                """CREATE TABLE IF NOT EXISTS penalties (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id),
                    team_id UUID REFERENCES teams(id),
                    date DATE NOT NULL,
                    amount NUMERIC(10,2) NOT NULL,
                    photo_url TEXT,
                    description TEXT,
                    status penalty_status DEFAULT 'open'
                )""",
                
                """CREATE TABLE IF NOT EXISTS maintenances (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    type maintenance_type NOT NULL,
                    description TEXT,
                    receipt_url TEXT
                )""",
                
                """CREATE TABLE IF NOT EXISTS materials (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    type material_type NOT NULL,
                    unit_price NUMERIC(10,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                
                """CREATE TABLE IF NOT EXISTS material_assignments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
                    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
                    quantity INTEGER DEFAULT 1,
                    status material_status DEFAULT 'active',
                    event material_event NOT NULL,
                    date DATE NOT NULL,
                    notes TEXT
                )""",
                
                """CREATE TABLE IF NOT EXISTS car_expenses (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    amount NUMERIC(10,2) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    description TEXT,
                    receipt_url TEXT,
                    maintenance_id UUID
                )""",
                
                """CREATE TABLE IF NOT EXISTS vehicle_documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    document_type VARCHAR(100) NOT NULL,
                    document_number VARCHAR(100),
                    issue_date DATE,
                    expiry_date DATE,
                    file_url TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                
                """CREATE TABLE IF NOT EXISTS user_documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    document_type VARCHAR(100) NOT NULL,
                    document_number VARCHAR(100),
                    issue_date DATE,
                    expiry_date DATE,
                    file_url TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )"""
            ]
            
                for i, stmt in enumerate(table_statements):
                    try:
                        conn.execute(text(stmt))
                        print(f"Table {i+1} created successfully")
                    except Exception as e:
                        print(f"Error creating table {i+1}: {e}")
                        raise
                
                # Add foreign key constraints after all tables are created
                constraint_statements = [
                    "ALTER TABLE teams ADD CONSTRAINT IF NOT EXISTS fk_teams_lead_id FOREIGN KEY (lead_id) REFERENCES users(id)"
                ]
                
                for stmt in constraint_statements:
                    try:
                        conn.execute(text(stmt))
                    except Exception:
                        pass  # Constraint already exists
                
                trans.commit()
                print("Database initialized successfully!")
                
            except Exception as e:
                trans.rollback()
                raise e
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        # Don't raise the error to allow app to continue
        return False
    
    return True