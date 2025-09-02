import streamlit as st
import uuid
import pandas as pd
from database import execute_query, SessionLocal
from translations import get_text
from utils import export_to_csv
from datetime import datetime
from auth import require_auth, show_org_header
from models import TeamMember, Team, WorkerCategory

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
                            if st.button("✏️