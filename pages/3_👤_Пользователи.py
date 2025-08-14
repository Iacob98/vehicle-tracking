import streamlit as st
import uuid
from database import execute_query
from translations import get_text
from datetime import datetime

# Page config
st.set_page_config(
    page_title="Пользователи",
    page_icon="👤",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

def show_users_list():
    """Show list of users"""
    try:
        users = execute_query("""
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.role,
                t.name as team_name
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            ORDER BY u.first_name, u.last_name
        """)
        
        if users:
            for user in users:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{user[1]} {user[2]}**")
                        if user[4]:
                            st.write(f"👥 {user[4]}")
                    
                    with col2:
                        role_icons = {
                            'admin': '👑',
                            'manager': '💼',
                            'team_lead': '👨‍💼',
                            'worker': '👷'
                        }
                        icon = role_icons.get(user[3], '👤')
                        st.write(f"{icon} {get_text(user[3], language)}")
                    
                    with col3:
                        st.write("")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_user_{user[0]}"):
                            st.session_state[f"edit_user_{user[0]}"] = True
                        if st.button(f"🗑️", key=f"delete_user_{user[0]}"):
                            delete_user(user[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading users: {str(e)}")

def show_add_user_form():
    """Show form to add new user"""
    with st.form("add_user"):
        col1, col2 = st.columns(2)
        
        with col1:
            first_name = st.text_input(
                "Имя / Vorname",
                placeholder="Иван"
            )
            last_name = st.text_input(
                "Фамилия / Nachname",
                placeholder="Иванов"
            )
        
        with col2:
            role = st.selectbox(
                "Роль / Rolle",
                options=['admin', 'manager', 'team_lead', 'worker'],
                format_func=lambda x: get_text(x, language)
            )
            
            # Get teams for assignment
            teams = execute_query("SELECT id, name FROM teams ORDER BY name")
            team_id = None
            if teams:
                team_id = st.selectbox(
                    "Бригада / Team",
                    options=[None] + [t[0] for t in teams],
                    format_func=lambda x: "Не назначена" if x is None else next((t[1] for t in teams if t[0] == x), x)
                )
        
        if st.form_submit_button(get_text('save', language)):
            if first_name and last_name:
                try:
                    user_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO users (id, first_name, last_name, role, team_id)
                        VALUES (:id, :first_name, :last_name, :role, :team_id)
                    """, {
                        'id': user_id,
                        'first_name': first_name,
                        'last_name': last_name,
                        'role': role,
                        'team_id': team_id
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
            else:
                st.error("Имя и фамилия обязательны")

def delete_user(user_id):
    """Delete user"""
    try:
        execute_query("DELETE FROM users WHERE id = :id", {'id': user_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Main page
st.title(f"👤 {get_text('users', language)}")

tab1, tab2 = st.tabs([
    get_text('users', language),
    get_text('add', language)
])

with tab1:
    show_users_list()

with tab2:
    show_add_user_form()