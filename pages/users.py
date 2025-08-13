import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, get_teams_for_select
from datetime import datetime
import uuid

def show_page(language='ru'):
    """Show users management page"""
    st.title(f"👤 {get_text('users', language)}")
    
    # Tabs for different views
    tab1, tab2 = st.tabs([
        get_text('users', language),
        get_text('add', language)
    ])
    
    with tab1:
        show_users_list(language)
    
    with tab2:
        show_add_user_form(language)

def show_users_list(language='ru'):
    """Show list of users"""
    try:
        # Filters
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder=f"{get_text('name', language)}, {get_text('phone', language)}..."
            )
        
        with col2:
            role_filter = st.selectbox(
                get_text('role', language),
                options=['all', 'admin', 'manager', 'team_lead'],
                format_func=lambda x: get_text(x, language) if x != 'all' else 'Все/Alle'
            )
        
        with col3:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_users_data(language)
        
        # Build query with filters
        query = """
            SELECT 
                u.id,
                u.name,
                u.phone,
                u.role,
                t.name as team_name
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            WHERE 1=1
        """
        params = {}
        
        if search_term:
            query += """ AND (
                u.name ILIKE %(search)s OR 
                u.phone ILIKE %(search)s
            )"""
            params['search'] = f"%{search_term}%"
        
        if role_filter != 'all':
            query += " AND u.role = %(role)s"
            params['role'] = role_filter
        
        query += " ORDER BY u.name"
        
        users = execute_query(query, params)
        
        if users:
            for user in users:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{user[1]}**")
                        if user[2]:
                            st.write(f"📞 {user[2]}")
                    
                    with col2:
                        role_icon = {
                            'admin': '👑',
                            'manager': '💼',
                            'team_lead': '🎯'
                        }.get(user[3], '👤')
                        st.write(f"{role_icon} {get_text(user[3], language)}")
                    
                    with col3:
                        team_name = user[4] or 'Не назначен/Nicht zugewiesen'
                        st.write(f"{get_text('team', language)}: {team_name}")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_user_{user[0]}"):
                            show_edit_user_form(user, language)
                        if st.button(f"🗑️", key=f"delete_user_{user[0]}"):
                            delete_user(user[0], language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading users: {str(e)}")

def show_add_user_form(language='ru'):
    """Show form to add new user"""
    st.subheader(f"{get_text('add', language)} {get_text('users', language)}")
    
    with st.form("add_user_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            name = st.text_input(get_text('name', language), key="new_user_name")
            phone = st.text_input(get_text('phone', language), key="new_user_phone")
        
        with col2:
            role = st.selectbox(
                get_text('role', language),
                options=['admin', 'manager', 'team_lead'],
                format_func=lambda x: get_text(x, language),
                key="new_user_role"
            )
            
            # Get teams for selection
            teams = get_teams_for_select(language)
            team_id = None
            if teams:
                team_options = [('', 'Не выбрана/Nicht ausgewählt')] + teams
                selected_team = st.selectbox(
                    get_text('team', language),
                    options=[option[0] for option in team_options],
                    format_func=lambda x: next(option[1] for option in team_options if option[0] == x),
                    key="new_user_team"
                )
                team_id = selected_team if selected_team else None
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            if not name:
                st.error("Имя обязательно / Name ist erforderlich")
            else:
                try:
                    user_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO users (id, name, phone, role, team_id)
                        VALUES (%(id)s, %(name)s, %(phone)s, %(role)s, %(team_id)s)
                    """, {
                        'id': user_id,
                        'name': name,
                        'phone': phone if phone else None,
                        'role': role,
                        'team_id': team_id if team_id else None
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")

def show_edit_user_form(user, language='ru'):
    """Show form to edit user"""
    with st.expander(f"✏️ {get_text('edit', language)}: {user[1]}", expanded=True):
        with st.form(f"edit_user_form_{user[0]}"):
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input(
                    get_text('name', language),
                    value=user[1],
                    key=f"edit_user_name_{user[0]}"
                )
                phone = st.text_input(
                    get_text('phone', language),
                    value=user[2] or '',
                    key=f"edit_user_phone_{user[0]}"
                )
            
            with col2:
                role = st.selectbox(
                    get_text('role', language),
                    options=['admin', 'manager', 'team_lead'],
                    index=['admin', 'manager', 'team_lead'].index(user[3]),
                    format_func=lambda x: get_text(x, language),
                    key=f"edit_user_role_{user[0]}"
                )
                
                # Get teams for selection
                teams = get_teams_for_select(language)
                current_team = user[4] if user[4] else None
                team_id = None
                
                if teams:
                    team_options = [('', 'Не выбрана/Nicht ausgewählt')] + teams
                    # Find current team index
                    current_index = 0
                    if current_team:
                        for i, option in enumerate(team_options):
                            if option[1] == current_team:
                                current_index = i
                                break
                    
                    selected_team = st.selectbox(
                        get_text('team', language),
                        options=[option[0] for option in team_options],
                        format_func=lambda x: next(option[1] for option in team_options if option[0] == x),
                        index=current_index,
                        key=f"edit_user_team_{user[0]}"
                    )
                    team_id = selected_team if selected_team else None
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                submitted = st.form_submit_button(get_text('save', language))
            
            with col_cancel:
                cancelled = st.form_submit_button(get_text('cancel', language))
            
            if submitted:
                try:
                    execute_query("""
                        UPDATE users 
                        SET name = %(name)s, phone = %(phone)s, role = %(role)s, team_id = %(team_id)s
                        WHERE id = %(id)s
                    """, {
                        'id': user[0],
                        'name': name,
                        'phone': phone if phone else None,
                        'role': role,
                        'team_id': team_id if team_id else None
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")
            
            if cancelled:
                st.rerun()

def delete_user(user_id, language='ru'):
    """Delete user"""
    try:
        # Check if user is team lead
        team_lead_count = execute_query(
            "SELECT COUNT(*) FROM teams WHERE lead_id = %(id)s", 
            {'id': user_id}
        )[0][0]
        
        if team_lead_count > 0:
            st.error("Нельзя удалить пользователя, который является бригадиром / Benutzer, der Teamleiter ist, kann nicht gelöscht werden")
            return
        
        execute_query("DELETE FROM users WHERE id = %(id)s", {'id': user_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"{get_text('error_delete', language)}: {str(e)}")

def export_users_data(language='ru'):
    """Export users data to CSV"""
    try:
        users = execute_query("""
            SELECT 
                u.name,
                u.phone,
                u.role,
                t.name as team_name
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            ORDER BY u.name
        """)
        
        if users:
            export_to_csv(users, "users")
        else:
            st.warning(get_text('no_data', language))
    except Exception as e:
        st.error(f"Export error: {str(e)}")
