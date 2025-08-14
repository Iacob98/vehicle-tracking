import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, format_currency
from datetime import datetime, date, timedelta
import plotly.express as px

def show_page(language='ru'):
    """Show car expenses management page"""
    st.title(f"🚗💰 {get_text('car_expenses', language)}")
    
    # Tabs for different views
    tab1, tab2, tab3 = st.tabs([
        get_text('car_expenses', language),
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
    """Show list of car expenses"""
    try:
        # Filters
        col1, col2, col3, col4, col5 = st.columns([2, 1, 1, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder="Описание... / Beschreibung..."
            )
        
        with col2:
            category_filter = st.selectbox(
                "Категория/Kategorie",
                options=['all', 'repair', 'maintenance', 'fuel', 'insurance', 'toll', 'car_wash', 'other'],
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
        
        # Build query
        query = """
            SELECT 
                ce.id,
                ce.date,
                v.name as vehicle_name,
                v.license_plate,
                ce.category,
                ce.amount,
                ce.description,
                ce.file_url,
                ce.maintenance_id
            FROM car_expenses ce
            JOIN vehicles v ON ce.vehicle_id = v.id
            WHERE 1=1
        """
        params = {}
        
        if search_term:
            query += """ AND (
                ce.description ILIKE :search OR
                v.name ILIKE :search OR
                v.license_plate ILIKE :search
            )"""
            params['search'] = f"%{search_term}%"
        
        if category_filter != 'all':
            query += " AND ce.category = :category"
            params['category'] = category_filter
        
        if date_from:
            query += " AND ce.date >= :date_from"
            params['date_from'] = date_from
        
        if date_to:
            query += " AND ce.date <= :date_to"
            params['date_to'] = date_to
        
        query += " ORDER BY ce.date DESC"
        
        expenses = execute_query(query, params) or []
        
        if expenses and len(expenses) > 0:
            # Summary statistics
            total_amount = sum(float(expense[5]) for expense in expenses)
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Всего расходов/Ausgaben insgesamt", len(expenses))
            with col2:
                st.metric("Общая сумма/Gesamtbetrag", format_currency(total_amount))
            with col3:
                maintenance_linked = sum(1 for expense in expenses if expense[8])
                st.metric("Связано с ТО/Wartung verknüpft", maintenance_linked)
            
            st.divider()
            
            # Display expenses
            for expense in expenses:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{expense[2]}** ({expense[3]})")
                        expense_date = expense[1].strftime('%d.%m.%Y') if expense[1] else ''
                        st.write(f"📅 {expense_date}")
                        if expense[8]:  # maintenance_id
                            st.write("🔗 Связано с ТО/Mit Wartung verknüpft")
                    
                    with col2:
                        st.write(f"💰 {format_currency(expense[5])}")
                        category_text = get_text(expense[4], language)
                        st.write(f"📋 {category_text}")
                    
                    with col3:
                        if expense[6]:  # description
                            st.write(f"📝 {expense[6]}")
                        if expense[7]:  # file_url
                            st.write("📎 Документ есть/Dokument vorhanden")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_btn_expense_{expense[0]}"):
                            st.session_state[f'edit_expense_{expense[0]}'] = True
                            st.rerun()
                    
                    # Edit form
                    if st.session_state.get(f'edit_expense_{expense[0]}', False):
                        show_edit_expense_form(expense, language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
            
    except Exception as e:
        st.error(f"Error loading expenses: {str(e)}")

def show_add_expense_form(language='ru'):
    """Show form to add new car expense"""
    st.subheader(get_text('add_expense', language))
    
    try:
        # Get vehicles
        vehicles = execute_query("SELECT id, name, license_plate FROM vehicles ORDER BY name") or []
        
        if not vehicles:
            st.warning("Нет автомобилей в системе / Keine Fahrzeuge im System")
            return
        
        vehicle_options = {str(v[0]): f"{v[1]} ({v[2]})" for v in vehicles}
        
        col1, col2 = st.columns(2)
        
        with col1:
            selected_vehicle = st.selectbox(
                get_text('vehicle', language),
                options=list(vehicle_options.keys()),
                format_func=lambda x: vehicle_options[x]
            )
            
            expense_date = st.date_input(
                get_text('date', language),
                value=date.today()
            )
            
            category = st.selectbox(
                "Категория/Kategorie",
                options=['repair', 'maintenance', 'fuel', 'insurance', 'toll', 'car_wash', 'other'],
                format_func=lambda x: get_text(x, language)
            )
        
        with col2:
            amount = st.number_input(
                get_text('amount', language),
                min_value=0.01,
                step=0.01,
                format="%.2f"
            )
            
            description = st.text_area(
                get_text('description', language),
                placeholder="Описание расхода... / Ausgabenbeschreibung..."
            )
            
            uploaded_file = st.file_uploader(
                "Документ/Dokument",
                type=['pdf', 'jpg', 'jpeg', 'png'],
                help="Квитанция, счет или фото / Beleg, Rechnung oder Foto"
            )
        
        if st.button(get_text('add', language), type="primary"):
            if selected_vehicle and amount > 0:
                try:
                    file_url = None
                    if uploaded_file:
                        # Save file
                        import os
                        upload_dir = "uploads"
                        os.makedirs(upload_dir, exist_ok=True)
                        
                        file_path = os.path.join(upload_dir, f"expense_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uploaded_file.name}")
                        with open(file_path, "wb") as f:
                            f.write(uploaded_file.getbuffer())
                        file_url = file_path
                    
                    # Insert expense
                    result = execute_query("""
                        INSERT INTO car_expenses (vehicle_id, date, category, amount, description, file_url)
                        VALUES (:vehicle_id, :date, :category, :amount, :description, :file_url)
                    """, {
                        'vehicle_id': selected_vehicle,
                        'date': expense_date,
                        'category': category,
                        'amount': amount,
                        'description': description,
                        'file_url': file_url
                    })
                    
                    if result:
                        st.success(get_text('success', language))
                        st.rerun()
                    else:
                        st.error(get_text('error', language))
                        
                except Exception as e:
                    st.error(f"Error adding expense: {str(e)}")
            else:
                st.warning("Заполните обязательные поля / Füllen Sie die Pflichtfelder aus")
                
    except Exception as e:
        st.error(f"Error loading form: {str(e)}")

def show_edit_expense_form(expense, language='ru'):
    """Show form to edit existing expense"""
    st.write("### Редактировать/Bearbeiten")
    
    col1, col2, col3 = st.columns([1, 1, 1])
    
    with col1:
        new_amount = st.number_input(
            get_text('amount', language),
            value=float(expense[5]),
            min_value=0.01,
            step=0.01,
            key=f"edit_amount_{expense[0]}"
        )
    
    with col2:
        new_description = st.text_input(
            get_text('description', language),
            value=expense[6] or "",
            key=f"edit_desc_{expense[0]}"
        )
    
    with col3:
        col_save, col_cancel = st.columns(2)
        
        with col_save:
            if st.button("💾", key=f"save_{expense[0]}"):
                try:
                    result = execute_query("""
                        UPDATE car_expenses 
                        SET amount = :amount, description = :description
                        WHERE id = :id
                    """, {
                        'amount': new_amount,
                        'description': new_description,
                        'id': expense[0]
                    })
                    
                    if result:
                        st.success(get_text('success', language))
                        if f'edit_expense_{expense[0]}' in st.session_state:
                            del st.session_state[f'edit_expense_{expense[0]}']
                        st.rerun()
                    else:
                        st.error(get_text('error', language))
                        
                except Exception as e:
                    st.error(f"Error updating expense: {str(e)}")
        
        with col_cancel:
            if st.button("❌", key=f"cancel_{expense[0]}"):
                if f'edit_expense_{expense[0]}' in st.session_state:
                    del st.session_state[f'edit_expense_{expense[0]}']
                st.rerun()

def show_expenses_analytics(language='ru'):
    """Show expenses analytics"""
    st.subheader("Аналитика расходов / Ausgabenanalyse")
    
    try:
        # Monthly expenses chart
        monthly_data = execute_query("""
            SELECT 
                DATE_TRUNC('month', date) as month,
                SUM(amount) as total_amount
            FROM car_expenses
            WHERE date >= :six_months_ago
            GROUP BY DATE_TRUNC('month', date)
            ORDER BY month
        """, {'six_months_ago': (datetime.now() - timedelta(days=180)).date()}) or []
        
        if monthly_data and len(monthly_data) > 0:
            df_monthly = pd.DataFrame(list(monthly_data), columns=['Month', 'Amount'])
            df_monthly['Month'] = pd.to_datetime(df_monthly['Month'])
            df_monthly['Month_Str'] = df_monthly['Month'].dt.strftime('%Y-%m')
            
            fig_monthly = px.bar(
                df_monthly,
                x='Month_Str',
                y='Amount',
                title='Ежемесячные расходы / Monatliche Ausgaben'
            )
            st.plotly_chart(fig_monthly, use_container_width=True)
        
        # Category breakdown
        category_data = execute_query("""
            SELECT category, SUM(amount) as total_amount
            FROM car_expenses
            GROUP BY category
            ORDER BY total_amount DESC
        """) or []
        
        if category_data and len(category_data) > 0:
            df_category = pd.DataFrame(list(category_data), columns=['Category', 'Amount'])
            df_category['Category_Translated'] = df_category['Category'].apply(
                lambda x: get_text(x, language)
            )
            
            fig_category = px.pie(
                df_category,
                values='Amount',
                names='Category_Translated',
                title='Расходы по категориям / Ausgaben nach Kategorien'
            )
            st.plotly_chart(fig_category, use_container_width=True)
        
        # Vehicle expenses comparison
        vehicle_data = execute_query("""
            SELECT 
                v.name,
                v.license_plate,
                SUM(ce.amount) as total_amount,
                COUNT(ce.id) as expense_count
            FROM vehicles v
            LEFT JOIN car_expenses ce ON v.id = ce.vehicle_id
            GROUP BY v.id, v.name, v.license_plate
            ORDER BY total_amount DESC NULLS LAST
        """) or []
        
        if vehicle_data and len(vehicle_data) > 0:
            df_vehicles = pd.DataFrame(list(vehicle_data), columns=[
                'Автомобиль/Fahrzeug',
                'Номер/Nummer', 
                'Общие расходы/Gesamtausgaben',
                'Количество/Anzahl'
            ])
            
            # Format currency column
            df_vehicles['Общие расходы/Gesamtausgaben'] = df_vehicles['Общие расходы/Gesamtausgaben'].apply(
                lambda x: format_currency(x if x else 0)
            )
            
            st.subheader("Расходы по автомобилям / Ausgaben nach Fahrzeugen")
            st.dataframe(df_vehicles, use_container_width=True)
        
    except Exception as e:
        st.error(f"Error loading analytics: {str(e)}")

def export_expenses_data(language='ru'):
    """Export expenses data to CSV"""
    try:
        expenses_data = execute_query("""
            SELECT 
                ce.date,
                v.name as vehicle_name,
                v.license_plate,
                ce.category,
                ce.amount,
                ce.description
            FROM car_expenses ce
            JOIN vehicles v ON ce.vehicle_id = v.id
            ORDER BY ce.date DESC
        """) or []
        
        if expenses_data:
            df = pd.DataFrame(list(expenses_data), columns=[
                'Дата/Datum',
                'Автомобиль/Fahrzeug',
                'Номер/Nummer',
                'Категория/Kategorie',
                'Сумма/Betrag',
                'Описание/Beschreibung'
            ])
            
            export_to_csv(df, f"car_expenses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            st.success("Данные экспортированы / Daten exportiert")
        else:
            st.warning("Нет данных для экспорта / Keine Daten zum Exportieren")
            
    except Exception as e:
        st.error(f"Error exporting data: {str(e)}")