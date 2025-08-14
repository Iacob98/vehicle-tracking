import streamlit as st
import uuid
from database import execute_query
from translations import get_text
from utils import export_to_csv
from datetime import datetime

# Page config
st.set_page_config(
    page_title="Бригады",
    page_icon="👥",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

def show_teams_list():
    """Show list of teams"""
    try:
        teams = execute_query("""
            SELECT 
                t.id,
                t.name,
                CONCAT(u.first_name, ' ', u.last_name) as leader_name,
                COUNT(DISTINCT usr.id) as users_count,
                COUNT(DISTINCT va.vehicle_id) as vehicles_count
            FROM teams t
            LEFT JOIN users u ON t.lead_id = u.id
            LEFT JOIN users usr ON t.id = usr.team_id
            LEFT JOIN vehicle_assignments va ON t.id = va.team_id AND va.end_date IS NULL
            GROUP BY t.id, t.name, u.first_name, u.last_name
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
                    
                    with col2:
                        st.write(f"👥 Пользователей: {team[3]}")
                    
                    with col3:
                        st.write(f"🚗 Автомобилей: {team[4]}")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_team_{team[0]}"):
                            st.session_state[f"edit_team_{team[0]}"] = True
                        if st.button(f"🗑️", key=f"delete_team_{team[0]}"):
                            delete_team(team[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading teams: {str(e)}")

def show_add_team_form():
    """Show form to add new team"""
    with st.form("add_team"):
        name = st.text_input(
            get_text('name', language),
            placeholder="Бригада А"
        )
        
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
        
        if st.form_submit_button(get_text('save', language)):
            if name:
                try:
                    team_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO teams (id, name, lead_id)
                        VALUES (:id, :name, :lead_id)
                    """, {
                        'id': team_id,
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
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Main page
st.title(f"👥 {get_text('teams', language)}")

tab1, tab2 = st.tabs([
    get_text('teams', language),
    get_text('add', language)
])

with tab1:
    show_teams_list()

with tab2:
    show_add_team_form()