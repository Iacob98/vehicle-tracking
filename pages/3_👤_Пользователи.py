import streamlit as st
import uuid
from database import execute_query
from translations import get_text
from datetime import date, datetime
import hashlib
from utils import upload_file
from auth import require_auth, show_org_header, is_admin, can_manage_users, is_owner

# Page config
st.set_page_config(
    page_title="Пользователи",
    page_icon="👤",
    layout="wide"
)

# Require authentication
require_auth()
show_org_header()

# Language from session state
language = st.session_state.get('language', 'ru')

def show_users_list():
    """Show list of users with inline editing"""
    try:
        # Check if we're editing a user
        edit_user_id = st.session_state.get('edit_user_id', None)
        
        if edit_user_id:
            show_edit_user_form(edit_user_id)
            return
        
        users = execute_query("""
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.role,
                u.phone,
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
                        if user[4]:  # phone
                            st.write(f"📞 {user[4]}")
                        if user[5]:  # team_name
                            st.write(f"👥 {user[5]}")
                    
                    with col2:
                        role_icons = {
                            'owner': '👑',
                            'admin': '🔧',
                            'manager': '💼',
                            'team_lead': '👨‍💼',
                            'worker': '👷'
                        }
                        icon = role_icons.get(user[3], '👤')
                        st.write(f"{icon} {get_text(user[3], language)}")
                    
                    with col3:
                        # Count user documents
                        doc_count = execute_query("""
                            SELECT COUNT(*) FROM user_documents 
                            WHERE user_id = :user_id AND is_active = true
                        """, {'user_id': user[0]})
                        count = doc_count[0][0] if doc_count else 0
                        st.write(f"📄 {count} документов")
                    
                    with col4:
                        col_edit, col_delete = st.columns(2)
                        with col_edit:
                            if st.button("✏️", key=f"edit_user_{user[0]}", help="Редактировать"):
                                st.session_state.edit_user_id = user[0]
                                st.rerun()
                        with col_delete:
                            if st.button("🗑️", key=f"delete_user_{user[0]}", help="Удалить"):
                                delete_user(user[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Ошибка загрузки пользователей: {str(e)}")

def show_edit_user_form(user_id):
    """Show form to edit existing user"""
    try:
        # Get current user data
        user_data = execute_query("""
            SELECT first_name, last_name, phone, role, team_id 
            FROM users 
            WHERE id = :id
        """, {'id': user_id})
        
        if not user_data:
            st.error("Пользователь не найден")
            if st.button("⬅️ Назад к списку"):
                del st.session_state.edit_user_id
                st.rerun()
            return
        
        current_user = user_data[0]
        
        st.subheader("✏️ Редактировать пользователя / Benutzer bearbeiten")
        
        if st.button("⬅️ Назад к списку / Zurück zur Liste"):
            del st.session_state.edit_user_id
            st.rerun()
        
        with st.form("edit_user"):
            col1, col2 = st.columns(2)
            
            with col1:
                first_name = st.text_input(
                    "Имя / Vorname",
                    value=current_user[0],
                    placeholder="Иван"
                )
                last_name = st.text_input(
                    "Фамилия / Nachname", 
                    value=current_user[1],
                    placeholder="Иванов"
                )
                phone = st.text_input(
                    "📞 Телефон / Telefon",
                    value=current_user[2] or "",
                    placeholder="+7 900 123-45-67"
                )
            
            with col2:
                roles = ['owner', 'admin', 'manager', 'team_lead', 'worker']
                current_role_index = roles.index(current_user[3]) if current_user[3] in roles else 0
                
                # Role selection - owners can edit any role, others can't change roles of owners
                available_roles = roles.copy()
                if not is_owner() and current_user[3] == 'owner':
                    # Non-owners can't edit owner accounts
                    st.error("❌ Только владелец аккаунта может редактировать роли владельцев")
                    available_roles = [current_user[3]]  # Keep current role only
                elif not is_owner():
                    # Non-owners can't assign owner role
                    available_roles = ['admin', 'manager', 'team_lead', 'worker']
                
                role = st.selectbox(
                    "Роль / Rolle",
                    options=available_roles,
                    index=available_roles.index(current_user[3]) if current_user[3] in available_roles else 0,
                    format_func=lambda x: get_text(x, language)
                )
                
                # Get teams for assignment
                teams = execute_query("SELECT id, name FROM teams ORDER BY name")
                team_options = [None] + ([t[0] for t in teams] if teams else [])
                current_team_index = 0
                if current_user[4] and teams:
                    try:
                        current_team_index = team_options.index(current_user[4])
                    except ValueError:
                        current_team_index = 0
                
                team_id = st.selectbox(
                    "Бригада / Team",
                    options=team_options,
                    index=current_team_index,
                    format_func=lambda x: "Не назначена" if x is None else next((t[1] for t in teams if teams and t[0] == x), str(x))
                )
            
            col_save, col_cancel = st.columns(2)
            with col_save:
                if st.form_submit_button("💾 Сохранить / Speichern", type="primary"):
                    if first_name and last_name:
                        try:
                            execute_query("""
                                UPDATE users 
                                SET first_name = :first_name, last_name = :last_name, phone = :phone, role = :role, team_id = :team_id
                                WHERE id = :id
                            """, {
                                'id': user_id,
                                'first_name': first_name,
                                'last_name': last_name,
                                'phone': phone,
                                'role': role,
                                'team_id': team_id
                            })
                            st.success("Пользователь обновлен / Benutzer aktualisiert")
                            del st.session_state.edit_user_id
                            st.rerun()
                        except Exception as e:
                            st.error(f"Ошибка обновления: {str(e)}")
                    else:
                        st.error("Имя и фамилия обязательны")
            
            with col_cancel:
                if st.form_submit_button("❌ Отмена / Abbrechen"):
                    del st.session_state.edit_user_id
                    st.rerun()
                    
    except Exception as e:
        st.error(f"Ошибка загрузки данных: {str(e)}")
        if st.button("⬅️ Назад к списку"):
            if 'edit_user_id' in st.session_state:
                del st.session_state.edit_user_id
            st.rerun()

def show_add_user_form():
    """Show form to add new user - only for account owners"""
    # Check if current user has permission to add users
    if not can_manage_users():
        st.error("❌ Только владелец аккаунта и менеджеры могут добавлять пользователей")
        st.info("💡 Обратитесь к администратору для добавления новых пользователей")
        return
    
    st.subheader("➕ Добавить пользователя в аккаунт / Benutzer zum Konto hinzufügen")
    st.info("🔐 Добавленные пользователи получат полный доступ к данным вашей организации")
    
    with st.form("add_user"):
        col1, col2 = st.columns(2)
        
        with col1:
            email = st.text_input(
                "📧 Email",
                placeholder="user@example.com",
                help="Обязательно для входа в систему"
            )
            password = st.text_input(
                "🔒 Пароль / Password",
                type="password",
                placeholder="Минимум 6 символов",
                help="Пользователь сможет изменить пароль после входа"
            )
            password_confirm = st.text_input(
                "🔒 Подтвердите пароль / Password bestätigen",
                type="password",
                placeholder="Повторите пароль"
            )
        
        with col2:
            first_name = st.text_input(
                "Имя / Vorname",
                placeholder="Иван"
            )
            last_name = st.text_input(
                "Фамилия / Nachname",
                placeholder="Иванов"
            )
            phone = st.text_input(
                "📞 Телефон / Telefon",
                placeholder="+7 900 123-45-67"
            )
        
        # Role selection (no owner role for added users)
        role = st.selectbox(
            "Роль / Rolle",
            options=['admin', 'manager', 'team_lead', 'worker'],
            format_func=lambda x: get_text(x, language),
            help="Все роли имеют полный доступ к функциям системы, кроме удаления аккаунта"
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
        
        if st.form_submit_button("👥 Добавить в аккаунт / Zum Konto hinzufügen"):
            if not all([email, password, first_name, last_name]):
                st.error("❌ Заполните все обязательные поля: Email, пароль, имя и фамилия")
            elif len(password) < 6:
                st.error("❌ Пароль должен содержать минимум 6 символов")
            elif password != password_confirm:
                st.error("❌ Пароли не совпадают")
            else:
                try:
                    # Check if email already exists
                    existing = execute_query("SELECT id FROM users WHERE email = :email", {'email': email})
                    if existing:
                        st.error("❌ Пользователь с таким email уже существует")
                        return
                    
                    user_id = str(uuid.uuid4())
                    password_hash = hashlib.sha256((password + "fleet_management_salt_2025").encode()).hexdigest()
                    
                    execute_query("""
                        INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, phone, role, team_id, created_at)
                        VALUES (:id, :organization_id, :email, :password_hash, :first_name, :last_name, :phone, :role, :team_id, :created_at)
                    """, {
                        'id': user_id,
                        'organization_id': st.session_state.get('organization_id'),
                        'email': email,
                        'password_hash': password_hash,
                        'first_name': first_name,
                        'last_name': last_name,
                        'phone': phone,
                        'role': role,
                        'team_id': team_id,
                        'created_at': datetime.now()
                    })
                    st.success(f"✅ Пользователь {first_name} {last_name} добавлен в аккаунт!")
                    st.info(f"📧 Email для входа: {email}")
                    st.info("🔐 Пользователь может войти в систему с указанными данными")
                    st.rerun()
                except Exception as e:
                    st.error(f"❌ Ошибка добавления пользователя: {str(e)}")

def delete_user(user_id):
    """Delete user - with permission checks"""
    try:
        # Check if current user has permission to delete users
        if not can_manage_users():
            st.error("❌ Только владелец аккаунта и менеджеры могут удалять пользователей")
            return
        
        # Check if trying to delete another owner
        user_to_delete = execute_query("SELECT role FROM users WHERE id = :id", {'id': user_id})
        if user_to_delete and user_to_delete[0][0] == 'owner':
            st.error("❌ Нельзя удалить владельца аккаунта")
            return
        
        # Check if trying to delete self  
        if user_id == st.session_state.get('user_id'):
            st.error("❌ Нельзя удалить самого себя")
            return
            
        execute_query("DELETE FROM users WHERE id = :id AND organization_id = :org_id", {
            'id': user_id,
            'org_id': st.session_state.get('organization_id')
        })
        st.success("✅ Пользователь удален из аккаунта")
        st.rerun()
    except Exception as e:
        st.error(f"❌ Ошибка удаления: {str(e)}")

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

def show_user_documents_list():
    """Show list of user documents"""
    try:
        # Check if any document is being viewed
        view_doc_id = None
        for key in st.session_state:
            if key.startswith("view_doc_") and st.session_state[key]:
                view_doc_id = key.replace("view_doc_", "")
                break
        
        if view_doc_id:
            # Get document info
            doc_info = execute_query("SELECT title, file_url FROM user_documents WHERE id = :id", {'id': view_doc_id})
            if doc_info:
                show_user_file_viewer(doc_info[0][1], doc_info[0][0], view_doc_id)
                return
        
        # User selection filter
        st.subheader("👤 Выберите пользователя / Benutzer auswählen")
        
        col1, col2 = st.columns([2, 1])
        with col1:
            users = execute_query("SELECT id, first_name || ' ' || last_name as full_name FROM users ORDER BY first_name")
            if not users:
                st.warning("Нет пользователей / Keine Benutzer")
                return
                
            selected_user_id = st.selectbox(
                "Пользователь / Benutzer",
                options=[u[0] for u in users],
                format_func=lambda x: next((u[1] for u in users if u[0] == x), x),
                key="user_docs_filter"
            )
        
        with col2:
            st.write("")  # Spacing
            if st.button("🔄 Обновить / Aktualisieren"):
                get_user_documents_cached.clear()
                st.rerun()
        
        if selected_user_id:
            user_name = next((u[1] for u in users if u[0] == selected_user_id), "")
            st.markdown(f"### 📋 Документы: **{user_name}**")
            
            # Get documents for selected user
            user_documents = execute_query("""
                SELECT 
                    ud.id,
                    ud.document_type,
                    ud.title,
                    ud.issue_date,
                    ud.expiry_date,
                    ud.file_url
                FROM user_documents ud
                WHERE ud.user_id = :user_id AND ud.is_active = true
                ORDER BY ud.document_type, ud.expiry_date ASC
            """, {'user_id': selected_user_id})
            
            if user_documents:
                # Group documents by type
                doc_types = {
                    'passport': {'name': 'Паспорт / Reisepass', 'icon': '🆔', 'docs': []},
                    'driving_license': {'name': 'Водительские права / Führerschein', 'icon': '🚗', 'docs': []},
                    'medical_certificate': {'name': 'Медицинская справка / Ärztliches Zeugnis', 'icon': '🏥', 'docs': []},
                    'work_permit': {'name': 'Разрешение на работу / Arbeitserlaubnis', 'icon': '💼', 'docs': []},
                    'visa': {'name': 'Виза / Visum', 'icon': '✈️', 'docs': []},
                    'insurance': {'name': 'Страховка / Versicherung', 'icon': '🛡️', 'docs': []},
                }
                
                # Group documents
                for doc in user_documents:
                    doc_type = doc[1]
                    if doc_type not in doc_types:
                        doc_types[doc_type] = {'name': doc_type, 'icon': '📄', 'docs': []}
                    doc_types[doc_type]['docs'].append(doc)
                
                # Show documents by type
                for doc_type, type_info in doc_types.items():
                    if type_info['docs']:
                        st.markdown(f"#### {type_info['icon']} {type_info['name']}")
                        
                        for doc in type_info['docs']:
                            with st.container():
                                col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                                
                                with col1:
                                    st.write(f"📄 **{doc[2]}**")
                                
                                with col2:
                                    if doc[3]:
                                        st.write(f"📅 Выдан: {doc[3].strftime('%d.%m.%Y')}")
                                
                                with col3:
                                    if doc[4]:
                                        days_left = (doc[4] - datetime.now().date()).days
                                        if days_left <= 0:
                                            st.error(f"⚠️ Просрочен")
                                        elif days_left <= 30:
                                            st.warning(f"⚠️ Истекает через {days_left} дней")
                                        else:
                                            st.success(f"✅ До {doc[4].strftime('%d.%m.%Y')}")
                                    else:
                                        st.info("Срок не указан")
                                
                                with col4:
                                    col_view, col_del = st.columns(2)
                                    with col_view:
                                        if doc[5] and st.button("👁️", key=f"view_doc_{doc[0]}", help="Просмотр"):
                                            st.session_state[f"view_doc_{doc[0]}"] = True
                                            st.rerun()
                                    with col_del:
                                        if st.button("🗑️", key=f"delete_doc_{doc[0]}", help="Удалить"):
                                            delete_user_document(doc[0])
                                
                                st.divider()
                        
                        st.write("")  # Spacing between document types
            else:
                st.info(f"У пользователя {user_name} нет документов / {user_name} hat keine Dokumente")
                st.markdown("💡 **Подсказка:** Используйте вкладку 'Добавить' для загрузки документов")
            
    except Exception as e:
        st.error(f"Ошибка загрузки документов: {str(e)}")

def show_user_file_viewer(file_url, title, doc_id):
    """Show file viewer in full width"""
    st.header(f"📎 {title}")
    
    if st.button("⬅️ Назад к списку / Zurück zur Liste", use_container_width=True):
        if f"view_doc_{doc_id}" in st.session_state:
            del st.session_state[f"view_doc_{doc_id}"]
        st.rerun()
    
    if not file_url:
        st.warning("Файл не найден / Datei nicht gefunden")
        return
    
    # File info
    file_name = file_url.split('/')[-1]
    file_extension = file_name.split('.')[-1].lower() if '.' in file_name else ''
    
    # Create main layout
    col_main, col_sidebar = st.columns([3, 1])
    
    with col_main:
        st.info(f"📁 **Файл:** {file_name}")
        
        # Determine file type and display accordingly
        if file_extension in ['jpg', 'jpeg', 'png', 'gif']:
            try:
                import os
                if file_url.startswith('/'):
                    file_path = file_url.lstrip('/')
                    if os.path.exists(file_path):
                        st.image(file_path, caption=title, use_container_width=True)
                    else:
                        st.error("🚫 Файл изображения не найден/Bilddatei nicht gefunden")
                else:
                    st.image(file_url, caption=title, use_container_width=True)
            except Exception as e:
                st.error(f"❌ Ошибка загрузки изображения/Fehler beim Laden des Bildes: {str(e)}")
                
        elif file_extension == 'pdf':
            st.success("📄 **PDF документ готов к просмотру**")
            
            col_pdf1, col_pdf2 = st.columns(2)
            with col_pdf1:
                st.write("💡 **Русский:** Используйте кнопку 'Скачать' справа для просмотра PDF файла")
            with col_pdf2:
                st.write("💡 **Deutsch:** Nutzen Sie den 'Download'-Button rechts, um die PDF anzuzeigen")
                
        else:
            st.warning(f"📎 **Файл типа .{file_extension}**")
            st.info("💡 Используйте кнопку скачивания справа / Nutzen Sie den Download-Button rechts")
    
    with col_sidebar:
        st.markdown("### Действия / Aktionen")
        
        try:
            import os
            if file_url.startswith('/'):
                # Local file
                file_path = file_url.lstrip('/')
                if os.path.exists(file_path):
                    with open(file_path, "rb") as f:
                        file_data = f.read()
                    
                    st.download_button(
                        label="⬇️ **Скачать**\n**Download**",
                        data=file_data,
                        file_name=file_name,
                        use_container_width=True
                    )
                else:
                    st.error("❌ Файл не найден")
            else:
                st.markdown(f"🔗 [Скачать файл/Datei herunterladen]({file_url})")
        except Exception as e:
            st.error("❌ Ошибка доступа")

def show_add_user_document_form():
    """Show form to add user document"""
    st.subheader("➕ Добавить документ / Dokument hinzufügen")
    
    # Get saved user selection from the list tab if available
    saved_user_id = st.session_state.get("user_docs_filter", None)
    
    with st.form("add_user_document"):
        col1, col2 = st.columns(2)
        
        with col1:
            # User selection
            users = execute_query("SELECT id, first_name || ' ' || last_name as full_name FROM users ORDER BY first_name")
            if not users:
                st.warning("Необходимо создать пользователей / Benutzer müssen erstellt werden")
                return
            
            # Set default to the selected user from list tab
            default_index = 0
            if saved_user_id:
                try:
                    default_index = [u[0] for u in users].index(saved_user_id)
                except ValueError:
                    default_index = 0
                
            user_id = st.selectbox(
                "👤 Пользователь / Benutzer",
                options=[u[0] for u in users],
                format_func=lambda x: next((u[1] for u in users if u[0] == x), x),
                index=default_index
            )
            
            document_type = st.selectbox(
                "📋 Тип документа / Dokumenttyp",
                options=['passport', 'driving_license', 'medical_certificate', 'work_permit', 'visa', 'insurance'],
                format_func=lambda x: {
                    'passport': '🆔 Паспорт / Reisepass',
                    'driving_license': '🚗 Водительские права / Führerschein', 
                    'medical_certificate': '🏥 Медицинская справка / Ärztliches Zeugnis',
                    'work_permit': '💼 Разрешение на работу / Arbeitserlaubnis',
                    'visa': '✈️ Виза / Visum',
                    'insurance': '🛡️ Страховка / Versicherung'
                }[x]
            )
            
            title = st.text_input(
                "📄 Название документа / Dokumententitel",
                placeholder="Например: Водительские права категории B"
            )
        
        with col2:
            date_issued = st.date_input(
                "📅 Дата выдачи / Ausstellungsdatum",
                value=None
            )
            
            date_expiry = st.date_input(
                "⏰ Срок действия до / Gültig bis",
                value=None
            )
            
            uploaded_file = st.file_uploader(
                "📎 Прикрепить файл / Datei anhängen",
                type=['jpg', 'jpeg', 'png', 'pdf']
            )
        
        if st.form_submit_button("💾 Сохранить документ / Dokument speichern", type="primary"):
            if user_id and document_type and title:
                try:
                    file_url = None
                    if uploaded_file:
                        file_url = upload_file(uploaded_file, 'user_documents')
                    
                    doc_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO user_documents 
                        (id, organization_id, user_id, document_type, title, issue_date, expiry_date, file_url, notes)
                        VALUES (:id, :organization_id, :user_id, :document_type, :title, :issue_date, :expiry_date, :file_url, :notes)
                    """, {
                        'id': doc_id,
                        'user_id': user_id,
                        'document_type': document_type,
                        'title': title,
                        'organization_id': st.session_state.get('organization_id'),
                        'issue_date': date_issued,
                        'expiry_date': date_expiry,
                        'notes': None,
                        'file_url': file_url
                    })
                    
                    user_name = next((u[1] for u in users if u[0] == user_id), "")
                    st.success(f"✅ Документ добавлен для {user_name}")
                    st.info("💡 Перейдите на вкладку 'Список' чтобы увидеть добавленный документ")
                    
                    get_user_documents_cached.clear()
                    st.rerun()
                    
                except Exception as e:
                    st.error(f"❌ Ошибка сохранения: {str(e)}")
            else:
                st.error("❌ Заполните обязательные поля: Пользователь, Тип документа, Название")

def delete_user_document(doc_id):
    """Delete user document"""
    try:
        execute_query("UPDATE user_documents SET is_active = false WHERE id = :id", {'id': doc_id})
        st.success("Документ удален")
        get_user_documents_cached.clear()
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

def show_user_documents():
    """Show user documents management"""
    st.subheader("Документы пользователей / Benutzerdokumente")
    
    # Sub-tabs for documents
    doc_tab1, doc_tab2 = st.tabs([
        "Список / Liste",
        "Добавить / Hinzufügen"
    ])
    
    with doc_tab1:
        show_user_documents_list()
    
    with doc_tab2:
        show_add_user_document_form()

# Main page - simplified structure
st.title(f"👤 {get_text('users', language)}")

tab1, tab2, tab3 = st.tabs([
    "Список / Liste",
    "Добавить / Hinzufügen",
    "Документы / Dokumente"
])

with tab1:
    show_users_list()

with tab2:
    show_add_user_form()

with tab3:
    show_user_documents()