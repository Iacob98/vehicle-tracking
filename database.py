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
    max_overflow=10,
    pool_size=5,
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session() -> Session:
    """Get database session"""
    return SessionLocal()

def execute_query(query, params=None):
    """Execute a query and return results with optimized error handling"""
    try:
        with engine.connect() as connection:
            if params:
                result = connection.execute(text(query), params)
            else:
                result = connection.execute(text(query))
            
            # If it's a SELECT query, fetch results
            if query.strip().upper().startswith('SELECT'):
                rows = result.fetchall()
                return rows if rows else []
            else:
                connection.commit()
                return True
    except Exception as e:
        print(f"Database error: {e}")
        if "SSL connection has been closed unexpectedly" in str(e):
            engine.dispose()
        # Return empty list for SELECT queries, False for others
        if query.strip().upper().startswith('SELECT'):
            return []
        return False

def init_db():
    """Initialize database with simple approach"""
    try:
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
                
                # Create tables
                table_statements = [
                """CREATE TABLE IF NOT EXISTS teams (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    lead_id UUID,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                
                """CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    phone TEXT,
                    role user_role NOT NULL,
                    team_id UUID REFERENCES teams(id)
                )""",
                
                """CREATE TABLE IF NOT EXISTS vehicles (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    license_plate TEXT UNIQUE,
                    vin TEXT UNIQUE,
                    status vehicle_status DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id),
                    date DATE NOT NULL,
                    amount NUMERIC(10,2) NOT NULL,
                    photo_url TEXT,
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
                    name TEXT NOT NULL,
                    type material_type NOT NULL,
                    total_quantity INTEGER DEFAULT 0,
                    available_quantity INTEGER DEFAULT 0,
                    unit_price NUMERIC(10,2) DEFAULT 0,
                    photo_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                
                """CREATE TABLE IF NOT EXISTS material_assignments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
                    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
                    event material_event NOT NULL,
                    date DATE NOT NULL,
                    notes TEXT
                )""",
                
                """CREATE TABLE IF NOT EXISTS car_expenses (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    category TEXT NOT NULL,
                    amount NUMERIC(10,2) NOT NULL,
                    description TEXT,
                    file_url TEXT,
                    maintenance_id UUID REFERENCES maintenances(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )"""
            ]
            
                for stmt in table_statements:
                    conn.execute(text(stmt))
                
                # Add foreign key constraints
                constraint_statements = [
                    "ALTER TABLE teams ADD CONSTRAINT IF NOT EXISTS fk_teams_lead_id FOREIGN KEY (lead_id) REFERENCES users(id)",
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