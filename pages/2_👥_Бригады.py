import streamlit as st
import uuid
from database import execute_query
from translations import get_text
from utils import export_to_csv
from datetime import datetime
from auth import require_auth, show_org_header

# Page config
st.set_page_config(
    page_title="Бригады",
    page_icon="👥",
    layout="wide"
)

# Require authentication
require_auth()
show_org_header()

# Language from session state
language = st.session_state.get('language', 'ru')

def show_teams_list():
    """Show list of teams with inline editing"""
    try:
        # Check if we're editing a team
        edit_team_id = st.session_state.get('edit_team_id', None)
        
        if edit_team_id:
            show_edit_team_form(edit_team_id)
            return
        
        teams = execute_query("""
            SELECT 
                t.id,
                t.name,
                CONCAT(u.first_name, ' ', u.last_name) as leader_name,
                t.lead_id,
                COUNT(DISTINCT usr.id) as users_count,
                COUNT(DISTINCT va.vehicle_id) as vehicles_count
            FROM teams t
            LEFT JOIN users u ON t.lead_id = u.id
            LEFT JOIN users usr ON t.id = usr.team_id
            LEFT JOIN vehicle_assignments va ON t.id = va.team_id 
                AND (va.end_date IS NULL OR va.end_date > CURRENT_DATE)
            GROUP BY t.id, t.name, u.first_name, u.last_name, t.lead_id
            ORDER BY t.name
        """)
        
        if teams:
            for team in teams:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{team[1]}**")
                        if team[2]:
                            st.write(f"👤 Лидер: {team[2]}")
                        else:
                            st.write("👤 Лидер: не назначен")
                    
                    with col2:
                        st.write(f"👥 Пользователей: {team[4]}")
                    
                    with col3:
                        st.write(f"🚗 Автомобилей: {team[5]}")
                    
                    with col4:
                        col_edit, col_delete = st.columns(2)
                        with col_edit:
                            if st.button("✏️", key=f"edit_team_{team[0]}", help="Редактировать"):
                                st.session_state.edit_team_id = team[0]
                                st.rerun()
                        with col_delete:
                            if st.button("🗑️", key=f"delete_team_{team[0]}", help="Удалить"):
                                delete_team(team[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Ошибка загрузки бригад: {str(e)}")

def show_edit_team_form(team_id):
    """Show form to edit existing team"""
    try:
        # Get current team data
        team_data = execute_query("""
            SELECT name, lead_id 
            FROM teams 
            WHERE id = :id
        """, {'id': team_id})
        
        if not team_data:
            st.error("Бригада не найдена")
            if st.button("⬅️ Назад к списку"):
                del st.session_state.edit_team_id
                st.rerun()
            return
        
        current_team = team_data[0]
        
        st.subheader("✏️ Редактировать бригаду / Team bearbeiten")
        
        if st.button("⬅️ Назад к списку / Zurück zur Liste"):
            del st.session_state.edit_team_id
            st.rerun()
        
        with st.form("edit_team"):
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input(
                    "Название / Name",
                    value=current_team[0],
                    placeholder="Бригада А"
                )
            
            with col2:
                # Get users for leader selection
                users = execute_query("""
                    SELECT id, CONCAT(first_name, ' ', last_name) as full_name 
                    FROM users 
                    WHERE role = 'team_lead'
                    ORDER BY first_name, last_name
                """)
                
                leader_options = [None] + ([u[0] for u in users] if users else [])
                current_leader_index = 0
                if current_team[1] and users:
                    try:
                        current_leader_index = leader_options.index(current_team[1])
                    except ValueError:
                        current_leader_index = 0
                
                lead_id = st.selectbox(
                    "Лидер бригады / Teamleiter",
                    options=leader_options,
                    index=current_leader_index,
                    format_func=lambda x: "Не назначен" if x is None else next((u[1] for u in users if users and u[0] == x), str(x))
                )
            
            col_save, col_cancel = st.columns(2)
            with col_save:
                if st.form_submit_button("💾 Сохранить / Speichern", type="primary"):
                    if name:
                        try:
                            execute_query("""
                                UPDATE teams 
                                SET name = :name, lead_id = :lead_id
                                WHERE id = :id
                            """, {
                                'id': team_id,
                                'name': name,
                                'lead_id': lead_id
                            })
                            st.success("Бригада обновлена / Team aktualisiert")
                            del st.session_state.edit_team_id
                            st.rerun()
                        except Exception as e:
                            st.error(f"Ошибка обновления: {str(e)}")
                    else:
                        st.error("Название обязательно")
            
            with col_cancel:
                if st.form_submit_button("❌ Отмена / Abbrechen"):
                    del st.session_state.edit_team_id
                    st.rerun()
                    
    except Exception as e:
        st.error(f"Ошибка загрузки данных: {str(e)}")
        if st.button("⬅️ Назад к списку"):
            if 'edit_team_id' in st.session_state:
                del st.session_state.edit_team_id
            st.rerun()

def show_add_team_form():
    """Show form to add new team"""
    st.subheader("➕ Добавить бригаду / Team hinzufügen")
    
    with st.form("add_team"):
        col1, col2 = st.columns(2)
        
        with col1:
            name = st.text_input(
                "Название / Name",
                placeholder="Бригада А"
            )
        
        with col2:
            # Get users for leader selection
            users = execute_query("""
                SELECT id, CONCAT(first_name, ' ', last_name) as full_name 
                FROM users 
                WHERE role = 'team_lead'
                ORDER BY first_name, last_name
            """)
            
            leader_id = None
            if users:
                leader_id = st.selectbox(
                    "Лидер бригады / Teamleiter",
                    options=[None] + [u[0] for u in users],
                    format_func=lambda x: "Не назначен" if x is None else next((u[1] for u in users if u[0] == x), x)
                )
        
        if st.form_submit_button("💾 " + get_text('save', language)):
            if name:
                try:
                    team_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO teams (id, organization_id, name, lead_id)
                        VALUES (:id, :organization_id, :name, :lead_id)
                    """, {
                        'id': team_id,
                        'organization_id': st.session_state.get('organization_id'),
                        'name': name,
                        'lead_id': leader_id
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
            else:
                st.error("Название обязательно")

def delete_team(team_id):
    """Delete team"""
    try:
        execute_query("DELETE FROM teams WHERE id = :id", {'id': team_id})
        st.success("Бригада удалена")
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

def show_team_members():
    """Show team members management"""
    st.subheader("👥 Состав бригад / Teamzusammensetzung")
    
    # Team selection
    teams = execute_query("SELECT id, name FROM teams ORDER BY name")
    if not teams:
        st.warning("Нет бригад / Keine Teams")
        return
    
    selected_team_id = st.selectbox(
        "Выберите бригаду / Team auswählen",
        options=[t[0] for t in teams],
        format_func=lambda x: next((t[1] for t in teams if t[0] == x), x)
    )
    
    if selected_team_id:
        team_name = next((t[1] for t in teams if t[0] == selected_team_id), "")
        st.markdown(f"### Состав бригады: **{team_name}**")
        
        # Show current team members
        members = execute_query("""
            SELECT 
                u.id,
                u.first_name || ' ' || u.last_name as full_name,
                u.role,
                u.phone
            FROM users u
            WHERE u.team_id = :team_id
            ORDER BY 
                CASE u.role 
                    WHEN 'team_lead' THEN 1
                    WHEN 'worker' THEN 2
                    ELSE 3
                END,
                u.first_name
        """, {'team_id': selected_team_id})
        
        if members:
            st.write(f"**Участников в бригаде: {len(members)}**")
            
            for member in members:
                col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                
                with col1:
                    role_icons = {
                        'team_lead': '👨‍💼',
                        'worker': '👷',
                        'admin': '👑',
                        'manager': '💼'
                    }
                    icon = role_icons.get(member[2], '👤')
                    st.write(f"{icon} **{member[1]}**")
                
                with col2:
                    st.write(f"📋 {get_text(member[2], language)}")
                
                with col3:
                    if member[3]:
                        st.write(f"📞 {member[3]}")
                
                with col4:
                    if st.button("❌", key=f"remove_member_{member[0]}", help="Убрать из бригады"):
                        execute_query("UPDATE users SET team_id = NULL WHERE id = :id", {'id': member[0]})
                        st.success(f"{member[1]} убран из бригады")
                        st.rerun()
                
                st.divider()
        else:
            st.info("В бригаде нет участников")
        
        # Add members section
        st.markdown("#### ➕ Добавить участника")
        
        # Get users not in any team or team leads
        available_users = execute_query("""
            SELECT 
                u.id,
                u.first_name || ' ' || u.last_name as full_name,
                u.role
            FROM users u
            WHERE (u.team_id IS NULL OR u.role = 'team_lead')
            AND u.id NOT IN (
                SELECT id FROM users WHERE team_id = :team_id AND team_id IS NOT NULL
            )
            ORDER BY u.first_name
        """, {'team_id': selected_team_id})
        
        if available_users:
            with st.form("add_team_member"):
                user_to_add = st.selectbox(
                    "Пользователь для добавления",
                    options=[u[0] for u in available_users],
                    format_func=lambda x: next(f"{u[1]} ({get_text(u[2], language)})" for u in available_users if u[0] == x)
                )
                
                if st.form_submit_button("➕ Добавить в бригаду"):
                    try:
                        execute_query("""
                            UPDATE users 
                            SET team_id = :team_id 
                            WHERE id = :user_id
                        """, {
                            'team_id': selected_team_id,
                            'user_id': user_to_add
                        })
                        user_name = next((u[1] for u in available_users if u[0] == user_to_add), "")
                        st.success(f"{user_name} добавлен в бригаду {team_name}")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Ошибка: {str(e)}")
        else:
            st.info("Нет доступных пользователей для добавления")

# Main page - simplified structure
st.title(f"👥 {get_text('teams', language)}")

tab1, tab2, tab3 = st.tabs([
    "Список / Liste",
    "Добавить / Hinzufügen", 
    "Состав / Mitglieder"
])

with tab1:
    show_teams_list()

with tab2:
    show_add_team_form()

with tab3:
    show_team_members()