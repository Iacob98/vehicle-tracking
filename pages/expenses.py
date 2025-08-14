import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, format_currency
from datetime import datetime, date, timedelta
import plotly.express as px

def show_page(language='ru'):
    """Show general expenses management page"""
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
    """Show combined list of all expenses (car expenses + penalties)"""
    try:
        # Filters
        col1, col2, col3, col4, col5 = st.columns([2, 1, 1, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder="Поиск... / Suche..."
            )
        
        with col2:
            expense_type = st.selectbox(
                "Тип/Typ",
                options=['all', 'car_expenses', 'penalties'],
                format_func=lambda x: {
                    'all': 'Все/Alle',
                    'car_expenses': 'Авто расходы/Auto Ausgaben',
                    'penalties': 'Штрафы/Strafen'
                }[x]
            )
        
        with col3:
            date_from = st.date_input(
                "От/Von",
                value=None,
                key="all_expense_date_from"
            )
        
        with col4:
            date_to = st.date_input(
                "До/Bis",
                value=None,
                key="all_expense_date_to"
            )
        
        with col5:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_all_expenses_data(language)
        
        # Build combined query
        car_expenses_query = """
            SELECT 
                ce.id,
                ce.date,
                v.name as vehicle_name,
                v.license_plate,
                ce.amount,
                ce.description,
                'car_expense' as type,
                ce.category as category
            FROM car_expenses ce
            JOIN vehicles v ON ce.vehicle_id = v.id
            WHERE 1=1
        """
        
        penalties_query = """
            SELECT 
                p.id,
                p.date,
                v.name as vehicle_name,
                v.license_plate,
                p.amount,
                COALESCE(p.description, 'Штраф/Strafe') as description,
                'penalty' as type,
                'penalty' as category
            FROM penalties p
            JOIN vehicles v ON p.vehicle_id = v.id
            WHERE 1=1
        """
        
        params = {}
        
        # Add search filters
        if search_term:
            search_filter = """ AND (
                v.name ILIKE :search OR 
                v.license_plate ILIKE :search OR
                description ILIKE :search
            )"""
            car_expenses_query += search_filter.replace("description", "ce.description")
            penalties_query += search_filter.replace("description", "p.description")
            params['search'] = f"%{search_term}%"
        
        # Add date filters
        if date_from:
            date_filter_from = " AND date >= :date_from"
            car_expenses_query += date_filter_from.replace("date", "ce.date")
            penalties_query += date_filter_from.replace("date", "p.date")
            params['date_from'] = date_from
        
        if date_to:
            date_filter_to = " AND date <= :date_to"
            car_expenses_query += date_filter_to.replace("date", "ce.date")
            penalties_query += date_filter_to.replace("date", "p.date")
            params['date_to'] = date_to
        
        # Combine queries based on type filter
        if expense_type == 'all':
            combined_query = f"""
                ({car_expenses_query})
                UNION ALL
                ({penalties_query})
                ORDER BY date DESC
            """
        elif expense_type == 'car_expenses':
            combined_query = car_expenses_query + " ORDER BY ce.date DESC"
        else:  # penalties
            combined_query = penalties_query + " ORDER BY p.date DESC"
        
        expenses = execute_query(combined_query, params) or []
        
        if expenses and len(expenses) > 0:
            # Summary statistics
            total_amount = sum(float(expense[4]) for expense in expenses)
            car_expense_count = sum(1 for expense in expenses if expense[6] == 'car_expense')
            penalty_count = sum(1 for expense in expenses if expense[6] == 'penalty')
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Всего записей/Gesamteinträge", len(expenses))
            with col2:
                st.metric("Общая сумма/Gesamtbetrag", format_currency(total_amount))
            with col3:
                st.metric("Расходы авто/Auto Ausgaben", car_expense_count)
            with col4:
                st.metric("Штрафы/Strafen", penalty_count)
            
            st.divider()
            
            # Display expenses
            for expense in expenses:
                with st.container():
                    col1, col2, col3 = st.columns([3, 2, 2])
                    
                    with col1:
                        type_icon = "🚗" if expense[6] == 'car_expense' else "🚧"
                        st.write(f"{type_icon} **{expense[2]}** ({expense[3]})")
                        expense_date = expense[1].strftime('%d.%m.%Y') if expense[1] else ''
                        st.write(f"📅 {expense_date}")
                    
                    with col2:
                        st.write(f"💰 {format_currency(expense[4])}")
                        if expense[6] == 'car_expense':
                            category_text = get_text(expense[7], language)
                            st.write(f"📋 {category_text}")
                        else:
                            st.write("🚧 Штраф/Strafe")
                    
                    with col3:
                        if expense[5]:  # description
                            st.write(f"📝 {expense[5]}")
                        
                        type_text = "Расход авто/Auto Ausgabe" if expense[6] == 'car_expense' else "Штраф/Strafe"
                        st.write(f"🏷️ {type_text}")
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
            
    except Exception as e:
        st.error(f"Error loading expenses: {str(e)}")

def show_add_expense_form(language='ru'):
    """Show form to add new general expense"""
    st.subheader("Добавить расход / Ausgabe hinzufügen")
    
    expense_type = st.radio(
        "Тип расхода / Ausgabentyp",
        options=['car_expense', 'penalty'],
        format_func=lambda x: "Расход автомобиля / Auto Ausgabe" if x == 'car_expense' else "Штраф / Strafe"
    )
    
    if expense_type == 'car_expense':
        st.info("Для добавления расходов автомобиля перейдите в раздел 'Расходы на авто' / Für Auto-Ausgaben gehen Sie zum Bereich 'Auto-Ausgaben'")
    else:
        st.info("Для добавления штрафов перейдите в раздел 'Штрафы' / Für Strafen gehen Sie zum Bereich 'Strafen'")

def show_expenses_analytics(language='ru'):
    """Show combined expenses analytics"""
    st.subheader("Аналитика всех расходов / Analyse aller Ausgaben")
    
    try:
        # Monthly combined expenses
        monthly_data = execute_query("""
            SELECT 
                month,
                SUM(car_amount) as car_total,
                SUM(penalty_amount) as penalty_total,
                SUM(car_amount + penalty_amount) as total_amount
            FROM (
                SELECT 
                    DATE_TRUNC('month', ce.date) as month,
                    SUM(ce.amount) as car_amount,
                    0 as penalty_amount
                FROM car_expenses ce
                WHERE ce.date >= :six_months_ago
                GROUP BY DATE_TRUNC('month', ce.date)
                
                UNION ALL
                
                SELECT 
                    DATE_TRUNC('month', p.date) as month,
                    0 as car_amount,
                    SUM(p.amount) as penalty_amount
                FROM penalties p
                WHERE p.date >= :six_months_ago
                GROUP BY DATE_TRUNC('month', p.date)
            ) combined
            GROUP BY month
            ORDER BY month
        """, {'six_months_ago': (datetime.now() - timedelta(days=180)).date()}) or []
        
        if monthly_data and len(monthly_data) > 0:
            df_monthly = pd.DataFrame(list(monthly_data), columns=[
                'Month', 'Car_Expenses', 'Penalties', 'Total'
            ])
            df_monthly['Month'] = pd.to_datetime(df_monthly['Month'])
            df_monthly['Month_Str'] = df_monthly['Month'].dt.strftime('%Y-%m')
            
            # Stacked bar chart
            fig_monthly = px.bar(
                df_monthly.melt(
                    id_vars=['Month_Str'], 
                    value_vars=['Car_Expenses', 'Penalties'],
                    var_name='Type', 
                    value_name='Amount'
                ),
                x='Month_Str',
                y='Amount',
                color='Type',
                title='Ежемесячные расходы по типам / Monatliche Ausgaben nach Typ'
            )
            st.plotly_chart(fig_monthly, use_container_width=True)
        
        # Expense type distribution
        type_data = execute_query("""
            SELECT 
                'Расходы авто/Auto Ausgaben' as type,
                SUM(amount) as total_amount
            FROM car_expenses
            
            UNION ALL
            
            SELECT 
                'Штрафы/Strafen' as type,
                SUM(amount) as total_amount
            FROM penalties
        """) or []
        
        if type_data and len(type_data) > 0:
            df_types = pd.DataFrame(list(type_data), columns=['Type', 'Amount'])
            
            fig_types = px.pie(
                df_types,
                values='Amount',
                names='Type',
                title='Распределение расходов по типам / Ausgabenverteilung nach Typ'
            )
            st.plotly_chart(fig_types, use_container_width=True)
        
        # Top vehicles by total expenses
        vehicle_data = execute_query("""
            SELECT 
                v.name,
                v.license_plate,
                COALESCE(SUM(ce.amount), 0) + COALESCE(SUM(p.amount), 0) as total_amount,
                COALESCE(SUM(ce.amount), 0) as car_expenses,
                COALESCE(SUM(p.amount), 0) as penalties
            FROM vehicles v
            LEFT JOIN car_expenses ce ON v.id = ce.vehicle_id
            LEFT JOIN penalties p ON v.id = p.vehicle_id
            GROUP BY v.id, v.name, v.license_plate
            HAVING COALESCE(SUM(ce.amount), 0) + COALESCE(SUM(p.amount), 0) > 0
            ORDER BY total_amount DESC
            LIMIT 10
        """) or []
        
        if vehicle_data and len(vehicle_data) > 0:
            df_vehicles = pd.DataFrame(list(vehicle_data), columns=[
                'Автомобиль/Fahrzeug',
                'Номер/Nummer', 
                'Общие расходы/Gesamtausgaben',
                'Расходы авто/Auto Ausgaben',
                'Штрафы/Strafen'
            ])
            
            # Format currency columns
            for col in ['Общие расходы/Gesamtausgaben', 'Расходы авто/Auto Ausgaben', 'Штрафы/Strafen']:
                df_vehicles[col] = df_vehicles[col].apply(lambda x: format_currency(x))
            
            st.subheader("Топ автомобилей по расходам / Top Fahrzeuge nach Ausgaben")
            st.dataframe(df_vehicles, use_container_width=True)
        
    except Exception as e:
        st.error(f"Error loading analytics: {str(e)}")

def export_all_expenses_data(language='ru'):
    """Export combined expenses data to CSV"""
    try:
        combined_data = execute_query("""
            SELECT 
                ce.date,
                v.name as vehicle_name,
                v.license_plate,
                ce.amount,
                ce.description,
                'Расход авто/Auto Ausgabe' as type,
                ce.category
            FROM car_expenses ce
            JOIN vehicles v ON ce.vehicle_id = v.id
            
            UNION ALL
            
            SELECT 
                p.date,
                v.name as vehicle_name,
                v.license_plate,
                p.amount,
                COALESCE(p.description, 'Штраф/Strafe') as description,
                'Штраф/Strafe' as type,
                'penalty' as category
            FROM penalties p
            JOIN vehicles v ON p.vehicle_id = v.id
            
            ORDER BY date DESC
        """) or []
        
        if combined_data:
            df = pd.DataFrame(list(combined_data), columns=[
                'Дата/Datum',
                'Автомобиль/Fahrzeug',
                'Номер/Nummer',
                'Сумма/Betrag',
                'Описание/Beschreibung',
                'Тип/Typ',
                'Категория/Kategorie'
            ])
            
            export_to_csv(df, f"all_expenses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            st.success("Данные экспортированы / Daten exportiert")
        else:
            st.warning("Нет данных для экспорта / Keine Daten zum Exportieren")
            
    except Exception as e:
        st.error(f"Error exporting data: {str(e)}")