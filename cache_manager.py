"""
Cache manager for optimizing database queries and improving performance
"""
import streamlit as st
from datetime import datetime, timedelta
from database import execute_query
import hashlib
import json

# Cache duration in seconds
CACHE_TTL = 300  # 5 minutes

@st.cache_data(ttl=CACHE_TTL)
def get_cached_vehicles():
    """Get all vehicles with caching"""
    return execute_query("""
        SELECT id, name, license_plate, vin, status, model, year 
        FROM vehicles 
        ORDER BY name
    """)

@st.cache_data(ttl=CACHE_TTL)
def get_cached_teams():
    """Get all teams with caching"""
    return execute_query("""
        SELECT id, name, leader_id 
        FROM teams 
        ORDER BY name
    """)

@st.cache_data(ttl=CACHE_TTL)
def get_cached_users():
    """Get all users with caching"""
    return execute_query("""
        SELECT id, first_name, last_name, role, team_id 
        FROM users 
        ORDER BY first_name, last_name
    """)

@st.cache_data(ttl=CACHE_TTL)
def get_cached_materials():
    """Get materials with caching"""
    return execute_query("""
        SELECT 
            m.id,
            m.name,
            m.category,
            m.total_quantity,
            m.unit,
            m.unit_price,
            COALESCE(SUM(CASE WHEN ma.status = 'active' THEN ma.quantity ELSE 0 END), 0) as assigned_quantity
        FROM materials m
        LEFT JOIN material_assignments ma ON m.id = ma.material_id
        GROUP BY m.id, m.name, m.category, m.total_quantity, m.unit, m.unit_price
        ORDER BY m.name
    """)

@st.cache_data(ttl=60)  # Shorter cache for dashboard metrics
def get_dashboard_metrics():
    """Get dashboard metrics with caching"""
    vehicles_count = execute_query("SELECT COUNT(*) FROM vehicles")[0][0]
    teams_count = execute_query("SELECT COUNT(*) FROM teams")[0][0]
    users_count = execute_query("SELECT COUNT(*) FROM users")[0][0]
    open_penalties = execute_query(
        "SELECT COUNT(*) FROM penalties WHERE status = 'open' AND (description IS NULL OR description NOT LIKE '%Поломка материала%')"
    )[0][0]
    
    return {
        'vehicles': vehicles_count,
        'teams': teams_count,
        'users': users_count,
        'open_penalties': open_penalties
    }

@st.cache_data(ttl=CACHE_TTL)
def get_vehicle_assignments():
    """Get vehicle assignments with caching"""
    return execute_query("""
        SELECT va.id, va.vehicle_id, va.team_id, va.start_date, va.end_date,
               v.name as vehicle_name, t.name as team_name
        FROM vehicle_assignments va
        JOIN vehicles v ON va.vehicle_id = v.id
        JOIN teams t ON va.team_id = t.id
        WHERE va.end_date IS NULL
        ORDER BY va.start_date DESC
    """)

@st.cache_data(ttl=CACHE_TTL)
def get_recent_penalties(limit=10):
    """Get recent penalties with caching"""
    return execute_query(f"""
        SELECT 
            p.id,
            p.date,
            v.name as vehicle_name,
            v.license_plate,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            p.amount,
            p.status,
            p.photo_url
        FROM penalties p
        JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE (p.description IS NULL OR p.description NOT LIKE '%Поломка материала%')
        ORDER BY p.date DESC
        LIMIT {limit}
    """)

@st.cache_data(ttl=CACHE_TTL)
def get_recent_expenses(expense_type='car', limit=10):
    """Get recent expenses with caching"""
    if expense_type == 'car':
        return execute_query(f"""
            SELECT 
                ce.id,
                ce.date,
                v.name as vehicle_name,
                ce.category,
                ce.amount,
                ce.description
            FROM car_expenses ce
            JOIN vehicles v ON ce.vehicle_id = v.id
            ORDER BY ce.date DESC
            LIMIT {limit}
        """)
    else:
        return execute_query(f"""
            SELECT 
                p.id,
                p.date,
                t.name as team_name,
                p.amount,
                p.description
            FROM penalties p
            JOIN teams t ON p.team_id = t.id
            WHERE p.description LIKE '%Поломка материала%'
            ORDER BY p.date DESC
            LIMIT {limit}
        """)

def clear_cache():
    """Clear all cached data"""
    st.cache_data.clear()
    
def clear_specific_cache(func_name):
    """Clear cache for specific function"""
    try:
        if func_name == 'vehicles':
            get_cached_vehicles.clear()
        elif func_name == 'teams':
            get_cached_teams.clear()
        elif func_name == 'users':
            get_cached_users.clear()
        elif func_name == 'materials':
            get_cached_materials.clear()
        elif func_name == 'dashboard':
            get_dashboard_metrics.clear()
    except:
        pass