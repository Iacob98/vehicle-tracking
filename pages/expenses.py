import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, format_currency
from datetime import datetime, date, timedelta
import plotly.express as px

def show_page(language='ru'):
    """Show expenses management page"""
    st.title(f"💰 {get_text('expenses', language)}")
    
    # Tabs for different views
    tab1, tab2, tab3 = st.tabs([
        get_text('expenses', language),
        get_text('add', language),
        "Аналитика/Analytik"
    ])
    
    with tab1:
        show_expenses_list(language)
    
    with tab2:
        show_add_expense_form(language)
    
    with tab3:
        show_expenses_analytics(language)

def show_expenses_list(language='ru'):
    """Show list of expenses"""
    try:
        # Filters
        col1, col2, col3, col4, col5 = st.columns([2, 1, 1, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder="Описание... / Beschreibung..."
            )
        
        with col2:
            type_filter = st.selectbox(
                "Тип/Typ",
                options=['all', 'vehicle', 'team'],
                format_func=lambda x: get_text(x, language) if x != 'all' else 'Все/Alle'
            )
        
        with col3:
            date_from = st.date_input(
                "От/Von",
                value=None,
                key="expense_date_from"
            )
        
        with col4:
            date_to = st.date_input(
                "До/Bis",
                value=None,
                key="expense_date_to"
            )
        
        with col5:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_expenses_data(language)
        
        # Combined query from car_expenses and penalties
        params = {}
        where_conditions = []
        
        if search_term:
            where_conditions.append("description ILIKE :search")
            params['search'] = f"%{search_term}%"
        
        if date_from:
            where_conditions.append("date >= :date_from")
            params['date_from'] = date_from
        
        if date_to:
            where_conditions.append("date <= :date_to")
            params['date_to'] = date_to
        
        where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
        
        if type_filter == 'vehicle':
            query = f"""
                SELECT 
                    ce.id,
                    ce.date,
                    'vehicle' as type,
                    v.name as vehicle_name,
                    v.license_plate,
                    null as team_name,
                    ce.amount,
                    CASE 
                        WHEN ce.maintenance_id IS NOT NULL THEN 'Ремонт/Reparatur'
                        ELSE ce.category::text
                    END as description,
                    ce.file_url as receipt_url
                FROM car_expenses ce
                JOIN vehicles v ON ce.car_id = v.id
                WHERE {where_clause}
                ORDER BY ce.date DESC
            """
        elif type_filter == 'team':
            query = f"""
                SELECT 
                    p.id,
                    p.date,
                    'team' as type,
                    null as vehicle_name,
                    null as license_plate,
                    t.name as team_name,
                    p.amount,
                    COALESCE(p.description, 'Штраф/Strafe') as description,
                    p.photo_url as receipt_url
                FROM penalties p
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE {where_clause}
                ORDER BY p.date DESC
            """
        else:  # all
            query = f"""
                SELECT 
                    id, date, type, vehicle_name, license_plate, team_name, amount, description, receipt_url
                FROM (
                    SELECT 
                        ce.id,
                        ce.date,
                        'vehicle' as type,
                        v.name as vehicle_name,
                        v.license_plate,
                        null as team_name,
                        ce.amount,
                        CASE 
                            WHEN ce.maintenance_id IS NOT NULL THEN 'Ремонт/Reparatur'
                            ELSE ce.category::text
                        END as description,
                        ce.file_url as receipt_url
                    FROM car_expenses ce
                    JOIN vehicles v ON ce.car_id = v.id
                    
                    UNION ALL
                    
                    SELECT 
                        p.id,
                        p.date,
                        'team' as type,
                        null as vehicle_name,
                        null as license_plate,
                        t.name as team_name,
                        p.amount,
                        COALESCE(p.description, 'Штраф/Strafe') as description,
                        p.photo_url as receipt_url
                    FROM penalties p
                    LEFT JOIN teams t ON p.team_id = t.id
                ) combined_expenses
                WHERE {where_clause}
                ORDER BY date DESC
            """
        
        expenses = execute_query(query, params)
        
        if expenses:
            # Summary statistics
            total_amount = sum(float(expense[6]) for expense in expenses)
            vehicle_expenses = sum(float(expense[6]) for expense in expenses if expense[2] == 'vehicle')
            team_expenses = sum(float(expense[6]) for expense in expenses if expense[2] == 'team')
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Всего расходов/Ausgaben insgesamt", len(expenses))
            with col2:
                st.metric("Общая сумма/Gesamtbetrag", format_currency(total_amount))
            with col3:
                st.metric(f"🚗 {get_text('vehicle', language)}", format_currency(vehicle_expenses))
            with col4:
                st.metric(f"👥 {get_text('team', language)}", format_currency(team_expenses))
            
            st.divider()
            
            # Display expenses
            for expense in expenses:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        expense_date = expense[1].strftime('%d.%m.%Y') if expense[1] else ''
                        st.write(f"**{expense_date}**")
                        
                        if expense[2] == 'vehicle' and expense[3]:  # vehicle expense
                            st.write(f"🚗 {expense[3]} ({expense[4]})")
                        elif expense[2] == 'team' and expense[5]:  # team expense
                            st.write(f"👥 {expense[5]}")
                    
                    with col2:
                        st.write(f"💰 {format_currency(expense[6])}")
                        type_icon = '🚗' if expense[2] == 'vehicle' else '👥'
                        st.write(f"{type_icon} {get_text(expense[2], language)}")
                    
                    with col3:
                        if expense[7]:  # description
                            description = expense[7][:50] + "..." if len(expense[7]) > 50 else expense[7]
                            st.write(f"📝 {description}")
                        
                        if expense[8]:  # receipt_url
                            st.write("🧾 Чек есть/Beleg vorhanden")
                    
                    with col4:
                        st.write("") # Редактирование через специальные страницы
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading expenses: {str(e)}")

def show_add_expense_form(language='ru'):
    """Show form to add expense"""
    st.info("ℹ️ Для добавления расходов используйте соответствующие разделы:\n- Автомобильные расходы: 🚗💰 Расходы на авто\n- Штрафы бригад: 🚧 Штрафы\n\nFür das Hinzufügen von Ausgaben verwenden Sie die entsprechenden Bereiche:\n- Fahrzeugausgaben: 🚗💰 Расходы на авто\n- Teamstrafen: 🚧 Штрафы")

def show_expenses_analytics(language='ru'):
    """Show expenses analytics"""
    st.subheader("Аналитика расходов/Ausgabenanalytik")
    
    try:
        # Time period selection
        col1, col2 = st.columns(2)
        with col1:
            period = st.selectbox(
                "Период/Zeitraum",
                options=['month', 'quarter', 'year'],
                format_func=lambda x: {
                    'month': 'Месяц/Monat',
                    'quarter': 'Квартал/Quartal',
                    'year': 'Год/Jahr'
                }[x]
            )
        
        # Calculate date range based on period
        end_date = date.today()
        if period == 'month':
            start_date = end_date.replace(day=1)
        elif period == 'quarter':
            start_date = end_date - timedelta(days=90)
        else:  # year
            start_date = end_date.replace(month=1, day=1)
        
        with col2:
            st.write(f"Период: {start_date.strftime('%d.%m.%Y')} - {end_date.strftime('%d.%m.%Y')}")
        
        # Get combined expenses from both car expenses and penalties
        expenses_data = execute_query("""
            SELECT 
                date,
                'vehicle' as type,
                amount,
                vehicle_name,
                null as team_name
            FROM (
                SELECT 
                    ce.date,
                    ce.amount,
                    v.name as vehicle_name
                FROM car_expenses ce
                JOIN vehicles v ON ce.car_id = v.id
                WHERE ce.date >= :start_date AND ce.date <= :end_date
            ) car_data
            
            UNION ALL
            
            SELECT 
                date,
                'team' as type,
                amount,
                null as vehicle_name,
                team_name
            FROM (
                SELECT 
                    p.date,
                    p.amount,
                    t.name as team_name
                FROM penalties p
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE p.date >= :start_date AND p.date <= :end_date
            ) team_data
            
            ORDER BY date DESC
        """, {'start_date': start_date, 'end_date': end_date})
        
        if expenses_data:
            df = pd.DataFrame(expenses_data, columns=['Date', 'Type', 'Amount', 'Vehicle', 'Team'])
            df['Amount'] = df['Amount'].astype(float)
            
            # Summary metrics
            total_amount = df['Amount'].sum()
            vehicle_amount = df[df['Type'] == 'vehicle']['Amount'].sum()
            team_amount = df[df['Type'] == 'team']['Amount'].sum()
            avg_expense = df['Amount'].mean()
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Общие расходы/Gesamtausgaben", format_currency(total_amount))
            with col2:
                st.metric("Расходы на авто/Fahrzeugausgaben", format_currency(vehicle_amount))
            with col3:
                st.metric("Расходы бригад/Teamausgaben", format_currency(team_amount))
            with col4:
                st.metric("Средний расход/Durchschnitt", format_currency(avg_expense))
            
            st.divider()
            
            # Charts
            col1, col2 = st.columns(2)
            
            # Expenses by type
            with col1:
                st.subheader("По типам/Nach Typ")
                type_data = df.groupby('Type')['Amount'].sum().reset_index()
                type_data['Type_Translated'] = type_data['Type'].apply(
                    lambda x: get_text(x, language)
                )
                
                fig_type = px.pie(
                    type_data,
                    values='Amount',
                    names='Type_Translated',
                    title="Расходы по типам/Ausgaben nach Typ"
                )
                st.plotly_chart(fig_type, use_container_width=True)
            
            # Monthly trend
            with col2:
                st.subheader("Тренд по месяцам/Monatstrend")
                df['Date'] = pd.to_datetime(df['Date'])
                df['Month'] = df['Date'].dt.to_period('M')
                monthly_data = df.groupby('Month')['Amount'].sum().reset_index()
                monthly_data['Month_Str'] = monthly_data['Month'].astype(str)
                
                fig_trend = px.line(
                    monthly_data,
                    x='Month_Str',
                    y='Amount',
                    title="Расходы по месяцам/Monatliche Ausgaben"
                )
                st.plotly_chart(fig_trend, use_container_width=True)
            
            # Top vehicles by expenses
            st.subheader("Топ автомобилей по расходам/Top Fahrzeuge nach Ausgaben")
            vehicle_expenses = df[df['Type'] == 'vehicle'].groupby('Vehicle')['Amount'].sum().sort_values(ascending=False).head(10)
            
            if not vehicle_expenses.empty:
                vehicle_df = vehicle_expenses.reset_index()
                vehicle_df.columns = [get_text('vehicles', language), get_text('amount', language)]
                vehicle_df[get_text('amount', language)] = vehicle_df[get_text('amount', language)].apply(format_currency)
                st.dataframe(vehicle_df, use_container_width=True)
            
            # Top teams by expenses
            st.subheader("Топ бригад по расходам/Top Teams nach Ausgaben")
            team_expenses = df[df['Type'] == 'team'].groupby('Team')['Amount'].sum().sort_values(ascending=False).head(10)
            
            if not team_expenses.empty:
                team_df = team_expenses.reset_index()
                team_df.columns = [get_text('teams', language), get_text('amount', language)]
                team_df[get_text('amount', language)] = team_df[get_text('amount', language)].apply(format_currency)
                st.dataframe(team_df, use_container_width=True)
        
        else:
            st.info("Нет данных за выбранный период / Keine Daten für den ausgewählten Zeitraum")
    
    except Exception as e:
        st.error(f"Error loading analytics: {str(e)}")

def export_expenses_data(language='ru'):
    """Export expenses to CSV"""
    try:
        # Combined export from both car_expenses and penalties
        expenses = execute_query("""
            SELECT 
                date,
                'vehicle' as type,
                vehicle_name,
                license_plate,
                null as team_name,
                amount,
                description
            FROM (
                SELECT 
                    ce.date,
                    v.name as vehicle_name,
                    v.license_plate,
                    ce.amount,
                    CASE 
                        WHEN ce.maintenance_id IS NOT NULL THEN 'Ремонт/Reparatur'
                        ELSE ce.category::text
                    END as description
                FROM car_expenses ce
                JOIN vehicles v ON ce.car_id = v.id
            ) car_data
            
            UNION ALL
            
            SELECT 
                date,
                'team' as type,
                null as vehicle_name,
                null as license_plate,
                team_name,
                amount,
                description
            FROM (
                SELECT 
                    p.date,
                    t.name as team_name,
                    p.amount,
                    COALESCE(p.description, 'Штраф/Strafe') as description
                FROM penalties p
                LEFT JOIN teams t ON p.team_id = t.id
            ) team_data
            
            ORDER BY date DESC
        """)
        
        if expenses:
            df = pd.DataFrame(expenses, columns=['Date', 'Type', 'Vehicle', 'License_Plate', 'Team', 'Amount', 'Description'])
            df['Type'] = df['Type'].apply(lambda x: get_text(x, language))
            
            csv_data = export_to_csv(df, f"expenses_{date.today().strftime('%Y%m%d')}")
            st.download_button(
                label=f"📥 {get_text('download', language)} CSV",
                data=csv_data,
                file_name=f"expenses_{date.today().strftime('%Y%m%d')}.csv",
                mime="text/csv"
            )
        else:
            st.warning(get_text('no_data', language))
    except Exception as e:
        st.error(f"Ошибка экспорта / Export error: {str(e)}")