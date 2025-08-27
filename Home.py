"""
Fleet Management System - Main Dashboard with Authentication
"""
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from datetime import datetime, timedelta
from database import execute_query, init_db
from translations import get_text, LANGUAGES
from utils import format_currency
from auth import require_auth, show_org_header

# Page configuration
st.set_page_config(
    page_title="Fleet Management System",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'Get Help': None,
        'Report a bug': None,
        'About': "Fleet Management System v2.0"
    }
)

# Initialize database and require authentication
init_db()
require_auth()

# Initialize language in session state
if 'language' not in st.session_state:
    st.session_state.language = 'ru'

# Sidebar language selector
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
    st.info("Используйте меню слева для навигации")

# Organization header
show_org_header()

# Dashboard
st.title(f"📊 {get_text('dashboard', st.session_state.language)}")

try:
    # Key metrics - cached for performance
    @st.cache_data(ttl=60)
    def get_metrics():
        user_info = st.session_state.get('user_info')
        if not user_info:
            return 0, 0, 0, 0
        
        org_id = user_info['organization_id']
        vehicles_count = execute_query("SELECT COUNT(*) FROM vehicles WHERE organization_id = %s", (org_id,))[0][0]
        teams_count = execute_query("SELECT COUNT(*) FROM teams WHERE organization_id = %s", (org_id,))[0][0]
        users_count = execute_query("SELECT COUNT(*) FROM users WHERE organization_id = %s", (org_id,))[0][0]
        open_penalties = execute_query(
            "SELECT COUNT(*) FROM penalties WHERE status = 'open' AND organization_id = %s AND (description IS NULL OR description NOT LIKE '%Поломка материала%')", (org_id,)
        )[0][0]
        return vehicles_count, teams_count, users_count, open_penalties
    
    vehicles_count, teams_count, users_count, open_penalties = get_metrics()
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label=get_text('total_vehicles', st.session_state.language),
            value=vehicles_count
        )
    
    with col2:
        st.metric(
            label=get_text('total_teams', st.session_state.language),
            value=teams_count
        )
    
    with col3:
        st.metric(
            label=get_text('total_users', st.session_state.language),
            value=users_count
        )
    
    with col4:
        st.metric(
            label=get_text('open_penalties', st.session_state.language),
            value=open_penalties,
            delta=f"-{open_penalties}" if open_penalties > 0 else "0"
        )
    
    st.divider()
    
    # Charts section
    col1, col2 = st.columns(2)
    
    # Vehicle status distribution
    with col1:
        st.subheader(f"🚗 {get_text('vehicles', st.session_state.language)} - {get_text('status', st.session_state.language)}")
        
        @st.cache_data(ttl=300)
        def get_vehicle_status():
            user_info = st.session_state.get('user_info')
            if not user_info:
                return []
            
            return execute_query("""
                SELECT status, COUNT(*) as count 
                FROM vehicles 
                WHERE organization_id = %s
                GROUP BY status
                ORDER BY count DESC
            """, (user_info['organization_id'],))
        
        vehicle_status_data = get_vehicle_status()
        
        if vehicle_status_data:
            df_status = pd.DataFrame(vehicle_status_data, columns=['Status', 'Count'])
            df_status['Status_Translated'] = df_status['Status'].apply(
                lambda x: get_text(x, st.session_state.language)
            )
            
            fig_status = px.pie(
                df_status, 
                values='Count', 
                names='Status_Translated',
                title=get_text('vehicles', st.session_state.language)
            )
            st.plotly_chart(fig_status, use_container_width=True)
        else:
            st.info(get_text('no_data', st.session_state.language))
    
    # Monthly expenses
    with col2:
        st.subheader(f"💰 {get_text('monthly_expenses', st.session_state.language)}")
        
        @st.cache_data(ttl=300)
        def get_monthly_expenses():
            user_info = st.session_state.get('user_info')
            if not user_info:
                return []
            
            org_id = user_info['organization_id']
            six_months_ago = datetime.now() - timedelta(days=180)
            return execute_query("""
                SELECT 
                    month,
                    SUM(total_amount) as total_amount
                FROM (
                    SELECT 
                        DATE_TRUNC('month', date) as month,
                        SUM(amount) as total_amount
                    FROM car_expenses 
                    WHERE date >= %s AND organization_id = %s
                    GROUP BY DATE_TRUNC('month', date)
                    
                    UNION ALL
                    
                    SELECT 
                        DATE_TRUNC('month', date) as month,
                        SUM(amount) as total_amount
                    FROM penalties 
                    WHERE date >= %s AND organization_id = %s
                    GROUP BY DATE_TRUNC('month', date)
                ) combined_expenses
                GROUP BY month
                ORDER BY month
            """, (six_months_ago.date(), org_id, six_months_ago.date(), org_id))
        
        monthly_expenses = get_monthly_expenses()
        
        if monthly_expenses:
            df_expenses = pd.DataFrame(monthly_expenses, columns=['Month', 'Amount'])
            df_expenses['Month'] = pd.to_datetime(df_expenses['Month'])
            df_expenses['Month_Str'] = df_expenses['Month'].dt.strftime('%Y-%m')
            
            fig_expenses = px.bar(
                df_expenses,
                x='Month_Str',
                y='Amount',
                title=get_text('monthly_expenses', st.session_state.language)
            )
            st.plotly_chart(fig_expenses, use_container_width=True)
        else:
            st.info(get_text('no_data', st.session_state.language))
    
    st.divider()
    
    # Team statistics
    st.subheader(f"👥 {get_text('teams', st.session_state.language)} - Статистика")
    
    @st.cache_data(ttl=300)
    def get_team_stats():
        user_info = st.session_state.get('user_info')
        if not user_info:
            return []
        
        org_id = user_info['organization_id']
        return execute_query("""
            SELECT 
                t.name,
                0 as vehicles_count,
                COUNT(DISTINCT u.id) as users_count,
                COALESCE(SUM(p.amount), 0) as total_expenses
            FROM teams t
            LEFT JOIN users u ON t.id = u.team_id AND u.organization_id = %s
            LEFT JOIN penalties p ON t.id = p.team_id AND p.organization_id = %s
            WHERE t.organization_id = %s
            GROUP BY t.id, t.name
            ORDER BY t.name
        """, (org_id, org_id, org_id))
    
    team_stats = get_team_stats()
    
    if team_stats:
        df_teams = pd.DataFrame(team_stats, columns=[
            get_text('name', st.session_state.language),
            get_text('vehicles', st.session_state.language),
            get_text('users', st.session_state.language),
            get_text('expenses', st.session_state.language)
        ])
        
        # Format expenses column
        df_teams[get_text('expenses', st.session_state.language)] = df_teams[get_text('expenses', st.session_state.language)].apply(
            lambda x: format_currency(x)
        )
        
        st.dataframe(df_teams, use_container_width=True)
    else:
        st.info(get_text('no_data', st.session_state.language))
        
except Exception as e:
    st.error(f"Error loading dashboard: {str(e)}")