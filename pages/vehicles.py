import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, show_pagination, paginate_data
from datetime import datetime
import uuid

def show_page(language='ru'):
    """Show vehicles management page"""
    st.title(f"🚗 {get_text('vehicles', language)}")
    
    # Tabs for different views
    tab1, tab2, tab3 = st.tabs([
        get_text('vehicles', language),
        get_text('add', language),
        f"{get_text('vehicles', language)} - {get_text('teams', language)}"
    ])
    
    with tab1:
        show_vehicles_list(language)
    
    with tab2:
        show_add_vehicle_form(language)
    
    with tab3:
        show_vehicle_assignments(language)

def show_vehicles_list(language='ru'):
    """Show list of vehicles"""
    try:
        # Filters
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder=f"{get_text('name', language)}, {get_text('license_plate', language)}, VIN..."
            )
        
        with col2:
            status_filter = st.selectbox(
                get_text('status', language),
                options=['all', 'active', 'repair', 'unavailable'],
                format_func=lambda x: get_text(x, language) if x != 'all' else get_text('all', language)
            )
        
        with col3:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_vehicles_data(language)
        
        # Build query with filters
        query = """
            SELECT 
                v.id,
                v.name,
                v.license_plate,
                v.vin,
                v.status,
                v.created_at,
                t.name as team_name
            FROM vehicles v
            LEFT JOIN vehicle_assignments va ON v.id = va.vehicle_id AND va.end_date IS NULL
            LEFT JOIN teams t ON va.team_id = t.id
            WHERE 1=1
        """
        params = {}
        
        if search_term:
            query += """ AND (
                v.name ILIKE :search OR 
                v.license_plate ILIKE :search OR 
                v.vin ILIKE :search
            )"""
            params['search'] = f"%{search_term}%"
        
        if status_filter != 'all':
            query += " AND v.status = :status"
            params['status'] = status_filter
        
        query += " ORDER BY v.name"
        
        vehicles = execute_query(query, params)
        
        if vehicles:
            # Convert to list of dictionaries for easier handling
            vehicles_data = []
            for vehicle in vehicles:
                vehicles_data.append({
                    'id': vehicle[0],
                    'name': vehicle[1],
                    'license_plate': vehicle[2],
                    'vin': vehicle[3],
                    'status': vehicle[4],
                    'created_at': vehicle[5],
                    'team_name': vehicle[6] or 'Не назначен/Nicht zugewiesen'
                })
            
            # Pagination
            page_data, current_page, total_pages = paginate_data(vehicles_data, 10)
            
            # Display vehicles
            for vehicle in page_data:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{vehicle['name']}**")
                        st.write(f"{get_text('license_plate', language)}: {vehicle['license_plate']}")
                        if vehicle['vin']:
                            st.write(f"VIN: {vehicle['vin']}")
                    
                    with col2:
                        status_color = {
                            'active': '🟢',
                            'repair': '🟡',
                            'unavailable': '🔴'
                        }.get(vehicle['status'], '⚪')
                        st.write(f"{status_color} {get_text(vehicle['status'], language)}")
                        st.write(f"{get_text('team', language)}: {vehicle['team_name']}")
                    
                    with col3:
                        created_date = vehicle['created_at']
                        if isinstance(created_date, str):
                            created_date = datetime.fromisoformat(created_date.replace('Z', '+00:00'))
                        st.write(f"{get_text('date', language)}: {created_date.strftime('%d.%m.%Y')}")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_{vehicle['id']}"):
                            st.session_state[f"edit_vehicle_{vehicle['id']}"] = True
                        if st.button(f"🗑️", key=f"delete_{vehicle['id']}"):
                            delete_vehicle(vehicle['id'], language)
                    
                    # Show edit form if requested
                    if st.session_state.get(f"edit_vehicle_{vehicle['id']}", False):
                        show_edit_vehicle_form(vehicle, language)
                    
                    st.divider()
            
            # Pagination controls
            show_pagination(current_page, total_pages, language)
            
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading vehicles: {str(e)}")

def show_add_vehicle_form(language='ru'):
    """Show form to add new vehicle"""
    st.subheader(f"{get_text('add', language)} {get_text('vehicles', language)}")
    
    with st.form("add_vehicle_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            name = st.text_input(get_text('vehicle_name', language), key="new_vehicle_name")
            license_plate = st.text_input(get_text('license_plate', language), key="new_license_plate")
        
        with col2:
            vin = st.text_input(get_text('vin', language), key="new_vin")
            status = st.selectbox(
                get_text('status', language),
                options=['active', 'repair', 'unavailable'],
                format_func=lambda x: get_text(x, language),
                key="new_status"
            )
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            if not name or not license_plate:
                st.error("Название и номерной знак обязательны / Name und Kennzeichen sind erforderlich")
            else:
                try:
                    vehicle_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO vehicles (id, name, license_plate, vin, status)
                        VALUES (:id, :name, :license_plate, :vin, :status)
                    """, {
                        'id': vehicle_id,
                        'name': name,
                        'license_plate': license_plate,
                        'vin': vin if vin else None,
                        'status': status
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")

def show_edit_vehicle_form(vehicle, language='ru'):
    """Show form to edit vehicle"""
    with st.expander(f"✏️ {get_text('edit', language)}: {vehicle['name']}", expanded=True):
        with st.form(f"edit_vehicle_form_{vehicle['id']}"):
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input(
                    get_text('vehicle_name', language),
                    value=vehicle['name'],
                    key=f"edit_name_{vehicle['id']}"
                )
                license_plate = st.text_input(
                    get_text('license_plate', language),
                    value=vehicle['license_plate'],
                    key=f"edit_license_{vehicle['id']}"
                )
            
            with col2:
                vin = st.text_input(
                    get_text('vin', language),
                    value=vehicle['vin'] or '',
                    key=f"edit_vin_{vehicle['id']}"
                )
                status = st.selectbox(
                    get_text('status', language),
                    options=['active', 'repair', 'unavailable'],
                    index=['active', 'repair', 'unavailable'].index(vehicle['status']),
                    format_func=lambda x: get_text(x, language),
                    key=f"edit_status_{vehicle['id']}"
                )
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                submitted = st.form_submit_button(get_text('save', language))
            
            with col_cancel:
                cancelled = st.form_submit_button(get_text('cancel', language))
            
            if submitted:
                try:
                    execute_query("""
                        UPDATE vehicles 
                        SET name = :name, license_plate = :license_plate, 
                            vin = :vin, status = :status
                        WHERE id = :id
                    """, {
                        'id': vehicle['id'],
                        'name': name,
                        'license_plate': license_plate,
                        'vin': vin if vin else None,
                        'status': status
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")
            
            if cancelled:
                if f"edit_vehicle_{vehicle['id']}" in st.session_state:
                    del st.session_state[f"edit_vehicle_{vehicle['id']}"]
                st.rerun()
            
            if submitted:
                if f"edit_vehicle_{vehicle['id']}" in st.session_state:
                    del st.session_state[f"edit_vehicle_{vehicle['id']}"]

def delete_vehicle(vehicle_id, language='ru'):
    """Delete vehicle"""
    try:
        execute_query("DELETE FROM vehicles WHERE id = :id", {'id': vehicle_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"{get_text('error_delete', language)}: {str(e)}")

def show_vehicle_assignments(language='ru'):
    """Show vehicle assignments to teams"""
    st.subheader(f"{get_text('vehicles', language)} - {get_text('teams', language)}")
    
    # Add new assignment form
    with st.expander(f"{get_text('add', language)} назначение/Zuweisung"):
        show_add_assignment_form(language)
    
    # Current assignments
    try:
        assignments = execute_query("""
            SELECT 
                va.id,
                v.name as vehicle_name,
                v.license_plate,
                t.name as team_name,
                va.start_date,
                va.end_date
            FROM vehicle_assignments va
            JOIN vehicles v ON va.vehicle_id = v.id
            JOIN teams t ON va.team_id = t.id
            ORDER BY va.start_date DESC
        """)
        
        if assignments:
            for assignment in assignments:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{assignment[1]}** ({assignment[2]})")
                    
                    with col2:
                        st.write(f"{get_text('team', language)}: {assignment[3]}")
                    
                    with col3:
                        start_date = assignment[4].strftime('%d.%m.%Y') if assignment[4] else ''
                        end_date = assignment[5].strftime('%d.%m.%Y') if assignment[5] else 'Активно/Aktiv'
                        st.write(f"{start_date} - {end_date}")
                    
                    with col4:
                        if not assignment[5]:  # If end_date is None (active assignment)
                            if st.button("⏹️", key=f"end_assignment_{assignment[0]}"):
                                end_assignment(assignment[0], language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading assignments: {str(e)}")

def show_add_assignment_form(language='ru'):
    """Show form to add vehicle assignment"""
    with st.form("add_assignment_form"):
        col1, col2, col3 = st.columns(3)
        
        # Get vehicles and teams for selection
        vehicles = execute_query("SELECT id, name, license_plate FROM vehicles ORDER BY name")
        teams = execute_query("SELECT id, name FROM teams ORDER BY name")
        
        if not vehicles or not teams:
            st.warning("Необходимо создать автомобили и бригады / Fahrzeuge und Teams müssen erstellt werden")
            return
        
        with col1:
            vehicle_options = [(str(v[0]), f"{v[1]} ({v[2]})") for v in vehicles]
            vehicle_id = st.selectbox(
                get_text('vehicles', language),
                options=[v[0] for v in vehicle_options],
                format_func=lambda x: next(v[1] for v in vehicle_options if v[0] == x),
                key="assign_vehicle_id"
            )
        
        with col2:
            team_options = [(str(t[0]), t[1]) for t in teams]
            team_id = st.selectbox(
                get_text('teams', language),
                options=[t[0] for t in team_options],
                format_func=lambda x: next(t[1] for t in team_options if t[0] == x),
                key="assign_team_id"
            )
        
        with col3:
            start_date = st.date_input(
                "Дата начала/Startdatum",
                value=datetime.now().date(),
                key="assign_start_date"
            )
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            try:
                # End any existing assignment for this vehicle
                execute_query("""
                    UPDATE vehicle_assignments 
                    SET end_date = :date 
                    WHERE vehicle_id = :vehicle_id AND end_date IS NULL
                """, {
                    'date': start_date,
                    'vehicle_id': vehicle_id
                })
                
                # Create new assignment
                assignment_id = str(uuid.uuid4())
                execute_query("""
                    INSERT INTO vehicle_assignments (id, vehicle_id, team_id, start_date)
                    VALUES (:id, :vehicle_id, :team_id, :start_date)
                """, {
                    'id': assignment_id,
                    'vehicle_id': vehicle_id,
                    'team_id': team_id,
                    'start_date': start_date
                })
                
                st.success(get_text('success_save', language))
                st.rerun()
            except Exception as e:
                st.error(f"{get_text('error_save', language)}: {str(e)}")

def end_assignment(assignment_id, language='ru'):
    """End vehicle assignment"""
    try:
        execute_query("""
            UPDATE vehicle_assignments 
            SET end_date = CURRENT_DATE 
            WHERE id = :id
        """, {'id': assignment_id})
        st.success("Назначение завершено / Zuweisung beendet")
        st.rerun()
    except Exception as e:
        st.error(f"Ошибка завершения назначения / Fehler beim Beenden der Zuweisung: {str(e)}")

def export_vehicles_data(language='ru'):
    """Export vehicles data to CSV"""
    try:
        vehicles = execute_query("""
            SELECT 
                v.name,
                v.license_plate,
                v.vin,
                v.status,
                v.created_at,
                t.name as team_name
            FROM vehicles v
            LEFT JOIN vehicle_assignments va ON v.id = va.vehicle_id AND va.end_date IS NULL
            LEFT JOIN teams t ON va.team_id = t.id
            ORDER BY v.name
        """)
        
        if vehicles:
            export_to_csv(vehicles, "vehicles")
        else:
            st.warning(get_text('no_data', language))
    except Exception as e:
        st.error(f"Export error: {str(e)}")
