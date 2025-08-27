import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from database import execute_query
from decimal import Decimal
from datetime import datetime, timedelta

# Page config
st.set_page_config(
    page_title="Статистика штрафов",
    page_icon="📊",
    layout="wide"
)

@st.cache_data(ttl=60)
def get_penalty_statistics():
    """Get comprehensive penalty statistics"""
    return execute_query("""
        SELECT 
            p.id,
            p.amount,
            p.date,
            p.description,
            p.status,
            t.name as team_name,
            u.first_name || ' ' || u.last_name as user_name,
            CASE 
                WHEN p.description LIKE '%Поломка оборудования%' THEN 'equipment_damage'
                ELSE 'traffic_violation'
            END as penalty_type
        FROM penalties p
        JOIN teams t ON p.team_id = t.id
        LEFT JOIN vehicle_assignments va ON va.team_id = p.team_id 
            AND va.start_date <= p.date 
            AND (va.end_date IS NULL OR va.end_date >= p.date)
        LEFT JOIN users u ON va.driver_id = u.id
        WHERE p.organization_id = :organization_id
        ORDER BY p.date DESC
    """, {
        'organization_id': st.session_state.get('organization_id')
    })

@st.cache_data(ttl=60)
def get_team_penalty_summary():
    """Get penalty summary by team"""
    return execute_query("""
        SELECT 
            t.name as team_name,
            COUNT(p.id) as total_penalties,
            COALESCE(SUM(CASE WHEN p.description LIKE '%Поломка оборудования%' THEN p.amount ELSE 0 END), 0) as equipment_costs,
            COALESCE(SUM(CASE WHEN p.description NOT LIKE '%Поломка оборудования%' THEN p.amount ELSE 0 END), 0) as traffic_fines,
            COALESCE(SUM(p.amount), 0) as total_amount,
            COUNT(CASE WHEN p.status = 'open' THEN 1 END) as open_penalties,
            COUNT(CASE WHEN p.status = 'paid' THEN 1 END) as paid_penalties
        FROM teams t
        LEFT JOIN penalties p ON t.id = p.team_id
        WHERE t.organization_id = :organization_id
        GROUP BY t.id, t.name
        ORDER BY total_amount DESC
    """, {
        'organization_id': st.session_state.get('organization_id')
    })

@st.cache_data(ttl=60)
def get_user_penalty_summary():
    """Get penalty summary by user (based on vehicle assignments)"""
    return execute_query("""
        SELECT 
            u.first_name || ' ' || u.last_name as user_name,
            u.role,
            t.name as team_name,
            COUNT(p.id) as total_penalties,
            COALESCE(SUM(CASE WHEN p.description LIKE '%Поломка оборудования%' THEN p.amount ELSE 0 END), 0) as equipment_costs,
            COALESCE(SUM(CASE WHEN p.description NOT LIKE '%Поломка оборудования%' THEN p.amount ELSE 0 END), 0) as traffic_fines,
            COALESCE(SUM(p.amount), 0) as total_amount
        FROM users u
        JOIN team_members tm ON u.id = tm.member_id
        JOIN teams t ON tm.team_id = t.id
        LEFT JOIN vehicle_assignments va ON va.driver_id = u.id
        LEFT JOIN penalties p ON p.team_id = t.id 
            AND va.start_date <= p.date 
            AND (va.end_date IS NULL OR va.end_date >= p.date)
        WHERE u.organization_id = :organization_id
        GROUP BY u.id, u.first_name, u.last_name, u.role, t.name
        HAVING COUNT(p.id) > 0
        ORDER BY total_amount DESC
    """, {
        'organization_id': st.session_state.get('organization_id')
    })

def format_currency(amount):
    """Format currency with proper decimal handling"""
    if amount is None:
        return "0.00 ₽"
    # Convert Decimal to float for display
    if isinstance(amount, Decimal):
        amount = float(amount)
    return f"{amount:,.2f} ₽"

def show_penalty_overview():
    """Show penalty overview with key metrics"""
    st.subheader("📊 Общая статистика штрафов")
    
    penalties = get_penalty_statistics()
    
    if not penalties:
        st.info("📝 Нет данных о штрафах")
        return
    
    # Calculate totals
    total_amount = sum(float(p[1]) for p in penalties)
    equipment_costs = sum(float(p[1]) for p in penalties if 'Поломка оборудования' in p[3])
    traffic_fines = sum(float(p[1]) for p in penalties if 'Поломка оборудования' not in p[3])
    open_penalties = len([p for p in penalties if p[4] == 'open'])
    paid_penalties = len([p for p in penalties if p[4] == 'paid'])
    
    # Key metrics
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("💰 Общая сумма", format_currency(total_amount))
    
    with col2:
        st.metric("🚨 Штрафы за нарушения", format_currency(traffic_fines))
    
    with col3:
        st.metric("🔧 Ущерб от поломок", format_currency(equipment_costs))
    
    with col4:
        st.metric("📋 Открытые штрафы", open_penalties)
    
    with col5:
        st.metric("✅ Оплаченные штрафы", paid_penalties)

def show_team_statistics():
    """Show penalty statistics by team"""
    st.subheader("👥 Статистика по бригадам")
    
    team_stats = get_team_penalty_summary()
    
    if not team_stats:
        st.info("📝 Нет данных по бригадам")
        return
    
    # Create DataFrame for better display
    df_data = []
    for stat in team_stats:
        team_name, total_penalties, equipment_costs, traffic_fines, total_amount, open_penalties, paid_penalties = stat
        
        df_data.append({
            "Бригада": team_name,
            "Всего штрафов": total_penalties,
            "Штрафы за нарушения": format_currency(float(traffic_fines)),
            "Ущерб от поломок": format_currency(float(equipment_costs)),
            "Общая сумма": format_currency(float(total_amount)),
            "Открытые": open_penalties,
            "Оплаченные": paid_penalties
        })
    
    if df_data:
        df = pd.DataFrame(df_data)
        st.dataframe(df, use_container_width=True, hide_index=True)
        
        # Charts
        col1, col2 = st.columns(2)
        
        with col1:
            # Pie chart for team costs
            team_amounts = [float(stat[4]) for stat in team_stats if float(stat[4]) > 0]
            team_names = [stat[0] for stat in team_stats if float(stat[4]) > 0]
            
            if team_amounts:
                fig_pie = px.pie(
                    values=team_amounts,
                    names=team_names,
                    title="💰 Распределение штрафов по бригадам"
                )
                st.plotly_chart(fig_pie, use_container_width=True)
        
        with col2:
            # Bar chart for penalty types
            traffic_amounts = [float(stat[3]) for stat in team_stats]
            equipment_amounts = [float(stat[2]) for stat in team_stats]
            team_names = [stat[0] for stat in team_stats]
            
            fig_bar = go.Figure(data=[
                go.Bar(name='Штрафы за нарушения', x=team_names, y=traffic_amounts),
                go.Bar(name='Ущерб от поломок', x=team_names, y=equipment_amounts)
            ])
            fig_bar.update_layout(
                title="📊 Типы штрафов по бригадам",
                barmode='stack',
                xaxis_title="Бригады",
                yaxis_title="Сумма (₽)"
            )
            st.plotly_chart(fig_bar, use_container_width=True)

def show_user_statistics():
    """Show penalty statistics by user"""
    st.subheader("👤 Статистика по пользователям")
    
    user_stats = get_user_penalty_summary()
    
    if not user_stats:
        st.info("📝 Нет данных по пользователям с штрафами")
        return
    
    # Create DataFrame for better display
    df_data = []
    for stat in user_stats:
        user_name, role, team_name, total_penalties, equipment_costs, traffic_fines, total_amount = stat
        
        df_data.append({
            "Пользователь": user_name,
            "Роль": role,
            "Бригада": team_name,
            "Всего штрафов": total_penalties,
            "Штрафы за нарушения": format_currency(float(traffic_fines)),
            "Ущерб от поломок": format_currency(float(equipment_costs)),
            "Общая сумма": format_currency(float(total_amount))
        })
    
    if df_data:
        df = pd.DataFrame(df_data)
        st.dataframe(df, use_container_width=True, hide_index=True)
        
        # Top violators chart
        if len(df_data) > 0:
            users = [stat[0] for stat in user_stats[:10]]  # Top 10
            amounts = [float(stat[6]) for stat in user_stats[:10]]
            
            fig_users = px.bar(
                x=amounts,
                y=users,
                orientation='h',
                title="🎯 Топ пользователей по сумме штрафов",
                labels={'x': 'Сумма (₽)', 'y': 'Пользователи'}
            )
            fig_users.update_layout(yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig_users, use_container_width=True)

def show_penalty_timeline():
    """Show penalty timeline"""
    st.subheader("📈 Динамика штрафов")
    
    penalties = get_penalty_statistics()
    
    if not penalties:
        st.info("📝 Нет данных для отображения динамики")
        return
    
    # Group by month
    monthly_data = {}
    for penalty in penalties:
        date = penalty[2]  # penalty date
        amount = float(penalty[1])
        penalty_type = penalty[7]  # penalty_type
        
        month_key = date.strftime('%Y-%m')
        
        if month_key not in monthly_data:
            monthly_data[month_key] = {
                'traffic_violations': 0,
                'equipment_damage': 0,
                'total': 0
            }
        
        monthly_data[month_key][penalty_type] += amount
        monthly_data[month_key]['total'] += amount
    
    # Create timeline chart
    if monthly_data:
        months = sorted(monthly_data.keys())
        traffic_amounts = [monthly_data[m]['traffic_violations'] for m in months]
        equipment_amounts = [monthly_data[m]['equipment_damage'] for m in months]
        
        fig_timeline = go.Figure()
        
        fig_timeline.add_trace(go.Scatter(
            x=months,
            y=traffic_amounts,
            mode='lines+markers',
            name='Штрафы за нарушения',
            line=dict(color='red')
        ))
        
        fig_timeline.add_trace(go.Scatter(
            x=months,
            y=equipment_amounts,
            mode='lines+markers',
            name='Ущерб от поломок',
            line=dict(color='orange')
        ))
        
        fig_timeline.update_layout(
            title="📈 Динамика штрафов по месяцам",
            xaxis_title="Месяц",
            yaxis_title="Сумма (₽)",
            hovermode='x unified'
        )
        
        st.plotly_chart(fig_timeline, use_container_width=True)

# Main page
st.title("📊 Статистика штрафов и ущерба")

st.info("""
**📋 Комплексная статистика:**
- **💰 Общие суммы** штрафов и ущерба от поломок
- **👥 По бригадам** - сколько каждая бригада тратит на штрафы и поломки  
- **👤 По пользователям** - персональная ответственность водителей
- **📈 Динамика** - тренды штрафов по времени

Данные обновляются автоматически и синхронизированы с назначениями автомобилей.
""")

# Tabs for different views
tab1, tab2, tab3, tab4 = st.tabs([
    "📊 Общая статистика",
    "👥 По бригадам", 
    "👤 По пользователям",
    "📈 Динамика"
])

with tab1:
    show_penalty_overview()

with tab2:
    show_team_statistics()

with tab3:
    show_user_statistics()

with tab4:
    show_penalty_timeline()