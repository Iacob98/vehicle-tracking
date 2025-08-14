import streamlit as st
import uuid
from datetime import date
from database import execute_query
from translations import get_text
from utils import format_currency, upload_file

# Page config
st.set_page_config(
    page_title="Штрафы",
    page_icon="🚧",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

@st.cache_data(ttl=300)
def get_penalties_cached():
    """Get penalties with caching"""
    return execute_query("""
        SELECT 
            p.id,
            p.date,
            v.name as vehicle_name,
            v.license_plate,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            p.amount,
            p.status,
            p.photo_url
        FROM penalties p
        LEFT JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE (p.description IS NULL OR p.description NOT LIKE '%Поломка материала%')
        ORDER BY p.date DESC
    """)

def show_penalties_list():
    """Show list of penalties"""
    try:
        penalties = get_penalties_cached()
        
        if penalties:
            # Summary statistics
            total_amount = sum(float(penalty[5]) for penalty in penalties)
            open_amount = sum(float(penalty[5]) for penalty in penalties if penalty[6] == 'open')
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Всего штрафов/Strafen insgesamt", len(penalties))
            with col2:
                st.metric("Общая сумма/Gesamtbetrag", format_currency(total_amount))
            with col3:
                st.metric("К оплате/Zu zahlen", format_currency(open_amount))
            
            st.divider()
            
            # Display penalties
            for penalty in penalties:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{penalty[2]}** ({penalty[3]})")
                        if penalty[4]:
                            st.write(f"👤 {penalty[4]}")
                        penalty_date = penalty[1].strftime('%d.%m.%Y') if penalty[1] else ''
                        st.write(f"📅 {penalty_date}")
                    
                    with col2:
                        st.write(f"💰 {format_currency(penalty[5])}")
                        status_icon = '🔴' if penalty[6] == 'open' else '🟢'
                        st.write(f"{status_icon} {get_text(penalty[6], language)}")
                    
                    with col3:
                        if penalty[7]:  # photo_url
                            st.write("📷 Фото есть/Foto vorhanden")
                        else:
                            st.write("📷 Нет фото/Kein Foto")
                    
                    with col4:
                        if penalty[6] == 'open':
                            if st.button(f"✅", key=f"pay_{penalty[0]}"):
                                mark_penalty_paid(penalty[0])
                        if st.button(f"🗑️", key=f"delete_{penalty[0]}"):
                            delete_penalty(penalty[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading penalties: {str(e)}")

def show_add_penalty_form():
    """Show form to add new penalty"""
    with st.form("add_penalty"):
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
            
            # User selection
            users = execute_query("SELECT id, first_name || ' ' || last_name as full_name FROM users ORDER BY first_name")
            user_id = None
            if users:
                user_id = st.selectbox(
                    "Пользователь/Benutzer",
                    options=[None] + [u[0] for u in users],
                    format_func=lambda x: "Не указан" if x is None else next((u[1] for u in users if u[0] == x), x)
                )
        
        with col2:
            penalty_date = st.date_input(
                "Дата/Datum",
                value=date.today()
            )
            
            amount = st.number_input(
                "Сумма/Betrag (€)",
                min_value=0.0,
                step=10.0,
                value=100.0
            )
            
            # File upload
            uploaded_file = st.file_uploader(
                "Фото/Foto",
                type=['jpg', 'jpeg', 'png']
            )
        
        description = st.text_area(
            "Описание/Beschreibung"
        )
        
        if st.form_submit_button(get_text('save', language)):
            try:
                photo_url = None
                if uploaded_file:
                    photo_url = upload_file(uploaded_file, 'penalties')
                
                penalty_id = str(uuid.uuid4())
                execute_query("""
                    INSERT INTO penalties 
                    (id, vehicle_id, user_id, amount, date, status, description, photo_url)
                    VALUES (:id, :vehicle_id, :user_id, :amount, :date, 'open', :description, :photo_url)
                """, {
                    'id': penalty_id,
                    'vehicle_id': vehicle_id,
                    'user_id': user_id,
                    'amount': amount,
                    'date': penalty_date,
                    'description': description if description else None,
                    'photo_url': photo_url
                })
                st.success(get_text('success_save', language))
                get_penalties_cached.clear()  # Clear cache
                st.rerun()
            except Exception as e:
                st.error(f"Error: {str(e)}")

def mark_penalty_paid(penalty_id):
    """Mark penalty as paid"""
    try:
        execute_query("UPDATE penalties SET status = 'paid' WHERE id = :id", {'id': penalty_id})
        st.success("Штраф оплачен / Strafe bezahlt")
        get_penalties_cached.clear()  # Clear cache
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

def delete_penalty(penalty_id):
    """Delete penalty"""
    try:
        execute_query("DELETE FROM penalties WHERE id = :id", {'id': penalty_id})
        st.success(get_text('success_delete', language))
        get_penalties_cached.clear()  # Clear cache
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Main page
st.title(f"🚧 {get_text('penalties', language)}")

tab1, tab2 = st.tabs([
    get_text('penalties', language),
    get_text('add', language)
])

with tab1:
    show_penalties_list()

with tab2:
    show_add_penalty_form()