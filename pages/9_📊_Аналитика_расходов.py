import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from database import execute_query
from translations import get_text
from utils import format_currency
from datetime import datetime, timedelta
import uuid

# Page config
st.set_page_config(
    page_title="Аналитика расходов",
    page_icon="📊",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

def get_vehicle_expense_statistics(date_from=None, date_to=None):
    """Get vehicle expense statistics"""
    try:
        where_clause = ""
        params = {}
        
        if date_from and date_to:
            where_clause = "WHERE ce.date BETWEEN :date_from AND :date_to"
            params = {'date_from': date_from, 'date_to': date_to}
        
        query = f"""
            SELECT 
                v.id as vehicle_id,
                v.name as vehicle_name,
                v.license_plate,
                COUNT(ce.id) as total_expenses,
                SUM(ce.amount) as total_amount,
                AVG(ce.amount) as avg_expense,
                MAX(ce.amount) as max_expense,
                MIN(ce.amount) as min_expense,
                ce.expense_category,
                COUNT(CASE WHEN ce.expense_category = 'fuel' THEN 1 END) as fuel_count,
                COUNT(CASE WHEN ce.expense_category = 'repair' THEN 1 END) as repair_count,
                COUNT(CASE WHEN ce.expense_category = 'maintenance' THEN 1 END) as maintenance_count,
                SUM(CASE WHEN ce.expense_category = 'fuel' THEN ce.amount ELSE 0 END) as fuel_total,
                SUM(CASE WHEN ce.expense_category = 'repair' THEN ce.amount ELSE 0 END) as repair_total,
                SUM(CASE WHEN ce.expense_category = 'maintenance' THEN ce.amount ELSE 0 END) as maintenance_total
            FROM vehicles v
            LEFT JOIN car_expenses ce ON v.id = ce.vehicle_id
            {where_clause}
            GROUP BY v.id, v.name, v.license_plate, ce.expense_category
            HAVING SUM(ce.amount) > 0
            ORDER BY total_amount DESC
        """
        
        result = execute_query(query, params)
        return result or []
        
    except Exception as e:
        st.error(f"Ошибка получения статистики по автомобилям: {str(e)}")
        return []

def get_team_expense_statistics(date_from=None, date_to=None):
    """Get team/brigade expense statistics including penalties and materials"""
    try:
        where_clause = ""
        params = {}
        
        if date_from and date_to:
            where_clause = "AND (p.date BETWEEN :date_from AND :date_to OR ma.assignment_date BETWEEN :date_from AND :date_to)"
            params = {'date_from': date_from, 'date_to': date_to}
        
        query = f"""
            WITH team_penalties AS (
                SELECT 
                    t.id as team_id,
                    t.name as team_name,
                    COUNT(p.id) as penalty_count,
                    SUM(p.amount) as penalty_total
                FROM teams t
                LEFT JOIN penalties p ON t.id = p.team_id
                WHERE p.id IS NOT NULL {where_clause.replace('AND', 'AND') if where_clause else ''}
                GROUP BY t.id, t.name
            ),
            team_materials AS (
                SELECT 
                    t.id as team_id,
                    t.name as team_name,
                    COUNT(ma.id) as material_assignments,
                    SUM(m.unit_price * ma.quantity) as material_cost,
                    SUM(CASE WHEN ma.status = 'broken' THEN m.unit_price * ma.quantity ELSE 0 END) as broken_cost
                FROM teams t
                LEFT JOIN material_assignments ma ON t.id = ma.team_id
                LEFT JOIN materials m ON ma.material_id = m.id
                WHERE ma.id IS NOT NULL {where_clause.replace('p.', 'ma.').replace('penalties', 'material_assignments') if where_clause else ''}
                GROUP BY t.id, t.name
            )
            SELECT 
                COALESCE(tp.team_id, tm.team_id) as team_id,
                COALESCE(tp.team_name, tm.team_name) as team_name,
                COALESCE(tp.penalty_count, 0) as penalty_count,
                COALESCE(tp.penalty_total, 0) as penalty_total,
                COALESCE(tm.material_assignments, 0) as material_assignments,
                COALESCE(tm.material_cost, 0) as material_cost,
                COALESCE(tm.broken_cost, 0) as broken_cost,
                (COALESCE(tp.penalty_total, 0) + COALESCE(tm.material_cost, 0)) as total_cost
            FROM team_penalties tp
            FULL OUTER JOIN team_materials tm ON tp.team_id = tm.team_id
            WHERE (COALESCE(tp.penalty_total, 0) + COALESCE(tm.material_cost, 0)) > 0
            ORDER BY total_cost DESC
        """
        
        result = execute_query(query, params)
        return result or []
        
    except Exception as e:
        st.error(f"Ошибка получения статистики по бригадам: {str(e)}")
        return []

def show_vehicle_analytics():
    """Show vehicle expense analytics"""
    st.subheader("🚗 Аналитика расходов по автомобилям")
    
    # Date filter
    col1, col2 = st.columns(2)
    with col1:
        date_from = st.date_input(
            "С даты",
            value=datetime.now() - timedelta(days=30),
            help="Начальная дата для анализа"
        )
    with col2:
        date_to = st.date_input(
            "По дату",
            value=datetime.now(),
            help="Конечная дата для анализа"
        )
    
    # Get vehicle statistics
    vehicle_stats = execute_query("""
        SELECT 
            v.id,
            v.name,
            v.license_plate,
            v.photo_url,
            COUNT(ce.id) as expense_count,
            COALESCE(SUM(ce.amount), 0) as total_amount,
            COALESCE(AVG(ce.amount), 0) as avg_amount,
            SUM(CASE WHEN ce.expense_category = 'fuel' THEN ce.amount ELSE 0 END) as fuel_cost,
            SUM(CASE WHEN ce.expense_category = 'repair' THEN ce.amount ELSE 0 END) as repair_cost,
            SUM(CASE WHEN ce.expense_category = 'maintenance' THEN ce.amount ELSE 0 END) as maintenance_cost,
            SUM(CASE WHEN ce.expense_category = 'insurance' THEN ce.amount ELSE 0 END) as insurance_cost,
            SUM(CASE WHEN ce.expense_category = 'other' THEN ce.amount ELSE 0 END) as other_cost
        FROM vehicles v
        LEFT JOIN car_expenses ce ON v.id = ce.vehicle_id 
            AND ce.date BETWEEN :date_from AND :date_to
        GROUP BY v.id, v.name, v.license_plate, v.photo_url
        HAVING COALESCE(SUM(ce.amount), 0) > 0
        ORDER BY total_amount DESC
        LIMIT 20
    """, {'date_from': date_from, 'date_to': date_to})
    
    if vehicle_stats:
        # Summary metrics
        total_vehicles = len(vehicle_stats)
        total_spent = sum(v[4] for v in vehicle_stats)
        most_expensive = vehicle_stats[0]
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Автомобилей с расходами", total_vehicles)
        with col2:
            st.metric("Общие расходы", format_currency(total_spent))
        with col3:
            st.metric("Самый дорогой автомобиль", f"{most_expensive[1]} ({format_currency(most_expensive[4])})")
        
        st.divider()
        
        # Top 10 most expensive vehicles chart
        if len(vehicle_stats) >= 10:
            top_10 = vehicle_stats[:10]
            
            fig = px.bar(
                x=[f"{v[1]}\n({v[2]})" for v in top_10],
                y=[v[4] for v in top_10],
                title="🏆 ТОП-10 самых дорогих автомобилей",
                labels={'x': 'Автомобили', 'y': 'Общие расходы (€)'},
                color=[v[4] for v in top_10],
                color_continuous_scale='Reds'
            )
            fig.update_layout(height=400, showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        
        # Expense breakdown by category
        st.subheader("📈 Структура расходов по категориям")
        
        categories = ['fuel_cost', 'repair_cost', 'maintenance_cost', 'insurance_cost', 'other_cost']
        category_names = ['Топливо', 'Ремонт', 'Обслуживание', 'Страховка', 'Прочее']
        
        category_totals = {}
        for i, cat in enumerate(categories):
            category_totals[category_names[i]] = sum(v[5 + i] for v in vehicle_stats)
        
        # Pie chart for expense categories
        fig_pie = px.pie(
            values=list(category_totals.values()),
            names=list(category_totals.keys()),
            title="Распределение расходов по категориям"
        )
        
        col1, col2 = st.columns(2)
        with col1:
            st.plotly_chart(fig_pie, use_container_width=True)
        
        with col2:
            # Category breakdown metrics
            st.write("**Расходы по категориям:**")
            for cat_name, amount in category_totals.items():
                if amount > 0:
                    percentage = (amount / total_spent) * 100
                    st.metric(cat_name, format_currency(amount), f"{percentage:.1f}%")
        
        st.divider()
        
        # Detailed vehicle table
        st.subheader("📋 Детальная таблица расходов по автомобилям")
        
        # Create DataFrame for better display
        df_vehicles = pd.DataFrame(vehicle_stats, columns=[
            'ID', 'Название', 'Номер', 'Фото', 'Количество_расходов', 'Общая_сумма', 
            'Средний_расход', 'Топливо', 'Ремонт', 'Обслуживание', 'Страховка', 'Прочее'
        ])
        
        # Display table with formatting
        for idx, vehicle in enumerate(vehicle_stats):
            with st.expander(f"🚗 {vehicle[1]} ({vehicle[2]}) - {format_currency(vehicle[4])}", expanded=idx < 3):
                col1, col2, col3 = st.columns([1, 2, 2])
                
                with col1:
                    # Vehicle photo
                    if vehicle[3]:
                        try:
                            st.image(vehicle[3], width=100, caption="Фото автомобиля")
                        except:
                            st.write("📷 Фото недоступно")
                    else:
                        st.write("🚗 Без фото")
                
                with col2:
                    st.write(f"**Общие расходы:** {format_currency(vehicle[4])}")
                    st.write(f"**Количество операций:** {vehicle[5]}")
                    st.write(f"**Средний расход:** {format_currency(vehicle[6])}")
                
                with col3:
                    st.write("**По категориям:**")
                    if vehicle[7] > 0: st.write(f"• Топливо: {format_currency(vehicle[7])}")
                    if vehicle[8] > 0: st.write(f"• Ремонт: {format_currency(vehicle[8])}")
                    if vehicle[9] > 0: st.write(f"• Обслуживание: {format_currency(vehicle[9])}")
                    if vehicle[10] > 0: st.write(f"• Страховка: {format_currency(vehicle[10])}")
                    if vehicle[11] > 0: st.write(f"• Прочее: {format_currency(vehicle[11])}")
    else:
        st.info("📊 Нет данных о расходах автомобилей за выбранный период")
        st.write("Убедитесь что:")
        st.write("- В системе есть автомобили")
        st.write("- За выбранный период были расходы на автомобили")
        st.write("- Выбранный период содержит даты с расходами")

def show_team_analytics():
    """Show team expense analytics"""
    st.subheader("👥 Аналитика расходов по бригадам")
    
    # Date filter
    col1, col2 = st.columns(2)
    with col1:
        date_from = st.date_input(
            "С даты",
            value=datetime.now() - timedelta(days=30),
            help="Начальная дата для анализа",
            key="team_date_from"
        )
    with col2:
        date_to = st.date_input(
            "По дату", 
            value=datetime.now(),
            help="Конечная дата для анализа",
            key="team_date_to"
        )
    
    # Get team statistics
    team_stats = execute_query("""
        WITH team_penalties AS (
            SELECT 
                t.id,
                t.name,
                COUNT(p.id) as penalty_count,
                COALESCE(SUM(p.amount), 0) as penalty_total
            FROM teams t
            LEFT JOIN penalties p ON t.id = p.team_id 
                AND p.date BETWEEN :date_from AND :date_to
            GROUP BY t.id, t.name
        ),
        team_materials AS (
            SELECT 
                t.id,
                t.name, 
                COUNT(ma.id) as material_assignments,
                COALESCE(SUM(m.unit_price * ma.quantity), 0) as material_cost,
                COUNT(CASE WHEN ma.status = 'broken' THEN 1 END) as broken_items,
                COALESCE(SUM(CASE WHEN ma.status = 'broken' THEN m.unit_price * ma.quantity ELSE 0 END), 0) as broken_cost
            FROM teams t
            LEFT JOIN material_assignments ma ON t.id = ma.team_id 
                AND ma.assignment_date BETWEEN :date_from AND :date_to
            LEFT JOIN materials m ON ma.material_id = m.id
            GROUP BY t.id, t.name
        )
        SELECT 
            t.id,
            t.name,
            tp.penalty_count,
            tp.penalty_total,
            tm.material_assignments,
            tm.material_cost,
            tm.broken_items,
            tm.broken_cost,
            (tp.penalty_total + tm.material_cost) as total_cost
        FROM teams t
        LEFT JOIN team_penalties tp ON t.id = tp.id
        LEFT JOIN team_materials tm ON t.id = tm.id
        WHERE (tp.penalty_total + tm.material_cost) > 0
        ORDER BY total_cost DESC
        LIMIT 20
    """, {'date_from': date_from, 'date_to': date_to})
    
    if team_stats:
        # Summary metrics
        total_teams = len(team_stats)
        total_spent = sum(t[8] for t in team_stats)
        most_expensive = team_stats[0]
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Бригад с расходами", total_teams)
        with col2:
            st.metric("Общие расходы", format_currency(total_spent))
        with col3:
            st.metric("Самая дорогая бригада", f"{most_expensive[1]} ({format_currency(most_expensive[8])})")
        
        st.divider()
        
        # Top teams chart
        if len(team_stats) >= 5:
            top_teams = team_stats[:min(10, len(team_stats))]
            
            fig = px.bar(
                x=[t[1] for t in top_teams],
                y=[t[8] for t in top_teams],
                title="🏆 Самые дорогие бригады",
                labels={'x': 'Бригады', 'y': 'Общие расходы (€)'},
                color=[t[8] for t in top_teams],
                color_continuous_scale='Oranges'
            )
            fig.update_layout(height=400, showlegend=False)
            fig.update_xaxes(tickangle=45)
            st.plotly_chart(fig, use_container_width=True)
        
        # Expense breakdown: penalties vs materials
        st.subheader("📈 Структура расходов: штрафы vs материалы")
        
        total_penalties = sum(t[3] for t in team_stats)
        total_materials = sum(t[5] for t in team_stats)
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Pie chart
            fig_pie = px.pie(
                values=[total_penalties, total_materials],
                names=['Штрафы', 'Материалы'],
                title="Штрафы vs Материалы"
            )
            st.plotly_chart(fig_pie, use_container_width=True)
        
        with col2:
            st.metric("Общие штрафы", format_currency(total_penalties))
            st.metric("Стоимость материалов", format_currency(total_materials))
            
            if total_spent > 0:
                penalty_pct = (total_penalties / total_spent) * 100
                material_pct = (total_materials / total_spent) * 100
                st.write(f"**Штрафы:** {penalty_pct:.1f}% от общих расходов")
                st.write(f"**Материалы:** {material_pct:.1f}% от общих расходов")
        
        st.divider()
        
        # Detailed team table
        st.subheader("📋 Детальная таблица расходов по бригадам")
        
        for idx, team in enumerate(team_stats):
            with st.expander(f"👥 {team[1]} - {format_currency(team[8])}", expanded=idx < 3):
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.write("**Штрафы:**")
                    st.write(f"Количество: {team[2]}")
                    st.write(f"Сумма: {format_currency(team[3])}")
                
                with col2:
                    st.write("**Материалы:**")
                    st.write(f"Выдач: {team[4]}")
                    st.write(f"Стоимость: {format_currency(team[5])}")
                    st.write(f"Сломано: {team[6]} шт.")
                
                with col3:
                    st.write("**Итого:**")
                    st.write(f"Общая сумма: {format_currency(team[8])}")
                    if team[7] > 0:
                        st.write(f"Ущерб: {format_currency(team[7])}")
                    
                    # Calculate efficiency
                    if team[8] > 0:
                        penalty_ratio = (team[3] / team[8]) * 100
                        if penalty_ratio > 50:
                            st.error(f"⚠️ Много штрафов: {penalty_ratio:.0f}%")
                        elif penalty_ratio > 25:
                            st.warning(f"⚠️ Штрафы: {penalty_ratio:.0f}%")
                        else:
                            st.success(f"✅ Штрафы: {penalty_ratio:.0f}%")
    else:
        st.info("📊 Нет данных о расходах бригад за выбранный период")
        st.write("Убедитесь что:")
        st.write("- В системе есть бригады")
        st.write("- За выбранный период были штрафы или выдачи материалов")
        st.write("- Выбранный период содержит даты с активностью")

def show_comparative_analytics():
    """Show comparative analytics between vehicles and teams"""
    st.subheader("⚖️ Сравнительная аналитика")
    
    # Get summary data for comparison
    date_from = datetime.now() - timedelta(days=30)
    date_to = datetime.now()
    
    col1, col2 = st.columns(2)
    with col1:
        date_from = st.date_input(
            "С даты",
            value=date_from,
            help="Начальная дата для сравнительного анализа",
            key="comp_date_from"
        )
    with col2:
        date_to = st.date_input(
            "По дату",
            value=date_to, 
            help="Конечная дата для сравнительного анализа",
            key="comp_date_to"
        )
    
    # Vehicle expenses summary
    vehicle_summary = execute_query("""
        SELECT COALESCE(SUM(amount), 0) as total_vehicle_expenses
        FROM car_expenses 
        WHERE date BETWEEN :date_from AND :date_to
    """, {'date_from': date_from, 'date_to': date_to})
    
    # Team expenses summary  
    team_summary = execute_query("""
        SELECT 
            COALESCE(SUM(p.amount), 0) + 
            COALESCE(SUM(m.unit_price * ma.quantity), 0) as total_team_expenses
        FROM penalties p
        FULL OUTER JOIN material_assignments ma ON 1=1
        FULL OUTER JOIN materials m ON ma.material_id = m.id
        WHERE (p.date BETWEEN :date_from AND :date_to) 
           OR (ma.assignment_date BETWEEN :date_from AND :date_to)
    """, {'date_from': date_from, 'date_to': date_to})
    
    vehicle_total = vehicle_summary[0][0] if vehicle_summary else 0
    team_total = team_summary[0][0] if team_summary else 0
    grand_total = vehicle_total + team_total
    
    # Summary comparison
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("🚗 Расходы на автомобили", format_currency(vehicle_total))
    with col2:
        st.metric("👥 Расходы на бригады", format_currency(team_total))
    with col3:
        st.metric("💰 Общие расходы", format_currency(grand_total))
    
    if grand_total > 0:
        # Percentage breakdown
        vehicle_pct = (vehicle_total / grand_total) * 100
        team_pct = (team_total / grand_total) * 100
        
        st.divider()
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Comparison pie chart
            fig_comp = px.pie(
                values=[vehicle_total, team_total],
                names=['Автомобили', 'Бригады'],
                title="Распределение расходов: Автомобили vs Бригады",
                color_discrete_map={'Автомобили': '#FF6B6B', 'Бригады': '#4ECDC4'}
            )
            st.plotly_chart(fig_comp, use_container_width=True)
        
        with col2:
            st.write("**Процентное соотношение:**")
            st.progress(vehicle_pct/100, f"🚗 Автомобили: {vehicle_pct:.1f}%")
            st.progress(team_pct/100, f"👥 Бригады: {team_pct:.1f}%")
            
            st.divider()
            
            # Recommendations
            st.write("**💡 Рекомендации:**")
            if vehicle_pct > 70:
                st.warning("Высокие расходы на автомобили. Рассмотрите оптимизацию технического обслуживания.")
            elif team_pct > 70:
                st.warning("Высокие расходы на бригады. Обратите внимание на штрафы и использование материалов.")
            else:
                st.success("Сбалансированное распределение расходов.")
    
    st.divider()
    
    # Trends over time
    st.subheader("📈 Тренды расходов по времени")
    
    # Get daily expenses for the last 30 days
    daily_expenses = execute_query("""
        WITH vehicle_daily AS (
            SELECT 
                date,
                SUM(amount) as vehicle_amount
            FROM car_expenses
            WHERE date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY date
        ),
        team_daily AS (
            SELECT 
                date,
                SUM(amount) as penalty_amount
            FROM penalties
            WHERE date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY date
        )
        SELECT 
            COALESCE(vd.date, td.date) as expense_date,
            COALESCE(vd.vehicle_amount, 0) as vehicle_expenses,
            COALESCE(td.penalty_amount, 0) as team_expenses
        FROM vehicle_daily vd
        FULL OUTER JOIN team_daily td ON vd.date = td.date
        ORDER BY expense_date
    """)
    
    if daily_expenses:
        df_daily = pd.DataFrame(daily_expenses, columns=['Date', 'Vehicle_Expenses', 'Team_Expenses'])
        df_daily['Total'] = df_daily['Vehicle_Expenses'] + df_daily['Team_Expenses']
        
        fig_trend = go.Figure()
        
        fig_trend.add_trace(go.Scatter(
            x=df_daily['Date'],
            y=df_daily['Vehicle_Expenses'],
            name='Автомобили',
            line=dict(color='#FF6B6B'),
            fill='tonexty'
        ))
        
        fig_trend.add_trace(go.Scatter(
            x=df_daily['Date'],
            y=df_daily['Team_Expenses'],
            name='Бригады',
            line=dict(color='#4ECDC4'),
            fill='tozeroy'
        ))
        
        fig_trend.add_trace(go.Scatter(
            x=df_daily['Date'],
            y=df_daily['Total'],
            name='Общие расходы',
            line=dict(color='#45B7D1', width=3, dash='dash')
        ))
        
        fig_trend.update_layout(
            title="Динамика расходов за последние 30 дней",
            xaxis_title="Дата",
            yaxis_title="Расходы (€)",
            height=400
        )
        
        st.plotly_chart(fig_trend, use_container_width=True)
    else:
        st.info("Недостаточно данных для отображения трендов")

# Main page
st.title("📊 Аналитика расходов")

st.info("""
**🎯 Комплексная аналитика расходов флота**

Эта страница предоставляет детальную аналитику всех расходов в системе управления флотом:
- **🚗 Расходы по автомобилям** - топливо, ремонт, обслуживание, страховка
- **👥 Расходы по бригадам** - штрафы, материалы, поломки оборудования
- **⚖️ Сравнительный анализ** - что обходится дороже: автомобили или бригады
""")

# Tabs for different analytics
tab1, tab2, tab3 = st.tabs([
    "🚗 По автомобилям",
    "👥 По бригадам", 
    "⚖️ Сравнительная аналитика"
])

with tab1:
    show_vehicle_analytics()

with tab2:
    show_team_analytics()

with tab3:
    show_comparative_analytics()