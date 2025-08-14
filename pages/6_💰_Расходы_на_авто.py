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
            ce.file_url,
            ce.maintenance_id
        FROM car_expenses ce
        JOIN vehicles v ON ce.car_id = v.id
        ORDER BY ce.date DESC
        LIMIT 100
    """)

def show_expenses_list():
    """Show list of car expenses"""
    try:
        expenses = get_car_expenses_cached()
        
        if expenses:
            # Statistics
            total_amount = sum(float(e[4]) for e in expenses)
            
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
                        if not expense[7]:  # Can only delete if not from maintenance
                            if st.button(f"🗑️", key=f"delete_expense_{expense[0]}"):
                                delete_expense(expense[0])
                    
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