import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, get_users_for_select
from datetime import datetime
import uuid

def show_page(language='ru'):
    """Show teams management page"""
    st.title(f"👥 {get_text('teams', language)}")
    
    # Tabs for different views
    tab1, tab2 = st.tabs([
        get_text('teams', language),
        get_text('add', language)
    ])
    
    with tab1:
        show_teams_list(language)
    
    with tab2:
        show_add_team_form(language)

def show_teams_list(language='ru'):
    """Show list of teams"""
    try:
        # Search and export controls
        col1, col2 = st.columns([3, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder=f"{get_text('name', language)}..."
            )
        
        with col2:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_teams_data(language)
        
        # Build query with search
        query = """
            SELECT 
                t.id,
                t.name,
                t.created_at,
                CONCAT(u.first_name, ' ', u.last_name) as lead_name,
                COUNT(DISTINCT tm.id) as members_count,
                COUNT(DISTINCT va.vehicle_id) as vehicles_count
            FROM teams t
            LEFT JOIN users u ON t.lead_id = u.id
            LEFT JOIN users tm ON t.id = tm.team_id
            LEFT JOIN vehicle_assignments va ON t.id = va.team_id AND va.end_date IS NULL
            WHERE 1=1
        """
        params = {}
        
        if search_term:
            query += " AND t.name ILIKE :search"
            params['search'] = f"%{search_term}%"
        
        query += """
            GROUP BY t.id, t.name, t.created_at, u.first_name, u.last_name
            ORDER BY t.name
        """
        
        teams = execute_query(query, params)
        
        if teams:
            for team in teams:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{team[1]}**")
                        if team[3]:
                            st.write(f"{get_text('team_lead', language)}: {team[3]}")
                        else:
                            st.write(f"{get_text('team_lead', language)}: Не назначен/Nicht zugewiesen")
                    
                    with col2:
                        st.write(f"👤 {get_text('users', language)}: {team[4]}")
                        st.write(f"🚗 {get_text('vehicles', language)}: {team[5]}")
                    
                    with col3:
                        created_date = team[2]
                        if isinstance(created_date, str):
                            created_date = datetime.fromisoformat(created_date.replace('Z', '+00:00'))
                        st.write(f"{get_text('date', language)}: {created_date.strftime('%d.%m.%Y')}")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_btn_team_{team[0]}"):
                            st.session_state[f"edit_team_{team[0]}"] = True
                        if st.button(f"🗑️", key=f"delete_team_{team[0]}"):
                            delete_team(team[0], language)
                        if st.button(f"👥", key=f"manage_team_{team[0]}"):
                            show_team_details(team[0], language)
                    
                    # Show edit form if requested
                    if st.session_state.get(f"edit_team_{team[0]}", False):
                        show_edit_team_form(team, language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading teams: {str(e)}")

def show_add_team_form(language='ru'):
    """Show form to add new team"""
    st.subheader(f"{get_text('add', language)} {get_text('teams', language)}")
    
    with st.form("add_team_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            name = st.text_input(get_text('name', language), key="new_team_name")
        
        with col2:
            # Get users for team lead selection
            users = get_users_for_select(language)
            lead_id = None
            if users:
                lead_options = [('', 'Не выбран/Nicht ausgewählt')] + users
                selected_lead = st.selectbox(
                    get_text('team_lead', language),
                    options=[option[0] for option in lead_options],
                    format_func=lambda x: next(option[1] for option in lead_options if option[0] == x),
                    key="new_team_lead"
                )
                lead_id = selected_lead if selected_lead else None
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            if not name:
                st.error("Название обязательно / Name ist erforderlich")
            else:
                try:
                    team_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO teams (id, name, lead_id)
                        VALUES (:id, :name, :lead_id)
                    """, {
                        'id': team_id,
                        'name': name,
                        'lead_id': lead_id if lead_id else None
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")

def show_edit_team_form(team, language='ru'):
    """Show form to edit team"""
    with st.expander(f"✏️ {get_text('edit', language)}: {team[1]}", expanded=True):
        with st.form(f"edit_team_form_{team[0]}"):
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input(
                    get_text('name', language),
                    value=team[1],
                    key=f"edit_team_name_{team[0]}"
                )
            
            with col2:
                # Get users for team lead selection
                users = get_users_for_select(language)
                current_lead = team[3] if team[3] else None
                lead_id = None
                
                if users:
                    lead_options = [('', 'Не выбран/Nicht ausgewählt')] + users
                    # Find current lead index
                    current_index = 0
                    if current_lead:
                        for i, option in enumerate(lead_options):
                            if option[1] == current_lead:
                                current_index = i
                                break
                    
                    selected_lead = st.selectbox(
                        get_text('team_lead', language),
                        options=[option[0] for option in lead_options],
                        format_func=lambda x: next(option[1] for option in lead_options if option[0] == x),
                        index=current_index,
                        key=f"edit_team_lead_{team[0]}"
                    )
                    lead_id = selected_lead if selected_lead else None
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                submitted = st.form_submit_button(get_text('save', language))
            
            with col_cancel:
                cancelled = st.form_submit_button(get_text('cancel', language))
            
            if submitted:
                try:
                    execute_query("""
                        UPDATE teams 
                        SET name = :name, lead_id = :lead_id
                        WHERE id = :id
                    """, {
                        'id': team[0],
                        'name': name,
                        'lead_id': lead_id if lead_id else None
                    })
                    if f"edit_team_{team[0]}" in st.session_state:
                        del st.session_state[f"edit_team_{team[0]}"]
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")
            
            if cancelled:
                if f"edit_team_{team[0]}" in st.session_state:
                    del st.session_state[f"edit_team_{team[0]}"]
                st.rerun()

def delete_team(team_id, language='ru'):
    """Delete team"""
    try:
        # Check if team has users or assignments
        users_count = execute_query(
            "SELECT COUNT(*) FROM users WHERE team_id = :id", 
            {'id': team_id}
        )[0][0]
        
        assignments_count = execute_query(
            "SELECT COUNT(*) FROM vehicle_assignments WHERE team_id = :id", 
            {'id': team_id}
        )[0][0]
        
        if users_count > 0 or assignments_count > 0:
            st.error("Нельзя удалить бригаду с пользователями или назначениями / Team mit Benutzern oder Zuweisungen kann nicht gelöscht werden")
            return
        
        execute_query("DELETE FROM teams WHERE id = :id", {'id': team_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"{get_text('error_delete', language)}: {str(e)}")

def show_team_details(team_id, language='ru'):
    """Show team details in an expander"""
    try:
        # Get team info
        team_info = execute_query("""
            SELECT t.name, CONCAT(u.first_name, ' ', u.last_name) as lead_name
            FROM teams t
            LEFT JOIN users u ON t.lead_id = u.id
            WHERE t.id = :id
        """, {'id': team_id})
        
        if not team_info:
            st.error("Team not found")
            return
        
        team_name = team_info[0][0]
        
        # Use main content area instead of expander for better visibility
        st.markdown("---")
        st.subheader(f"👥 {team_name} - Детали/Details")
        
        # Create tabs for better organization
        tab1, tab2, tab3 = st.tabs([
            f"👤 {get_text('users', language)}",
            f"🚗 {get_text('vehicles', language)}",
            f"💰 {get_text('expenses', language)}"
        ])
        
        with tab1:
            # Team members in a more readable format
            members = execute_query("""
                SELECT CONCAT(first_name, ' ', last_name) as name, phone, role
                FROM users
                WHERE team_id = :id
                ORDER BY role, first_name, last_name
            """, {'id': team_id})
            
            if members:
                # Create a table-like display
                st.markdown("**Участники бригады / Teammitglieder:**")
                
                # Header
                col1, col2, col3 = st.columns([3, 2, 2])
                with col1:
                    st.markdown("**Имя/Name**")
                with col2:
                    st.markdown("**Телефон/Telefon**")
                with col3:
                    st.markdown("**Роль/Rolle**")
                
                st.markdown("---")
                
                # Member rows
                for member in members:
                    col1, col2, col3 = st.columns([3, 2, 2])
                    with col1:
                        st.write(member[0])
                    with col2:
                        st.write(member[1] or '-')
                    with col3:
                        st.write(get_text(member[2], language))
            else:
                st.info("Нет участников / Keine Mitglieder")
            
        with tab2:
            # Assigned vehicles in a cleaner format
            vehicles = execute_query("""
                SELECT v.name, v.license_plate, va.start_date
                FROM vehicle_assignments va
                JOIN vehicles v ON va.vehicle_id = v.id
                WHERE va.team_id = :id AND va.end_date IS NULL
                ORDER BY v.name
            """, {'id': team_id})
            
            if vehicles:
                st.markdown("**Назначенные автомобили / Zugewiesene Fahrzeuge:**")
                
                # Header
                col1, col2, col3 = st.columns([3, 2, 2])
                with col1:
                    st.markdown("**Название/Name**")
                with col2:
                    st.markdown("**Номер/Kennzeichen**")
                with col3:
                    st.markdown("**Дата назначения/Zuweisungsdatum**")
                
                st.markdown("---")
                
                # Vehicle rows
                for vehicle in vehicles:
                    col1, col2, col3 = st.columns([3, 2, 2])
                    with col1:
                        st.write(vehicle[0])
                    with col2:
                        st.write(vehicle[1])
                    with col3:
                        start_date = vehicle[2].strftime('%d.%m.%Y') if vehicle[2] else '-'
                        st.write(start_date)
            else:
                st.info("Нет назначенных автомобилей / Keine zugewiesenen Fahrzeuge")
            
        with tab3:
            # Recent expenses from new structure
            st.markdown("**Последние расходы бригады / Letzte Brigadeausgaben:**")
            expenses = execute_query("""
                SELECT date, amount, description, category
                FROM brigade_expenses
                WHERE brigade_id = :id
                ORDER BY date DESC
                LIMIT 10
            """, {'id': team_id})
            
            if expenses:
                # Header
                col1, col2, col3, col4 = st.columns([2, 1, 2, 2])
                with col1:
                    st.markdown("**Дата/Datum**")
                with col2:
                    st.markdown("**Сумма (€)/Betrag (€)**")
                with col3:
                    st.markdown("**Категория/Kategorie**")
                with col4:
                    st.markdown("**Описание/Beschreibung**")
                
                st.markdown("---")
                
                # Expense rows
                for expense in expenses:
                    col1, col2, col3, col4 = st.columns([2, 1, 2, 2])
                    with col1:
                        date_str = expense[0].strftime('%d.%m.%Y') if expense[0] else '-'
                        st.write(date_str)
                    with col2:
                        st.write(f"€{expense[1]:.2f}")
                    with col3:
                        category_display = expense[3] if expense[3] else '-'
                        if expense[3] == 'broken_equipment':
                            category_display = 'Поломка оборудования/Ausrüstungsschaden'
                        elif expense[3] == 'fine':
                            category_display = 'Штраф/Strafe'
                        st.write(category_display)
                    with col4:
                        st.write(expense[2] or '-')
            else:
                st.info("Нет расходов / Keine Ausgaben")
    
    except Exception as e:
        st.error(f"Error loading team details: {str(e)}")

def export_teams_data(language='ru'):
    """Export teams data to CSV"""
    try:
        teams = execute_query("""
            SELECT 
                t.name,
                CONCAT(u.first_name, ' ', u.last_name) as lead_name,
                t.created_at,
                COUNT(DISTINCT tm.id) as members_count,
                COUNT(DISTINCT va.vehicle_id) as vehicles_count
            FROM teams t
            LEFT JOIN users u ON t.lead_id = u.id
            LEFT JOIN users tm ON t.id = tm.team_id
            LEFT JOIN vehicle_assignments va ON t.id = va.team_id AND va.end_date IS NULL
            GROUP BY t.id, t.name, t.created_at, u.first_name, u.last_name
            ORDER BY t.name
        """)
        
        if teams:
            export_to_csv(teams, "teams")
        else:
            st.warning(get_text('no_data', language))
    except Exception as e:
        st.error(f"Export error: {str(e)}")
