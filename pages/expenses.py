import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, get_vehicles_for_select, get_teams_for_select, upload_file, format_currency
from datetime import datetime, date, timedelta
import uuid
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
        
        # Build query with filters
        query = """
            SELECT 
                e.id,
                e.date,
                e.type,
                v.name as vehicle_name,
                v.license_plate,
                t.name as team_name,
                e.amount,
                e.description,
                e.receipt_url
            FROM expenses e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            LEFT JOIN teams t ON e.team_id = t.id
            WHERE 1=1
        """
        params = {}
        
        if search_term:
            query += " AND e.description ILIKE :search"
            params['search'] = f"%{search_term}%"
        
        if type_filter != 'all':
            query += " AND e.type = :type"
            params['type'] = type_filter
        
        if date_from:
            query += " AND e.date >= :date_from"
            params['date_from'] = date_from
        
        if date_to:
            query += " AND e.date <= :date_to"
            params['date_to'] = date_to
        
        query += " ORDER BY e.date DESC"
        
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
                        if st.button(f"✏️", key=f"edit_expense_{expense[0]}"):
                            show_edit_expense_form(expense, language)
                        if st.button(f"🗑️", key=f"delete_expense_{expense[0]}"):
                            delete_expense(expense[0], language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading expenses: {str(e)}")

def show_add_expense_form(language='ru'):
    """Show form to add new expense"""
    st.subheader(f"{get_text('add', language)} {get_text('expenses', language)}")
    
    with st.form("add_expense_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            expense_type = st.selectbox(
                "Тип расхода/Ausgabentyp",
                options=['vehicle', 'team'],
                format_func=lambda x: get_text(x, language),
                key="new_expense_type"
            )
            
            expense_date = st.date_input(
                get_text('date', language),
                value=date.today(),
                key="new_expense_date"
            )
            
            amount = st.number_input(
                get_text('amount', language),
                min_value=0.01,
                value=100.0,
                step=50.0,
                key="new_expense_amount"
            )
        
        with col2:
            # Vehicle or team selection based on type
            vehicle_id = None
            team_id = None
            
            if expense_type == 'vehicle':
                vehicles = get_vehicles_for_select(language)
                if vehicles:
                    vehicle_id = st.selectbox(
                        get_text('vehicles', language),
                        options=[v[0] for v in vehicles],
                        format_func=lambda x: next(v[1] for v in vehicles if v[0] == x),
                        key="new_expense_vehicle"
                    )
            else:  # team
                teams = get_teams_for_select(language)
                if teams:
                    team_id = st.selectbox(
                        get_text('teams', language),
                        options=[t[0] for t in teams],
                        format_func=lambda x: next(t[1] for t in teams if t[0] == x),
                        key="new_expense_team"
                    )
            
            description = st.text_area(
                get_text('description', language),
                key="new_expense_description"
            )
            
            # Receipt upload
            receipt_file = st.file_uploader(
                "Чек/Beleg",
                type=['png', 'jpg', 'jpeg', 'pdf'],
                key="new_expense_receipt"
            )
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            if expense_type == 'vehicle' and not vehicle_id:
                st.error("Выберите автомобиль / Fahrzeug auswählen")
            elif expense_type == 'team' and not team_id:
                st.error("Выберите бригаду / Team auswählen")
            else:
                try:
                    receipt_url = upload_file(receipt_file, 'receipts') if receipt_file else None
                    
                    expense_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO expenses (id, type, vehicle_id, team_id, date, amount, description, receipt_url)
                        VALUES (:id, :type, :vehicle_id, :team_id, :date, :amount, :description, :receipt_url)
                    """, {
                        'id': expense_id,
                        'type': expense_type,
                        'vehicle_id': vehicle_id if expense_type == 'vehicle' else None,
                        'team_id': team_id if expense_type == 'team' else None,
                        'date': expense_date,
                        'amount': amount,
                        'description': description if description else None,
                        'receipt_url': receipt_url
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")

def show_edit_expense_form(expense, language='ru'):
    """Show form to edit expense"""
    with st.expander(f"✏️ {get_text('edit', language)}: {expense[1].strftime('%d.%m.%Y')}", expanded=True):
        with st.form(f"edit_expense_form_{expense[0]}"):
            col1, col2 = st.columns(2)
            
            with col1:
                expense_type = st.selectbox(
                    "Тип расхода/Ausgabentyp",
                    options=['vehicle', 'team'],
                    index=['vehicle', 'team'].index(expense[2]),
                    format_func=lambda x: get_text(x, language),
                    key=f"edit_expense_type_{expense[0]}"
                )
                
                expense_date = st.date_input(
                    get_text('date', language),
                    value=expense[1],
                    key=f"edit_expense_date_{expense[0]}"
                )
                
                amount = st.number_input(
                    get_text('amount', language),
                    min_value=0.01,
                    value=float(expense[6]),
                    step=50.0,
                    key=f"edit_expense_amount_{expense[0]}"
                )
            
            with col2:
                # Vehicle or team selection based on type
                vehicle_id = None
                team_id = None
                
                if expense_type == 'vehicle':
                    vehicles = get_vehicles_for_select(language)
                    if vehicles:
                        current_vehicle = None
                        if expense[3]:  # current vehicle name
                            current_vehicle = next((v[0] for v in vehicles if expense[3] in v[1]), None)
                        
                        vehicle_id = st.selectbox(
                            get_text('vehicles', language),
                            options=[v[0] for v in vehicles],
                            format_func=lambda x: next(v[1] for v in vehicles if v[0] == x),
                            index=[v[0] for v in vehicles].index(current_vehicle) if current_vehicle else 0,
                            key=f"edit_expense_vehicle_{expense[0]}"
                        )
                else:  # team
                    teams = get_teams_for_select(language)
                    if teams:
                        current_team = None
                        if expense[5]:  # current team name
                            current_team = next((t[0] for t in teams if t[1] == expense[5]), None)
                        
                        team_id = st.selectbox(
                            get_text('teams', language),
                            options=[t[0] for t in teams],
                            format_func=lambda x: next(t[1] for t in teams if t[0] == x),
                            index=[t[0] for t in teams].index(current_team) if current_team else 0,
                            key=f"edit_expense_team_{expense[0]}"
                        )
                
                description = st.text_area(
                    get_text('description', language),
                    value=expense[7] or '',
                    key=f"edit_expense_description_{expense[0]}"
                )
                
                # Show current receipt if exists
                if expense[8]:  # receipt_url
                    st.write(f"Текущий чек/Aktueller Beleg: {expense[8]}")
                
                # Receipt upload
                receipt_file = st.file_uploader(
                    "Новый чек/Neuer Beleg",
                    type=['png', 'jpg', 'jpeg', 'pdf'],
                    key=f"edit_expense_receipt_{expense[0]}"
                )
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                submitted = st.form_submit_button(get_text('save', language))
            
            with col_cancel:
                cancelled = st.form_submit_button(get_text('cancel', language))
            
            if submitted:
                try:
                    receipt_url = expense[8]  # Keep existing receipt URL
                    if receipt_file:
                        receipt_url = upload_file(receipt_file, 'receipts')
                    
                    execute_query("""
                        UPDATE expenses 
                        SET type = :type, vehicle_id = :vehicle_id, team_id = :team_id,
                            date = :date, amount = :amount, description = :description, 
                            receipt_url = :receipt_url
                        WHERE id = :id
                    """, {
                        'id': expense[0],
                        'type': expense_type,
                        'vehicle_id': vehicle_id if expense_type == 'vehicle' else None,
                        'team_id': team_id if expense_type == 'team' else None,
                        'date': expense_date,
                        'amount': amount,
                        'description': description if description else None,
                        'receipt_url': receipt_url
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")
            
            if cancelled:
                st.rerun()

def delete_expense(expense_id, language='ru'):
    """Delete expense"""
    try:
        execute_query("DELETE FROM expenses WHERE id = :id", {'id': expense_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"{get_text('error_delete', language)}: {str(e)}")

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
        
        # Get expenses for the period
        expenses_data = execute_query("""
            SELECT 
                e.date,
                e.type,
                e.amount,
                v.name as vehicle_name,
                t.name as team_name
            FROM expenses e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            LEFT JOIN teams t ON e.team_id = t.id
            WHERE e.date >= :start_date AND e.date <= :end_date
            ORDER BY e.date
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
    """Export expenses data to CSV"""
    try:
        expenses = execute_query("""
            SELECT 
                e.date,
                e.type,
                v.name as vehicle_name,
                v.license_plate,
                t.name as team_name,
                e.amount,
                e.description
            FROM expenses e
            LEFT JOIN vehicles v ON e.vehicle_id = v.id
            LEFT JOIN teams t ON e.team_id = t.id
            ORDER BY e.date DESC
        """)
        
        if expenses:
            export_to_csv(expenses, "expenses")
        else:
            st.warning(get_text('no_data', language))
    except Exception as e:
        st.error(f"Export error: {str(e)}")
