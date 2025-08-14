import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from datetime import datetime, timedelta
from database import execute_query
from translations import get_text
from utils import format_currency

def show_page(language='ru'):
    """Show dashboard page"""
    st.title(f"📊 {get_text('dashboard', language)}")
    
    try:
        # Key metrics
        col1, col2, col3, col4 = st.columns(4)
        
        # Total vehicles
        with col1:
            vehicles_count = execute_query("SELECT COUNT(*) FROM vehicles")[0][0]
            st.metric(
                label=get_text('total_vehicles', language),
                value=vehicles_count
            )
        
        # Total teams
        with col2:
            teams_count = execute_query("SELECT COUNT(*) FROM teams")[0][0]
            st.metric(
                label=get_text('total_teams', language),
                value=teams_count
            )
        
        # Total users
        with col3:
            users_count = execute_query("SELECT COUNT(*) FROM users")[0][0]
            st.metric(
                label=get_text('total_users', language),
                value=users_count
            )
        
        # Open penalties
        with col4:
            open_penalties = execute_query(
                "SELECT COUNT(*) FROM penalties WHERE status = 'open'"
            )[0][0]
            st.metric(
                label=get_text('open_penalties', language),
                value=open_penalties,
                delta=f"-{open_penalties}" if open_penalties > 0 else "0"
            )
        
        st.divider()
        
        # Charts section
        col1, col2 = st.columns(2)
        
        # Vehicle status distribution
        with col1:
            st.subheader(f"🚗 {get_text('vehicles', language)} - {get_text('status', language)}")
            vehicle_status_data = execute_query("""
                SELECT status, COUNT(*) as count 
                FROM vehicles 
                GROUP BY status
                ORDER BY count DESC
            """)
            
            if vehicle_status_data:
                df_status = pd.DataFrame(vehicle_status_data, columns=['Status', 'Count'])
                df_status['Status_Translated'] = df_status['Status'].apply(
                    lambda x: get_text(x, language)
                )
                
                fig_status = px.pie(
                    df_status, 
                    values='Count', 
                    names='Status_Translated',
                    title=get_text('vehicles', language)
                )
                st.plotly_chart(fig_status, use_container_width=True)
            else:
                st.info(get_text('no_data', language))
        
        # Monthly expenses
        with col2:
            st.subheader(f"💰 {get_text('monthly_expenses', language)}")
            
            # Get expenses for last 6 months
            six_months_ago = datetime.now() - timedelta(days=180)
            monthly_expenses = execute_query("""
                SELECT 
                    month,
                    SUM(total_amount) as total_amount
                FROM (
                    SELECT 
                        DATE_TRUNC('month', date) as month,
                        SUM(amount) as total_amount
                    FROM car_expenses 
                    WHERE date >= :six_months_ago
                    GROUP BY DATE_TRUNC('month', date)
                    
                    UNION ALL
                    
                    SELECT 
                        DATE_TRUNC('month', date) as month,
                        SUM(amount) as total_amount
                    FROM penalties 
                    WHERE date >= :six_months_ago
                    GROUP BY DATE_TRUNC('month', date)
                ) combined_expenses
                GROUP BY month
                ORDER BY month
            """, {'six_months_ago': six_months_ago.date()})
            
            if monthly_expenses:
                df_expenses = pd.DataFrame(monthly_expenses, columns=['Month', 'Amount'])
                df_expenses['Month'] = pd.to_datetime(df_expenses['Month'])
                df_expenses['Month_Str'] = df_expenses['Month'].dt.strftime('%Y-%m')
                
                fig_expenses = px.bar(
                    df_expenses,
                    x='Month_Str',
                    y='Amount',
                    title=get_text('monthly_expenses', language)
                )
                st.plotly_chart(fig_expenses, use_container_width=True)
            else:
                st.info(get_text('no_data', language))
        
        st.divider()
        
        # Recent activities
        col1, col2 = st.columns(2)
        
        # Recent maintenances
        with col1:
            st.subheader(f"🔧 {get_text('recent_maintenances', language)}")
            recent_maintenances = execute_query("""
                SELECT 
                    m.date,
                    v.name as vehicle_name,
                    m.type,
                    m.description
                FROM maintenances m
                JOIN vehicles v ON m.vehicle_id = v.id
                ORDER BY m.date DESC
                LIMIT 5
            """)
            
            if recent_maintenances:
                for maintenance in recent_maintenances:
                    with st.container():
                        st.write(f"**{maintenance[1]}**")
                        st.write(f"{get_text(maintenance[2], language)} - {maintenance[0]}")
                        if maintenance[3]:
                            st.write(f"_{maintenance[3]}_")
                        st.write("---")
            else:
                st.info(get_text('no_data', language))
        
        # Recent penalties
        with col2:
            st.subheader(f"🚧 {get_text('penalties', language)}")
            recent_penalties = execute_query("""
                SELECT 
                    p.date,
                    v.name as vehicle_name,
                    p.amount,
                    p.status,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name
                FROM penalties p
                JOIN vehicles v ON p.vehicle_id = v.id
                LEFT JOIN users u ON p.user_id = u.id
                ORDER BY p.date DESC
                LIMIT 5
            """)
            
            if recent_penalties:
                for penalty in recent_penalties:
                    with st.container():
                        st.write(f"**{penalty[1]}**")
                        st.write(f"{format_currency(penalty[2])} - {get_text(penalty[3], language)}")
                        if penalty[4]:
                            st.write(f"_{penalty[4]}_")
                        st.write(f"_{penalty[0]}_")
                        st.write("---")
            else:
                st.info(get_text('no_data', language))
        
        # Team performance
        st.divider()
        st.subheader(f"👥 {get_text('teams', language)} - Статистика")
        
        team_stats = execute_query("""
            SELECT 
                t.name,
                COUNT(DISTINCT va.vehicle_id) as vehicles_count,
                COUNT(DISTINCT u.id) as users_count,
                COALESCE(SUM(p.amount), 0) as total_expenses
            FROM teams t
            LEFT JOIN vehicle_assignments va ON t.id = va.team_id AND va.end_date IS NULL
            LEFT JOIN users u ON t.id = u.team_id
            LEFT JOIN penalties p ON t.id = p.team_id
            GROUP BY t.id, t.name
            ORDER BY t.name
        """)
        
        if team_stats:
            df_teams = pd.DataFrame(team_stats, columns=[
                get_text('name', language),
                get_text('vehicles', language),
                get_text('users', language),
                get_text('expenses', language)
            ])
            
            # Format expenses column
            df_teams[get_text('expenses', language)] = df_teams[get_text('expenses', language)].apply(
                lambda x: format_currency(x)
            )
            
            st.dataframe(df_teams, use_container_width=True)
        else:
            st.info(get_text('no_data', language))
            
    except Exception as e:
        st.error(f"Error loading dashboard: {str(e)}")
