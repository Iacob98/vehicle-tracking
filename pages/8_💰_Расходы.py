import streamlit as st
from datetime import datetime, timedelta
from database import execute_query
from translations import get_text
from utils import format_currency
import pandas as pd
import plotly.express as px

# Page config
st.set_page_config(
    page_title="Расходы",
    page_icon="💰",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

@st.cache_data(ttl=60)
def get_expenses_summary():
    """Get expenses summary with caching"""
    # Car expenses
    car_expenses = execute_query("""
        SELECT 
            'car' as type,
            ce.category,
            SUM(ce.amount) as total,
            COUNT(*) as count
        FROM car_expenses ce
        GROUP BY ce.category
    """)
    
    # Team expenses (penalties for broken materials)
    team_expenses = execute_query("""
        SELECT 
            'team' as type,
            'broken_materials' as category,
            SUM(p.amount) as total,
            COUNT(*) as count
        FROM penalties p
        WHERE p.description LIKE '%Поломка материала%'
    """)
    
    return car_expenses, team_expenses

# Main page
st.title(f"💰 {get_text('expenses', language)}")

try:
    car_expenses, team_expenses = get_expenses_summary()
    
    # Summary metrics
    total_car = sum(e[2] for e in car_expenses) if car_expenses else 0
    total_team = sum(e[2] for e in team_expenses) if team_expenses else 0
    total_all = total_car + total_team
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Общие расходы/Gesamtausgaben", format_currency(total_all))
    with col2:
        st.metric("Расходы на авто/Fahrzeugausgaben", format_currency(total_car))
    with col3:
        st.metric("Расходы бригад/Teamausgaben", format_currency(total_team))
    
    st.divider()
    
    # Charts
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("🚗 Расходы на автомобили / Fahrzeugausgaben")
        if car_expenses:
            df_car = pd.DataFrame(car_expenses, columns=['Type', 'Category', 'Total', 'Count'])
            df_car['Category_Translated'] = df_car['Category'].apply(lambda x: get_text(x, language))
            
            fig_car = px.pie(
                df_car,
                values='Total',
                names='Category_Translated',
                title="По категориям / Nach Kategorien"
            )
            st.plotly_chart(fig_car, use_container_width=True)
        else:
            st.info("Нет данных / Keine Daten")
    
    with col2:
        st.subheader("👥 Расходы бригад / Teamausgaben")
        if team_expenses:
            df_team = pd.DataFrame(team_expenses, columns=['Type', 'Category', 'Total', 'Count'])
            st.metric("Поломка материалов/Materialschäden", format_currency(df_team['Total'].sum()))
            st.info(f"Количество случаев/Anzahl der Fälle: {df_team['Count'].sum()}")
        else:
            st.info("Нет данных / Keine Daten")
    
    st.divider()
    
    # Monthly trend
    st.subheader("📈 Динамика расходов / Ausgabentrend")
    
    six_months_ago = datetime.now() - timedelta(days=180)
    monthly_trend = execute_query("""
        SELECT 
            month,
            SUM(total_amount) as total
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
            AND description LIKE '%Поломка материала%'
            GROUP BY DATE_TRUNC('month', date)
        ) combined
        GROUP BY month
        ORDER BY month
    """, {'six_months_ago': six_months_ago.date()})
    
    if monthly_trend:
        df_trend = pd.DataFrame(monthly_trend, columns=['Month', 'Total'])
        df_trend['Month'] = pd.to_datetime(df_trend['Month'])
        df_trend['Month_Str'] = df_trend['Month'].dt.strftime('%Y-%m')
        
        fig_trend = px.bar(
            df_trend,
            x='Month_Str',
            y='Total',
            title="Месячные расходы / Monatliche Ausgaben"
        )
        st.plotly_chart(fig_trend, use_container_width=True)
    
    st.divider()
    
    # Recent expenses
    st.subheader("📋 Последние расходы / Letzte Ausgaben")
    
    recent_expenses = execute_query("""
        SELECT * FROM (
            SELECT 
                ce.date,
                v.name as entity_name,
                ce.category::text as category,
                ce.amount,
                ce.description,
                'car' as expense_type
            FROM car_expenses ce
            JOIN vehicles v ON ce.car_id = v.id
            ORDER BY ce.date DESC
            LIMIT 10
        ) car
        UNION ALL
        SELECT * FROM (
            SELECT 
                p.date,
                t.name as entity_name,
                'broken_material' as category,
                p.amount,
                CASE 
                    WHEN p.description LIKE '%Поломка материала%' THEN p.description
                    WHEN p.description LIKE '%Поломка оборудования%' THEN p.description
                    ELSE 'Поломка материала / Defektes Material'
                END as description,
                'team' as expense_type
            FROM penalties p
            JOIN teams t ON p.team_id = t.id
            WHERE p.description LIKE '%Поломка материала%' OR p.description LIKE '%Поломка оборудования%'
            ORDER BY p.date DESC
            LIMIT 10
        ) team
        ORDER BY date DESC
        LIMIT 20
    """)
    
    if recent_expenses:
        for expense in recent_expenses:
            with st.container():
                col1, col2, col3 = st.columns([3, 2, 2])
                
                with col1:
                    icon = '🚗' if expense[5] == 'car' else '👥'
                    st.write(f"**{icon} {expense[1]}**")
                    expense_date = expense[0].strftime('%d.%m.%Y') if expense[0] else ''
                    st.write(f"📅 {expense_date}")
                
                with col2:
                    # Format category properly
                    if expense[2] == 'broken_material':
                        category_text = "Поломка материала / Defektes Material"
                    else:
                        category_text = get_text(expense[2], language)
                    st.write(f"📁 {category_text}")
                    st.write(f"💰 {format_currency(expense[3])}")
                
                with col3:
                    if expense[4]:
                        st.write(f"📝 {expense[4][:50]}...")
                
                st.divider()
    else:
        st.info(get_text('no_data', language))
        
except Exception as e:
    st.error(f"Error loading expenses: {str(e)}")