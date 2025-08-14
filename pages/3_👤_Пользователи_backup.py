import streamlit as st
import uuid
from database import execute_query
from translations import get_text
from datetime import datetime, date

# Page config
st.set_page_config(
    page_title="Пользователи",
    page_icon="👤",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

def show_users_list():
    """Show list of users"""
    try:
        users = execute_query("""
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.role,
                t.name as team_name
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            ORDER BY u.first_name, u.last_name
        """)
        
        if users:
            for user in users:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{user[1]} {user[2]}**")
                        if user[4]:
                            st.write(f"👥 {user[4]}")
                    
                    with col2:
                        role_icons = {
                            'admin': '👑',
                            'manager': '💼',
                            'team_lead': '👨‍💼',
                            'worker': '👷'
                        }
                        icon = role_icons.get(user[3], '👤')
                        st.write(f"{icon} {get_text(user[3], language)}")
                    
                    with col3:
                        st.write("")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_user_{user[0]}"):
                            st.session_state[f"edit_user_{user[0]}"] = True
                        if st.button(f"🗑️", key=f"delete_user_{user[0]}"):
                            delete_user(user[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading users: {str(e)}")

def show_add_user_form():
    """Show form to add new user"""
    with st.form("add_user"):
        col1, col2 = st.columns(2)
        
        with col1:
            first_name = st.text_input(
                "Имя / Vorname",
                placeholder="Иван"
            )
            last_name = st.text_input(
                "Фамилия / Nachname",
                placeholder="Иванов"
            )
        
        with col2:
            role = st.selectbox(
                "Роль / Rolle",
                options=['admin', 'manager', 'team_lead', 'worker'],
                format_func=lambda x: get_text(x, language)
            )
            
            # Get teams for assignment
            teams = execute_query("SELECT id, name FROM teams ORDER BY name")
            team_id = None
            if teams:
                team_id = st.selectbox(
                    "Бригада / Team",
                    options=[None] + [t[0] for t in teams],
                    format_func=lambda x: "Не назначена" if x is None else next((t[1] for t in teams if t[0] == x), x)
                )
        
        if st.form_submit_button(get_text('save', language)):
            if first_name and last_name:
                try:
                    user_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO users (id, first_name, last_name, role, team_id)
                        VALUES (:id, :first_name, :last_name, :role, :team_id)
                    """, {
                        'id': user_id,
                        'first_name': first_name,
                        'last_name': last_name,
                        'role': role,
                        'team_id': team_id
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
            else:
                st.error("Имя и фамилия обязательны")

def delete_user(user_id):
    """Delete user"""
    try:
        execute_query("DELETE FROM users WHERE id = :id", {'id': user_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

@st.cache_data(ttl=300)
def get_user_documents_cached():
    """Get user documents with caching"""
    return execute_query("""
        SELECT 
            ud.id,
            u.first_name || ' ' || u.last_name as user_name,
            ud.document_type,
            ud.title,
            ud.date_issued,
            ud.date_expiry,
            ud.file_url
        FROM user_documents ud
        JOIN users u ON ud.user_id = u.id
        WHERE ud.is_active = true
        ORDER BY ud.date_expiry ASC, u.first_name
    """)

def show_user_documents():
    """Show user documents management"""
    st.subheader("Документы пользователей / Benutzerdokumente")
    
    # Sub-tabs for documents
    doc_tab1, doc_tab2, doc_tab3 = st.tabs([
        "Список / Liste",
        "Добавить / Hinzufügen", 
        "Истекающие / Ablaufend"
    ])
    
    with doc_tab1:
        show_user_documents_list()
    
    with doc_tab2:
        show_add_user_document_form()
    
    with doc_tab3:
        show_expiring_user_documents()

def show_user_documents_list():
    """Show list of user documents"""
    try:
        documents = get_user_documents_cached()
        
        if documents:
            for doc in documents:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{doc[1]}**")
                        st.write(f"📄 {doc[3]}")
                    
                    with col2:
                        doc_types = {
                            'passport': 'Паспорт / Reisepass',
                            'driving_license': 'Водительские права / Führerschein',
                            'medical_certificate': 'Медицинская справка / Ärztliches Zeugnis',
                            'work_permit': 'Разрешение на работу / Arbeitserlaubnis',
                            'visa': 'Виза / Visum',
                            'insurance': 'Страховка / Versicherung'
                        }
                        st.write(f"📋 {doc_types.get(doc[2], doc[2])}")
                    
                    with col3:
                        if doc[4]:
                            st.write(f"📅 Выдан: {doc[4].strftime('%d.%m.%Y')}")
                        if doc[5]:
                            days_left = (doc[5] - datetime.now().date()).days
                            if days_left <= 0:
                                st.error(f"⚠️ Просрочен")
                            elif days_left <= 30:
                                st.warning(f"⚠️ Истекает через {days_left} дней")
                            else:
                                st.write(f"✅ До {doc[5].strftime('%d.%m.%Y')}")
                    
                    with col4:
                        if doc[6]:
                            if st.button("👁️", key=f"view_doc_{doc[0]}"):
                                st.write(f"Файл: {doc[6]}")
                        if st.button("🗑️", key=f"delete_doc_{doc[0]}"):
                            delete_user_document(doc[0])
                    
                    st.divider()
        else:
            st.info("Нет документов пользователей")
            
    except Exception as e:
        st.error(f"Ошибка загрузки документов: {str(e)}")

def show_add_user_document_form():
    """Show form to add user document"""
    with st.form("add_user_document"):
        col1, col2 = st.columns(2)
        
        with col1:
            # User selection
            users = execute_query("SELECT id, first_name || ' ' || last_name as full_name FROM users ORDER BY first_name")
            if not users:
                st.warning("Необходимо создать пользователей")
                return
                
            user_id = st.selectbox(
                "Пользователь / Benutzer",
                options=[u[0] for u in users],
                format_func=lambda x: next((u[1] for u in users if u[0] == x), x)
            )
            
            document_type = st.selectbox(
                "Тип документа / Dokumenttyp",
                options=['passport', 'driving_license', 'medical_certificate', 'work_permit', 'visa', 'insurance'],
                format_func=lambda x: {
                    'passport': 'Паспорт / Reisepass',
                    'driving_license': 'Водительские права / Führerschein', 
                    'medical_certificate': 'Медицинская справка / Ärztliches Zeugnis',
                    'work_permit': 'Разрешение на работу / Arbeitserlaubnis',
                    'visa': 'Виза / Visum',
                    'insurance': 'Страховка / Versicherung'
                }[x]
            )
            
            title = st.text_input(
                "Название / Titel",
                placeholder="Водительские права категории B"
            )
        
        with col2:
            date_issued = st.date_input(
                "Дата выдачи / Ausstellungsdatum",
                value=None
            )
            
            date_expiry = st.date_input(
                "Срок действия до / Gültig bis",
                value=None
            )
            
            uploaded_file = st.file_uploader(
                "Файл / Datei",
                type=['jpg', 'jpeg', 'png', 'pdf']
            )
        
        if st.form_submit_button("💾 Сохранить / Speichern"):
            if user_id and document_type and title:
                try:
                    file_url = None
                    if uploaded_file:
                        # Simple file handling - in real app would upload to storage
                        file_url = f"user_docs/{uploaded_file.name}"
                    
                    doc_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO user_documents 
                        (id, user_id, document_type, title, date_issued, date_expiry, file_url, is_active)
                        VALUES (:id, :user_id, :document_type, :title, :date_issued, :date_expiry, :file_url, true)
                    """, {
                        'id': doc_id,
                        'user_id': user_id,
                        'document_type': document_type,
                        'title': title,
                        'date_issued': date_issued,
                        'date_expiry': date_expiry,
                        'file_url': file_url
                    })
                    
                    st.success("Документ добавлен")
                    get_user_documents_cached.clear()
                    st.rerun()
                except Exception as e:
                    st.error(f"Ошибка: {str(e)}")
            else:
                st.error("Заполните обязательные поля")

def show_expiring_user_documents():
    """Show expiring user documents"""
    try:
        expiring_docs = execute_query("""
            SELECT 
                ud.title,
                u.first_name || ' ' || u.last_name as user_name,
                ud.date_expiry,
                (ud.date_expiry - CURRENT_DATE)::integer as days_left
            FROM user_documents ud
            JOIN users u ON ud.user_id = u.id
            WHERE ud.is_active = true
            AND ud.date_expiry IS NOT NULL
            AND ud.date_expiry <= CURRENT_DATE + INTERVAL '30 days'
            ORDER BY ud.date_expiry
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
            
    except Exception as e:
        st.error(f"Ошибка: {str(e)}")

def delete_user_document(doc_id):
    """Delete user document"""
    try:
        execute_query("UPDATE user_documents SET is_active = false WHERE id = :id", {'id': doc_id})
        st.success("Документ удален")
        get_user_documents_cached.clear()
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")