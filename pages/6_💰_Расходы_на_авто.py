import streamlit as st
import uuid
from datetime import date
from database import execute_query
from translations import get_text
from utils import format_currency, upload_file

# Page config
st.set_page_config(
    page_title="Расходы на авто",
    page_icon="🚗💰",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

@st.cache_data(ttl=300)
def get_car_expenses_cached():
    """Get car expenses with caching"""
    return execute_query("""
        SELECT 
            ce.id,
            ce.date,
            v.name as vehicle_name,
            ce.category,
            ce.amount,
            ce.description,
            ce.receipt_url,
            ce.maintenance_id
        FROM car_expenses ce
        JOIN vehicles v ON ce.vehicle_id = v.id
        ORDER BY ce.date DESC
        LIMIT 100
    """)

def show_expenses_list():
    """Show list of car expenses with inline editing"""
    try:
        # Check if we're editing an expense
        edit_expense_id = st.session_state.get('edit_expense_id', None)
        
        if edit_expense_id:
            show_edit_expense_form(edit_expense_id)
            return
        
        expenses = get_car_expenses_cached()
        
        if expenses:
            # Statistics
            total_amount = sum(float(e[4]) if e[4] is not None else 0 for e in expenses)
            
            st.metric("Общие расходы/Gesamtausgaben", format_currency(total_amount))
            st.divider()
            
            # Display expenses
            for expense in expenses:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{expense[2]}**")
                        expense_date = expense[1].strftime('%d.%m.%Y') if expense[1] else ''
                        st.write(f"📅 {expense_date}")
                        if expense[5]:
                            st.write(f"📝 {expense[5]}")
                    
                    with col2:
                        st.write(f"📁 {get_text(expense[3], language)}")
                        st.write(f"💰 {format_currency(expense[4])}")
                    
                    with col3:
                        if expense[6]:
                            st.write("📎 Файл есть/Datei vorhanden")
                        if expense[7]:
                            st.write("🔧 От ТО/Von Wartung")
                    
                    with col4:
                        col_edit, col_delete = st.columns(2)
                        
                        if not expense[7]:  # Can only edit/delete if not from maintenance
                            with col_edit:
                                if st.button("✏️", key=f"edit_expense_{expense[0]}", help="Редактировать"):
                                    st.session_state.edit_expense_id = expense[0]
                                    st.rerun()
                            with col_delete:
                                if st.button("🗑️", key=f"delete_expense_{expense[0]}", help="Удалить"):
                                    delete_expense(expense[0])
                        else:
                            st.caption("🔒 Связан с ТО")
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading expenses: {str(e)}")

def show_add_expense_form():
    """Show form to add new car expense"""
    with st.form("add_car_expense"):
        col1, col2 = st.columns(2)
        
        with col1:
            # Vehicle selection
            vehicles = execute_query("SELECT id, name, license_plate FROM vehicles ORDER BY name")
            if not vehicles:
                st.warning("Необходимо создать автомобили")
                return
            
            vehicle_id = st.selectbox(
                get_text('vehicles', language),
                options=[v[0] for v in vehicles],
                format_func=lambda x: next((f"{v[1]} ({v[2]})" for v in vehicles if v[0] == x), x)
            )
            
            category = st.selectbox(
                "Категория/Kategorie",
                options=['repair', 'maintenance', 'fuel', 'insurance', 'toll', 'car_wash', 'other'],
                format_func=lambda x: get_text(x, language)
            )
        
        with col2:
            expense_date = st.date_input(
                "Дата/Datum",
                value=date.today()
            )
            
            amount = st.number_input(
                "Сумма/Betrag (€)",
                min_value=0.0,
                step=10.0,
                value=0.0
            )
            
            # File upload
            uploaded_file = st.file_uploader(
                "Чек/документ / Beleg/Dokument",
                type=['pdf', 'jpg', 'jpeg', 'png']
            )
        
        description = st.text_area(
            "Описание/Beschreibung"
        )
        
        if st.form_submit_button(get_text('save', language)):
            if amount > 0:
                try:
                    file_url = None
                    if uploaded_file:
                        file_url = upload_file(uploaded_file, 'expenses')
                    
                    expense_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO car_expenses 
                        (id, car_id, category, amount, date, description, file_url)
                        VALUES (:id, :car_id, :category, :amount, :date, :description, :file_url)
                    """, {
                        'id': expense_id,
                        'car_id': vehicle_id,
                        'category': category,
                        'amount': amount,
                        'date': expense_date,
                        'description': description if description else None,
                        'file_url': file_url
                    })
                    st.success(get_text('success_save', language))
                    get_car_expenses_cached.clear()  # Clear cache
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
            else:
                st.error("Сумма должна быть больше 0")

def show_edit_expense_form(expense_id):
    """Show form to edit existing car expense"""
    try:
        # Get current expense data
        expense_data = execute_query("""
            SELECT ce.car_id, ce.date, ce.category, ce.amount, ce.description, ce.file_url,
                   v.name as vehicle_name
            FROM car_expenses ce
            JOIN vehicles v ON ce.car_id = v.id
            WHERE ce.id = :id
        """, {'id': expense_id})
        
        if not expense_data:
            st.error("Расход не найден")
            if st.button("⬅️ Назад к списку"):
                del st.session_state.edit_expense_id
                st.rerun()
            return
        
        current_expense = expense_data[0]
        
        st.subheader("✏️ Редактировать расход / Ausgabe bearbeiten")
        
        if st.button("⬅️ Назад к списку / Zurück zur Liste"):
            del st.session_state.edit_expense_id
            st.rerun()
        
        with st.form("edit_expense"):
            col1, col2 = st.columns(2)
            
            with col1:
                # Vehicle selection
                vehicles = execute_query("SELECT id, name, license_plate FROM vehicles ORDER BY name")
                if not vehicles:
                    st.warning("Необходимо создать автомобили")
                    return
                
                current_vehicle_index = 0
                try:
                    current_vehicle_index = [v[0] for v in vehicles].index(current_expense[0])
                except ValueError:
                    current_vehicle_index = 0
                
                vehicle_id = st.selectbox(
                    get_text('vehicles', language),
                    options=[v[0] for v in vehicles],
                    format_func=lambda x: next((f"{v[1]} ({v[2]})" for v in vehicles if v[0] == x), x),
                    index=current_vehicle_index
                )
                
                category_options = ['repair', 'maintenance', 'fuel', 'insurance', 'toll', 'car_wash', 'other']
                current_category_index = 0
                if current_expense[2] in category_options:
                    current_category_index = category_options.index(current_expense[2])
                
                category = st.selectbox(
                    "Категория/Kategorie",
                    options=category_options,
                    index=current_category_index,
                    format_func=lambda x: get_text(x, language)
                )
            
            with col2:
                expense_date = st.date_input(
                    "Дата/Datum",
                    value=current_expense[1] if current_expense[1] else date.today()
                )
                
                amount = st.number_input(
                    "Сумма/Betrag (€)",
                    min_value=0.0,
                    step=10.0,
                    value=float(current_expense[3]) if current_expense[3] else 0.0
                )
                
                # File upload
                if current_expense[5]:
                    st.info(f"Текущий файл: {current_expense[5].split('/')[-1]}")
                
                uploaded_file = st.file_uploader(
                    "Новый чек/документ / Neuer Beleg",
                    type=['pdf', 'jpg', 'jpeg', 'png']
                )
            
            description = st.text_area(
                "Описание/Beschreibung",
                value=current_expense[4] or ""
            )
            
            col_save, col_cancel = st.columns(2)
            with col_save:
                if st.form_submit_button("💾 Сохранить / Speichern", type="primary"):
                    if amount > 0:
                        try:
                            file_url = current_expense[5]  # Keep existing file
                            if uploaded_file:
                                file_url = upload_file(uploaded_file, 'expenses')
                            
                            execute_query("""
                                UPDATE car_expenses 
                                SET car_id = :car_id, date = :date, category = :category, 
                                    amount = :amount, description = :description, file_url = :file_url
                                WHERE id = :id
                            """, {
                                'id': expense_id,
                                'car_id': vehicle_id,
                                'date': expense_date,
                                'category': category,
                                'amount': amount,
                                'description': description if description else None,
                                'file_url': file_url
                            })
                            st.success("Расход обновлен / Ausgabe aktualisiert")
                            get_car_expenses_cached.clear()  # Clear cache
                            del st.session_state.edit_expense_id
                            st.rerun()
                        except Exception as e:
                            st.error(f"Ошибка обновления: {str(e)}")
                    else:
                        st.error("Сумма должна быть больше 0")
            
            with col_cancel:
                if st.form_submit_button("❌ Отмена / Abbrechen"):
                    del st.session_state.edit_expense_id
                    st.rerun()
                    
    except Exception as e:
        st.error(f"Ошибка загрузки данных: {str(e)}")
        if st.button("⬅️ Назад к списку"):
            if 'edit_expense_id' in st.session_state:
                del st.session_state.edit_expense_id
            st.rerun()

def delete_expense(expense_id):
    """Delete expense"""
    try:
        execute_query("DELETE FROM car_expenses WHERE id = :id", {'id': expense_id})
        st.success(get_text('success_delete', language))
        get_car_expenses_cached.clear()  # Clear cache
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Main page
st.title(f"🚗💰 {get_text('car_expenses', language)}")

tab1, tab2 = st.tabs([
    "Расходы/Ausgaben",
    get_text('add', language)
])

with tab1:
    show_expenses_list()

with tab2:
    show_add_expense_form()