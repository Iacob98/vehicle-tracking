import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, format_currency, upload_file
from datetime import datetime, date, timedelta
import uuid

def show_page(language='ru'):
    """Show car expenses management page"""
    st.title(f"🚗 Расходы на автомобили/Fahrzeugausgaben")
    
    # Tabs for different views
    tab1, tab2, tab3 = st.tabs([
        "Расходы/Ausgaben",
        "Добавить/Hinzufügen",
        "Аналитика/Analytics"
    ])
    
    with tab1:
        show_car_expenses_list(language)
    
    with tab2:
        show_add_car_expense_form(language)
    
    with tab3:
        show_car_expenses_analytics(language)

def get_car_expense_categories(language='ru'):
    """Get car expense categories with translations"""
    if language == 'de':
        return {
            'repair': 'Reparatur',
            'maintenance': 'Wartung',
            'fuel': 'Kraftstoff',
            'insurance': 'Versicherung',
            'toll': 'Maut',
            'car_wash': 'Autowäsche',
            'other': 'Sonstiges'
        }
    else:  # Russian
        return {
            'repair': 'Ремонт',
            'maintenance': 'Техобслуживание',
            'fuel': 'Топливо',
            'insurance': 'Страховка',
            'toll': 'Платные дороги',
            'car_wash': 'Мойка',
            'other': 'Прочее'
        }

def show_car_expenses_list(language='ru'):
    """Show list of car expenses"""
    try:
        # Filters
        col1, col2, col3, col4 = st.columns([2, 2, 1, 1])
        
        with col1:
            search_term = st.text_input(
                "Поиск/Suche",
                placeholder="Автомобиль, описание..."
            )
        
        with col2:
            # Vehicle filter
            vehicles = execute_query("SELECT id, name FROM vehicles ORDER BY name")
            vehicle_options = ['all'] + [v[0] for v in vehicles] if vehicles else ['all']
            vehicle_filter = st.selectbox(
                "Автомобиль/Fahrzeug",
                options=vehicle_options,
                format_func=lambda x: 'Все/Alle' if x == 'all' else next((v[1] for v in vehicles if v[0] == x), x) if vehicles else x
            )
        
        with col3:
            # Category filter
            categories = get_car_expense_categories(language)
            category_options = ['all'] + list(categories.keys())
            category_filter = st.selectbox(
                "Категория/Kategorie",
                options=category_options,
                format_func=lambda x: 'Все/Alle' if x == 'all' else categories.get(x, x)
            )
        
        with col4:
            st.write("")  # Spacing
            if st.button("📥 Экспорт/Export"):
                export_car_expenses_data(language)
        
        # Date filter
        col_date1, col_date2 = st.columns(2)
        with col_date1:
            date_from = st.date_input(
                "С даты/Von Datum",
                value=date.today() - timedelta(days=30)
            )
        with col_date2:
            date_to = st.date_input(
                "До даты/Bis Datum",
                value=date.today()
            )
        
        # Build query with filters
        query = """
            SELECT 
                ce.id,
                ce.date,
                ce.category,
                ce.amount,
                ce.description,
                ce.file_url,
                v.name as vehicle_name,
                u.first_name || ' ' || u.last_name as created_by_name,
                ce.created_at
            FROM car_expenses ce
            JOIN vehicles v ON ce.car_id = v.id
            LEFT JOIN users u ON ce.created_by = u.id
            WHERE ce.date BETWEEN :date_from AND :date_to
        """
        params = {
            'date_from': date_from,
            'date_to': date_to
        }
        
        if search_term:
            query += """ AND (
                v.name ILIKE :search OR 
                ce.description ILIKE :search
            )"""
            params['search'] = f"%{search_term}%"
        
        if vehicle_filter != 'all':
            query += " AND ce.car_id = :vehicle_id"
            params['vehicle_id'] = vehicle_filter
        
        if category_filter != 'all':
            query += " AND ce.category = :category"
            params['category'] = category_filter
        
        query += " ORDER BY ce.date DESC, ce.created_at DESC"
        
        expenses = execute_query(query, params)
        
        if expenses and isinstance(expenses, list) and len(expenses) > 0:
            # Show summary
            total_amount = sum(float(exp[3]) for exp in expenses)
            st.info(f"**Найдено расходов: {len(expenses)} | Общая сумма: {format_currency(total_amount)}**")
            
            # Display expenses
            for exp in expenses:
                with st.container():
                    col1, col2, col3, col4 = st.columns([2, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**🚗 {exp[6]}**")  # vehicle_name
                        categories = get_car_expense_categories(language)
                        st.write(f"📋 {categories.get(exp[2], exp[2])}")  # category
                        st.write(f"📅 {exp[1].strftime('%d.%m.%Y')}")  # date
                    
                    with col2:
                        st.write(f"**💰 {format_currency(exp[3])}**")  # amount
                        if exp[4]:  # description
                            st.write(f"📝 {exp[4]}")
                        if exp[7]:  # created_by_name
                            st.write(f"👤 {exp[7]}")
                    
                    with col3:
                        if exp[5]:  # file_url
                            file_name = exp[5].split('/')[-1]
                            file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
                            
                            if file_ext in ['jpg', 'jpeg', 'png', 'gif']:
                                st.write("🖼️ Изображение/Bild")
                            elif file_ext == 'pdf':
                                st.write("📄 PDF документ")
                            else:
                                st.write("📎 Файл прикреплен")
                            
                            st.caption(f"📁 {file_name}")
                        
                        st.caption(f"Создано/Erstellt: {exp[8].strftime('%d.%m.%Y %H:%M')}")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_car_exp_{exp[0]}"):
                            st.session_state[f"edit_car_exp_{exp[0]}"] = True
                        if st.button(f"🗑️", key=f"delete_car_exp_{exp[0]}"):
                            delete_car_expense(exp[0], language)
                        if exp[5] and st.button(f"📎", key=f"view_car_exp_{exp[0]}"):
                            st.session_state[f"view_car_file_{exp[0]}"] = {
                                'url': exp[5],
                                'title': f"{exp[6]} - {categories.get(exp[2], exp[2])}",
                                'language': language
                            }
                    
                    # Show edit form if requested
                    if st.session_state.get(f"edit_car_exp_{exp[0]}", False):
                        show_edit_car_expense_form(exp, language)
                    
                    st.divider()
        else:
            st.info("Расходы не найдены/Keine Ausgaben gefunden")
    
    except Exception as e:
        st.error(f"Ошибка загрузки расходов/Fehler beim Laden der Ausgaben: {str(e)}")

def show_add_car_expense_form(language='ru'):
    """Show form to add new car expense"""
    st.subheader("Добавить расход на автомобиль/Fahrzeugausgabe hinzufügen")
    
    with st.form("add_car_expense_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            # Vehicle selection
            vehicles = execute_query("SELECT id, name FROM vehicles ORDER BY name")
            if not vehicles or not isinstance(vehicles, list) or len(vehicles) == 0:
                st.warning("Необходимо создать автомобили / Fahrzeuge müssen erstellt werden")
                return
            
            car_id = st.selectbox(
                "Автомобиль/Fahrzeug",
                options=[v[0] for v in vehicles],
                format_func=lambda x: next((v[1] for v in vehicles if v[0] == x), x),
                key="new_car_exp_vehicle"
            )
            
            # Category
            categories = get_car_expense_categories(language)
            category = st.selectbox(
                "Категория/Kategorie",
                options=list(categories.keys()),
                format_func=lambda x: categories[x],
                key="new_car_exp_category"
            )
            
            # Date
            expense_date = st.date_input(
                "Дата расхода/Datum der Ausgabe",
                value=date.today(),
                key="new_car_exp_date"
            )
        
        with col2:
            # Amount
            amount = st.number_input(
                "Сумма (€)/Betrag (€)",
                min_value=0.01,
                value=0.01,
                step=0.01,
                key="new_car_exp_amount"
            )
            
            # Description
            description = st.text_area(
                "Описание/Beschreibung",
                placeholder="Замена тормозных колодок/Bremsbeläge wechseln...",
                key="new_car_exp_description"
            )
            
            # File upload
            uploaded_file = st.file_uploader(
                "Чек/счет/Rechnung",
                type=['pdf', 'jpg', 'jpeg', 'png'],
                key="new_car_exp_file"
            )
        
        # Submit button
        submitted = st.form_submit_button("💾 Сохранить/Speichern")
        
        if submitted:
            if car_id and category and amount > 0:
                try:
                    file_url = None
                    if uploaded_file:
                        file_url = upload_file(uploaded_file, 'car_expenses')
                    
                    # Get current user ID
                    current_user = execute_query("SELECT id FROM users LIMIT 1")
                    created_by = current_user[0][0] if current_user else None
                    
                    execute_query("""
                        INSERT INTO car_expenses 
                        (car_id, date, category, amount, description, file_url, created_by)
                        VALUES (:car_id, :date, :category, :amount, :description, :file_url, :created_by)
                    """, {
                        'car_id': car_id,
                        'date': expense_date,
                        'category': category,
                        'amount': amount,
                        'description': description if description else None,
                        'file_url': file_url,
                        'created_by': created_by
                    })
                    
                    st.success("Расход успешно добавлен/Ausgabe erfolgreich hinzugefügt")
                    st.rerun()
                except Exception as e:
                    st.error(f"Ошибка сохранения/Speicherfehler: {str(e)}")
            else:
                st.error("Заполните обязательные поля/Füllen Sie die Pflichtfelder aus")

def show_edit_car_expense_form(exp, language='ru'):
    """Show form to edit car expense"""
    st.subheader(f"✏️ Редактировать расход")
    
    with st.form(f"edit_car_expense_form_{exp[0]}"):
        col1, col2 = st.columns(2)
        
        with col1:
            # Vehicle selection
            vehicles = execute_query("SELECT id, name FROM vehicles ORDER BY name")
            if not vehicles:
                st.warning("Автомобили не найдены")
                return
            
            # Find current vehicle
            current_vehicle_index = 0
            for i, vehicle in enumerate(vehicles):
                if exp[6].strip() == vehicle[1].strip():
                    current_vehicle_index = i
                    break
            
            car_id = st.selectbox(
                "Автомобиль/Fahrzeug",
                options=[v[0] for v in vehicles],
                format_func=lambda x: next((v[1] for v in vehicles if v[0] == x), x),
                index=current_vehicle_index,
                key=f"edit_car_exp_vehicle_{exp[0]}"
            )
            
            # Category
            categories = get_car_expense_categories(language)
            category_index = list(categories.keys()).index(exp[2]) if exp[2] in categories else 0
            category = st.selectbox(
                "Категория/Kategorie",
                options=list(categories.keys()),
                format_func=lambda x: categories[x],
                index=category_index,
                key=f"edit_car_exp_category_{exp[0]}"
            )
            
            # Date
            expense_date = st.date_input(
                "Дата расхода/Datum",
                value=exp[1] if exp[1] else date.today(),
                key=f"edit_car_exp_date_{exp[0]}"
            )
        
        with col2:
            # Amount
            amount = st.number_input(
                "Сумма (€)/Betrag (€)",
                min_value=0.01,
                value=float(exp[3]) if exp[3] else 0.01,
                step=0.01,
                key=f"edit_car_exp_amount_{exp[0]}"
            )
            
            # Description
            description = st.text_area(
                "Описание/Beschreibung",
                value=exp[4] or '',
                key=f"edit_car_exp_description_{exp[0]}"
            )
            
            # Show current file
            if exp[5]:
                st.write(f"Текущий файл: {exp[5].split('/')[-1]}")
            
            # File upload
            uploaded_file = st.file_uploader(
                "Новый файл/Neue Datei",
                type=['pdf', 'jpg', 'jpeg', 'png'],
                key=f"edit_car_exp_file_{exp[0]}"
            )
        
        col_save, col_cancel = st.columns(2)
        
        with col_save:
            submitted = st.form_submit_button("💾 Сохранить/Speichern")
        
        with col_cancel:
            cancelled = st.form_submit_button("❌ Отмена/Abbrechen")
        
        if submitted:
            try:
                file_url = exp[5]  # Keep existing file URL
                if uploaded_file:
                    file_url = upload_file(uploaded_file, 'car_expenses')
                
                execute_query("""
                    UPDATE car_expenses 
                    SET car_id = :car_id, date = :date, category = :category, 
                        amount = :amount, description = :description, file_url = :file_url
                    WHERE id = :id
                """, {
                    'id': exp[0],
                    'car_id': car_id,
                    'date': expense_date,
                    'category': category,
                    'amount': amount,
                    'description': description if description else None,
                    'file_url': file_url
                })
                
                if f"edit_car_exp_{exp[0]}" in st.session_state:
                    del st.session_state[f"edit_car_exp_{exp[0]}"]
                st.success("Расход обновлен/Ausgabe aktualisiert")
                st.rerun()
            except Exception as e:
                st.error(f"Ошибка сохранения/Speicherfehler: {str(e)}")
        
        if cancelled:
            if f"edit_car_exp_{exp[0]}" in st.session_state:
                del st.session_state[f"edit_car_exp_{exp[0]}"]
            st.rerun()

def delete_car_expense(expense_id, language='ru'):
    """Delete car expense"""
    try:
        execute_query("DELETE FROM car_expenses WHERE id = :id", {'id': expense_id})
        st.success("Расход удален/Ausgabe gelöscht")
        st.rerun()
    except Exception as e:
        st.error(f"Ошибка удаления/Löschfehler: {str(e)}")

def show_car_expenses_analytics(language='ru'):
    """Show car expenses analytics"""
    st.subheader("📊 Аналитика расходов на автомобили/Fahrzeugausgaben-Analytics")
    
    try:
        # Date range selector
        col1, col2 = st.columns(2)
        with col1:
            date_from = st.date_input(
                "Период с/Periode von",
                value=date.today() - timedelta(days=90)
            )
        with col2:
            date_to = st.date_input(
                "Период до/Periode bis", 
                value=date.today()
            )
        
        # Get expenses for period
        expenses = execute_query("""
            SELECT 
                ce.car_id,
                v.name as vehicle_name,
                ce.category,
                SUM(ce.amount) as total_amount,
                COUNT(*) as expense_count
            FROM car_expenses ce
            JOIN vehicles v ON ce.car_id = v.id
            WHERE ce.date BETWEEN :date_from AND :date_to
            GROUP BY ce.car_id, v.name, ce.category
            ORDER BY v.name, ce.category
        """, {
            'date_from': date_from,
            'date_to': date_to
        })
        
        if expenses:
            # Summary metrics
            total_expenses = execute_query("""
                SELECT 
                    SUM(amount) as total,
                    COUNT(*) as count,
                    AVG(amount) as avg_amount
                FROM car_expenses 
                WHERE date BETWEEN :date_from AND :date_to
            """, {
                'date_from': date_from,
                'date_to': date_to
            })[0]
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Общие расходы/Gesamtausgaben", format_currency(total_expenses[0] or 0))
            with col2:
                st.metric("Количество записей/Anzahl", total_expenses[1] or 0)
            with col3:
                st.metric("Средний расход/Durchschnitt", format_currency(total_expenses[2] or 0))
            
            # Expenses by vehicle
            st.subheader("🚗 Расходы по автомобилям/Ausgaben nach Fahrzeugen")
            
            # Group by vehicle
            vehicle_totals = {}
            categories = get_car_expense_categories(language)
            
            for exp in expenses:
                vehicle = exp[1]
                if vehicle not in vehicle_totals:
                    vehicle_totals[vehicle] = {'total': 0, 'categories': {}}
                
                vehicle_totals[vehicle]['total'] += float(exp[3])
                category_name = categories.get(exp[2], exp[2])
                vehicle_totals[vehicle]['categories'][category_name] = vehicle_totals[vehicle]['categories'].get(category_name, 0) + float(exp[3])
            
            # Display vehicle breakdown
            for vehicle, data in vehicle_totals.items():
                with st.expander(f"🚗 {vehicle} - {format_currency(data['total'])}"):
                    for category, amount in data['categories'].items():
                        st.write(f"📋 {category}: {format_currency(amount)}")
        else:
            st.info("Нет данных для выбранного периода/Keine Daten für den gewählten Zeitraum")
    
    except Exception as e:
        st.error(f"Ошибка загрузки аналитики/Fehler beim Laden der Analytics: {str(e)}")

def export_car_expenses_data(language='ru'):
    """Export car expenses data to CSV"""
    try:
        query = """
            SELECT 
                v.name as vehicle_name,
                ce.date,
                ce.category,
                ce.amount,
                ce.description,
                u.first_name || ' ' || u.last_name as created_by,
                ce.created_at
            FROM car_expenses ce
            JOIN vehicles v ON ce.car_id = v.id
            LEFT JOIN users u ON ce.created_by = u.id
            ORDER BY ce.date DESC, ce.created_at DESC
        """
        
        expenses = execute_query(query)
        
        if expenses and isinstance(expenses, list) and len(expenses) > 0:
            categories = get_car_expense_categories(language)
            
            export_data = []
            for exp in expenses:
                export_data.append([
                    exp[0],  # vehicle_name
                    exp[1].strftime('%d.%m.%Y') if exp[1] else '',  # date
                    categories.get(exp[2], exp[2]),  # category
                    exp[3],  # amount
                    exp[4] or '',  # description
                    exp[5] or '',  # created_by
                    exp[6].strftime('%d.%m.%Y %H:%M') if exp[6] else ''  # created_at
                ])
            
            # Create DataFrame
            df = pd.DataFrame(export_data, columns=[
                'Автомобиль/Fahrzeug',
                'Дата/Datum',
                'Категория/Kategorie',
                'Сумма (€)/Betrag (€)',
                'Описание/Beschreibung',
                'Создал/Erstellt von',
                'Дата создания/Erstelldatum'
            ])
            
            # Export to CSV
            csv_data = export_to_csv(df, f"car_expenses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            
            st.download_button(
                label="📥 Скачать CSV/CSV herunterladen",
                data=csv_data,
                file_name=f"car_expenses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )
            
            st.success(f"Экспортировано {len(expenses)} записей/Exportiert {len(expenses)} Einträge")
        else:
            st.warning("Нет данных для экспорта/Keine Daten zum Exportieren")
    
    except Exception as e:
        st.error(f"Ошибка экспорта/Export-Fehler: {str(e)}")