import streamlit as st
import sys
import os
from database import init_db, get_session
from translations import get_text, LANGUAGES

# Ensure local pages directory is in Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pages import dashboard, vehicles, teams, users, penalties, maintenance, materials, expenses

# Page configuration
st.set_page_config(
    page_title="Fleet Management System",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Database is already initialized manually via SQL tool
pass

# Language selection
if 'language' not in st.session_state:
    st.session_state.language = 'ru'

# Sidebar for navigation and language selection
with st.sidebar:
    st.title("🚗 Fleet Management")
    
    # Language selector
    language = st.selectbox(
        "Language / Язык",
        options=list(LANGUAGES.keys()),
        format_func=lambda x: LANGUAGES[x],
        index=list(LANGUAGES.keys()).index(st.session_state.language)
    )
    
    if language != st.session_state.language:
        st.session_state.language = language
        st.rerun()
    
    st.divider()
    
    # Navigation menu
    pages = {
        'dashboard': {'icon': '📊', 'key': 'dashboard'},
        'vehicles': {'icon': '🚗', 'key': 'vehicles'},
        'teams': {'icon': '👥', 'key': 'teams'},
        'users': {'icon': '👤', 'key': 'users'},
        'penalties': {'icon': '🚧', 'key': 'penalties'},
        'maintenance': {'icon': '🔧', 'key': 'maintenance'},
        'materials': {'icon': '📦', 'key': 'materials'},
        'expenses': {'icon': '💰', 'key': 'expenses'}
    }
    
    if 'current_page' not in st.session_state:
        st.session_state.current_page = 'dashboard'
    
    for page_key, page_info in pages.items():
        if st.button(
            f"{page_info['icon']} {get_text(page_info['key'], st.session_state.language)}",
            use_container_width=True,
            type="primary" if st.session_state.current_page == page_key else "secondary"
        ):
            st.session_state.current_page = page_key
            st.rerun()

# Main content area
try:
    if st.session_state.current_page == 'dashboard':
        dashboard.show_page(st.session_state.language)
    elif st.session_state.current_page == 'vehicles':
        vehicles.show_page(st.session_state.language)
    elif st.session_state.current_page == 'teams':
        teams.show_page(st.session_state.language)
    elif st.session_state.current_page == 'users':
        users.show_page(st.session_state.language)
    elif st.session_state.current_page == 'penalties':
        penalties.show_page(st.session_state.language)
    elif st.session_state.current_page == 'maintenance':
        maintenance.show_page(st.session_state.language)
    elif st.session_state.current_page == 'materials':
        materials.show_page(st.session_state.language)
    elif st.session_state.current_page == 'expenses':
        expenses.show_page(st.session_state.language)
except Exception as e:
    st.error(f"Error loading page: {str(e)}")
