import streamlit as st
import uuid
from datetime import date, timedelta
from database import execute_query
from translations import get_text
from utils import upload_file

# Page config
st.set_page_config(
    page_title="Документы",
    page_icon="📄",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

@st.cache_data(ttl=300)
def get_documents_cached():
    """Get vehicle documents with caching"""
    return execute_query("""
        SELECT 
            vd.id,
            vd.document_type,
            vd.title,
            vd.date_issued,
            vd.date_expiry,
            vd.file_url,
            v.name as vehicle_name,
            v.license_plate,
            CASE 
                WHEN vd.date_expiry IS NOT NULL AND vd.date_expiry < CURRENT_DATE THEN 'expired'
                WHEN vd.date_expiry IS NOT NULL AND vd.date_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
                ELSE 'valid'
            END as status
        FROM vehicle_documents vd
        JOIN vehicles v ON vd.vehicle_id = v.id
        WHERE vd.is_active = true
        ORDER BY vd.date_expiry ASC NULLS LAST
        LIMIT 100
    """)

def get_document_types():
    """Get document type translations"""
    return {
        'insurance': 'Страховка / Versicherung',
        'inspection': 'Техосмотр / TÜV',
        'registration': 'Свидетельство о регистрации / Zulassungsbescheinigung',
        'other': 'Другое / Sonstiges'
    }

def show_documents_list():
    """Show list of documents"""
    try:
        documents = get_documents_cached()
        
        if documents:
            # Statistics
            total_docs = len(documents)
            expired = len([d for d in documents if d[8] == 'expired'])
            expiring = len([d for d in documents if d[8] == 'expiring'])
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Всего документов/Dokumente gesamt", total_docs)
            with col2:
                st.metric("🔴 Просрочены/Abgelaufen", expired)
            with col3:
                st.metric("⚠️ Истекают/Laufen ab", expiring)
            
            st.divider()
            
            # Display documents
            for doc in documents:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        # Status icon based on expiry
                        status_icon = '🔴' if doc[8] == 'expired' else '⚠️' if doc[8] == 'expiring' else '✅'
                        st.write(f"{status_icon} **{doc[2]}**")
                        
                        doc_types = get_document_types()
                        st.write(f"📁 {doc_types.get(doc[1], doc[1])}")
                        st.write(f"🚗 {doc[6]} ({doc[7]})")
                    
                    with col2:
                        issued_date = doc[3].strftime('%d.%m.%Y') if doc[3] else ''
                        st.write(f"Выдан/Ausgestellt: {issued_date}")
                        if doc[4]:
                            expiry_date = doc[4].strftime('%d.%m.%Y')
                            st.write(f"Действует до/Gültig bis: {expiry_date}")
                    
                    with col3:
                        if doc[5]:
                            st.write("📎 Файл есть/Datei vorhanden")
                        else:
                            st.write("📎 Нет файла/Keine Datei")
                    
                    with col4:
                        if st.button(f"🗑️", key=f"delete_doc_{doc[0]}"):
                            delete_document(doc[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading documents: {str(e)}")

def show_add_document_form():
    """Show form to add new document"""
    with st.form("add_document"):
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
            
            doc_types = get_document_types()
            document_type = st.selectbox(
                "Тип документа/Dokumenttyp",
                options=list(doc_types.keys()),
                format_func=lambda x: doc_types[x]
            )
            
            title = st.text_input(
                "Название/Titel",
                value=doc_types.get(document_type, '').split('/')[0].strip()
            )
        
        with col2:
            date_issued = st.date_input(
                "Дата выдачи/Ausstellungsdatum",
                value=date.today()
            )
            
            has_expiry = st.checkbox("Есть срок действия/Hat Ablaufdatum")
            date_expiry = None
            if has_expiry:
                date_expiry = st.date_input(
                    "Действует до/Gültig bis",
                    value=date.today() + timedelta(days=365)
                )
            
            # File upload
            uploaded_file = st.file_uploader(
                "Файл документа/Dokumentdatei",
                type=['pdf', 'jpg', 'jpeg', 'png']
            )
        
        note = st.text_area(
            "Комментарий/Kommentar"
        )
        
        if st.form_submit_button(get_text('save', language)):
            if title:
                try:
                    file_url = None
                    if uploaded_file:
                        file_url = upload_file(uploaded_file, 'documents')
                    
                    # Get current user (simulate)
                    current_user = execute_query("SELECT id FROM users LIMIT 1")
                    current_user_id = current_user[0][0] if current_user else None
                    
                    document_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO vehicle_documents 
                        (id, vehicle_id, document_type, title, date_issued, date_expiry, file_url, note, uploaded_by)
                        VALUES (:id, :vehicle_id, :document_type, :title, :date_issued, :date_expiry, :file_url, :note, :uploaded_by)
                    """, {
                        'id': document_id,
                        'vehicle_id': vehicle_id,
                        'document_type': document_type,
                        'title': title,
                        'date_issued': date_issued,
                        'date_expiry': date_expiry,
                        'file_url': file_url,
                        'note': note if note else None,
                        'uploaded_by': current_user_id
                    })
                    st.success(get_text('success_save', language))
                    get_documents_cached.clear()  # Clear cache
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
            else:
                st.error("Название обязательно / Titel ist erforderlich")

def delete_document(document_id):
    """Delete document"""
    try:
        execute_query("UPDATE vehicle_documents SET is_active = false WHERE id = :id", {'id': document_id})
        st.success(get_text('success_delete', language))
        get_documents_cached.clear()  # Clear cache
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Main page
st.title(f"📄 {get_text('documents', language)}")

tab1, tab2, tab3 = st.tabs([
    get_text('documents', language),
    get_text('add', language),
    "Истекающие/Ablaufend"
])

with tab1:
    show_documents_list()

with tab2:
    show_add_document_form()

with tab3:
    st.subheader("Документы с истекающим сроком действия / Ablaufende Dokumente")
    
    expiring_docs = execute_query("""
        SELECT 
            vd.title,
            v.name as vehicle_name,
            vd.date_expiry,
            (vd.date_expiry - CURRENT_DATE)::integer as days_left
        FROM vehicle_documents vd
        JOIN vehicles v ON vd.vehicle_id = v.id
        WHERE vd.is_active = true
        AND vd.date_expiry IS NOT NULL
        AND vd.date_expiry <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY vd.date_expiry
    """)
    
    if expiring_docs:
        for doc in expiring_docs:
            with st.container():
                if doc[3] <= 0:
                    st.error(f"🔴 **{doc[0]}** - {doc[1]} - Просрочен!")
                elif doc[3] <= 7:
                    st.warning(f"⚠️ **{doc[0]}** - {doc[1]} - Осталось {doc[3]} дней")
                else:
                    st.info(f"📅 **{doc[0]}** - {doc[1]} - Осталось {doc[3]} дней")
                st.write(f"Срок действия: {doc[2].strftime('%d.%m.%Y')}")
                st.divider()
    else:
        st.success("Нет документов с истекающим сроком действия")