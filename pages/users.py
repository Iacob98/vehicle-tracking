import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, get_teams_for_select, upload_file
from datetime import datetime, date, timedelta
import uuid
import os

def show_page(language='ru'):
    """Show users management page"""
    st.title(f"👤 {get_text('users', language)}")
    
    # Tabs for different views
    tab1, tab2, tab3 = st.tabs([
        get_text('users', language),
        get_text('add', language),
        "Документы пользователей/Benutzerdokumente"
    ])
    
    with tab1:
        show_users_list(language)
    
    with tab2:
        show_add_user_form(language)
    
    with tab3:
        show_user_documents_management(language)

def show_users_list(language='ru'):
    """Show list of users"""
    try:
        # Filters
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder=f"{get_text('name', language)}, {get_text('phone', language)}..."
            )
        
        with col2:
            role_filter = st.selectbox(
                get_text('role', language),
                options=['all', 'admin', 'manager', 'team_lead'],
                format_func=lambda x: get_text(x, language) if x != 'all' else 'Все/Alle'
            )
        
        with col3:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_users_data(language)
        
        # Build query with filters
        query = """
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.phone,
                u.role,
                t.name as team_name
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            WHERE 1=1
        """
        params = {}
        
        if search_term:
            query += """ AND (
                u.first_name ILIKE :search OR 
                u.last_name ILIKE :search OR 
                u.phone ILIKE :search
            )"""
            params['search'] = f"%{search_term}%"
        
        if role_filter != 'all':
            query += " AND u.role = :role"
            params['role'] = role_filter
        
        query += " ORDER BY u.last_name, u.first_name"
        
        users = execute_query(query, params)
        
        if users:
            for user in users:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{user[1]} {user[2]}**")
                        if user[3]:
                            st.write(f"📞 {user[3]}")
                    
                    with col2:
                        role_icon = {
                            'admin': '👑',
                            'manager': '💼',
                            'team_lead': '🎯',
                            'worker': '👷'
                        }.get(user[4], '👤')
                        st.write(f"{role_icon} {get_text(user[4], language)}")
                    
                    with col3:
                        team_name = user[5] or 'Не назначен/Nicht zugewiesen'
                        st.write(f"{get_text('team', language)}: {team_name}")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_btn_user_{user[0]}"):
                            st.session_state[f"edit_user_{user[0]}"] = True
                        if st.button(f"🗑️", key=f"delete_user_{user[0]}"):
                            delete_user(user[0], language)
                    
                    # Show edit form if requested
                    if st.session_state.get(f"edit_user_{user[0]}", False):
                        show_edit_user_form(user, language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading users: {str(e)}")

def show_add_user_form(language='ru'):
    """Show form to add new user"""
    st.subheader(f"{get_text('add', language)} {get_text('users', language)}")
    
    with st.form("add_user_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            first_name = st.text_input("Имя/Vorname", key="new_user_first_name")
            last_name = st.text_input("Фамилия/Nachname", key="new_user_last_name")
            phone = st.text_input(get_text('phone', language), key="new_user_phone")
        
        with col2:
            role = st.selectbox(
                get_text('role', language),
                options=['admin', 'manager', 'team_lead', 'worker'],
                format_func=lambda x: get_text(x, language),
                key="new_user_role"
            )
            
            # Get teams for selection
            teams = get_teams_for_select(language)
            team_id = None
            if teams:
                team_options = [('', 'Не выбрана/Nicht ausgewählt')] + teams
                selected_team = st.selectbox(
                    get_text('team', language),
                    options=[option[0] for option in team_options],
                    format_func=lambda x: next(option[1] for option in team_options if option[0] == x),
                    key="new_user_team"
                )
                team_id = selected_team if selected_team else None
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            if not first_name or not last_name:
                st.error("Имя и фамилия обязательны / Vor- und Nachname sind erforderlich")
            else:
                try:
                    user_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO users (id, first_name, last_name, phone, role, team_id)
                        VALUES (:id, :first_name, :last_name, :phone, :role, :team_id)
                    """, {
                        'id': user_id,
                        'first_name': first_name,
                        'last_name': last_name,
                        'phone': phone if phone else None,
                        'role': role,
                        'team_id': team_id if team_id else None
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")

def show_edit_user_form(user, language='ru'):
    """Show form to edit user"""
    with st.expander(f"✏️ {get_text('edit', language)}: {user[1]} {user[2]}", expanded=True):
        with st.form(f"edit_user_form_{user[0]}"):
            col1, col2 = st.columns(2)
            
            with col1:
                first_name = st.text_input(
                    "Имя/Vorname",
                    value=user[1],
                    key=f"edit_user_first_name_{user[0]}"
                )
                last_name = st.text_input(
                    "Фамилия/Nachname",
                    value=user[2],
                    key=f"edit_user_last_name_{user[0]}"
                )
                phone = st.text_input(
                    get_text('phone', language),
                    value=user[3] or '',
                    key=f"edit_user_phone_{user[0]}"
                )
            
            with col2:
                role = st.selectbox(
                    get_text('role', language),
                    options=['admin', 'manager', 'team_lead', 'worker'],
                    index=['admin', 'manager', 'team_lead', 'worker'].index(user[4]),
                    format_func=lambda x: get_text(x, language),
                    key=f"edit_user_role_{user[0]}"
                )
                
                # Get teams for selection
                teams = get_teams_for_select(language)
                current_team = user[5] if user[5] else None
                team_id = None
                
                if teams:
                    team_options = [('', 'Не выбрана/Nicht ausgewählt')] + teams
                    # Find current team index
                    current_index = 0
                    if current_team:
                        for i, option in enumerate(team_options):
                            if option[1] == current_team:
                                current_index = i
                                break
                    
                    selected_team = st.selectbox(
                        get_text('team', language),
                        options=[option[0] for option in team_options],
                        format_func=lambda x: next(option[1] for option in team_options if option[0] == x),
                        index=current_index,
                        key=f"edit_user_team_{user[0]}"
                    )
                    team_id = selected_team if selected_team else None
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                submitted = st.form_submit_button(get_text('save', language))
            
            with col_cancel:
                cancelled = st.form_submit_button(get_text('cancel', language))
            
            if submitted:
                try:
                    execute_query("""
                        UPDATE users 
                        SET first_name = :first_name, last_name = :last_name, phone = :phone, role = :role, team_id = :team_id
                        WHERE id = :id
                    """, {
                        'id': user[0],
                        'first_name': first_name,
                        'last_name': last_name,
                        'phone': phone if phone else None,
                        'role': role,
                        'team_id': team_id if team_id else None
                    })
                    if f"edit_user_{user[0]}" in st.session_state:
                        del st.session_state[f"edit_user_{user[0]}"]
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")
            
            if cancelled:
                if f"edit_user_{user[0]}" in st.session_state:
                    del st.session_state[f"edit_user_{user[0]}"]
                st.rerun()

def delete_user(user_id, language='ru'):
    """Delete user"""
    try:
        # Check if user is team lead
        team_lead_count = execute_query(
            "SELECT COUNT(*) FROM teams WHERE lead_id = :id", 
            {'id': user_id}
        )[0][0]
        
        if team_lead_count > 0:
            st.error("Нельзя удалить пользователя, который является бригадиром / Benutzer, der Teamleiter ist, kann nicht gelöscht werden")
            return
        
        execute_query("DELETE FROM users WHERE id = :id", {'id': user_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"{get_text('error_delete', language)}: {str(e)}")

def export_users_data(language='ru'):
    """Export users data to CSV"""
    try:
        users = execute_query("""
            SELECT 
                CONCAT(u.first_name, ' ', u.last_name) as name,
                u.phone,
                u.role,
                t.name as team_name
            FROM users u
            LEFT JOIN teams t ON u.team_id = t.id
            ORDER BY u.last_name, u.first_name
        """)
        
        if users:
            export_to_csv(users, "users")
        else:
            st.warning(get_text('no_data', language))
    except Exception as e:
        st.error(f"Export error: {str(e)}")

def show_user_documents_management(language='ru'):
    """Show user documents management interface"""
    
    # Check if user wants to view a file
    file_viewer_keys = [key for key in st.session_state.keys() if key.startswith('view_user_file_')]
    if file_viewer_keys:
        # Show file viewer in full width
        file_key = file_viewer_keys[0]
        file_data = st.session_state[file_key]
        
        col1, col2 = st.columns([1, 10])
        with col1:
            if st.button("← Назад\nZurück", use_container_width=True):
                del st.session_state[file_key]
                st.rerun()
        
        with col2:
            show_user_file_viewer(file_data['url'], file_data['title'], file_data['language'])
        
        return
    
    st.subheader("Управление документами пользователей/Benutzerdokument-Verwaltung")
    
    # Create tabs for different operations
    doc_tab1, doc_tab2, doc_tab3 = st.tabs([
        "Список документов/Dokumentenliste",
        "Добавить документ/Dokument hinzufügen", 
        "Истекающие документы/Ablaufende Dokumente"
    ])
    
    with doc_tab1:
        show_user_documents_list(language)
    
    with doc_tab2:
        show_add_user_document_form(language)
    
    with doc_tab3:
        show_expiring_user_documents(language)

def get_user_document_types(language='ru'):
    """Get user document types with translations"""
    if language == 'de':
        return {
            'driving_license': 'Führerschein',
            'passport': 'Reisepass', 
            'id_card': 'Personalausweis',
            'medical_certificate': 'Ärztliches Attest',
            'work_permit': 'Arbeitserlaubnis',
            'insurance_card': 'Versicherungskarte',
            'photo': 'Foto',
            'contract': 'Vertrag',
            'certificate': 'Zertifikat',
            'other': 'Sonstiges'
        }
    else:  # Russian
        return {
            'driving_license': 'Водительские права',
            'passport': 'Паспорт',
            'id_card': 'Удостоверение личности', 
            'medical_certificate': 'Медицинская справка',
            'work_permit': 'Разрешение на работу',
            'insurance_card': 'Страховая карта',
            'photo': 'Фотография',
            'contract': 'Контракт',
            'certificate': 'Сертификат',
            'other': 'Прочее'
        }

def show_user_documents_list(language='ru'):
    """Show list of user documents"""
    try:
        # Filters
        col1, col2, col3, col4 = st.columns([2, 2, 1, 1])
        
        with col1:
            search_term = st.text_input(
                "Поиск/Suche",
                placeholder="Имя пользователя, тип документа..."
            )
        
        with col2:
            # User filter
            users = execute_query("SELECT id, first_name || ' ' || last_name as full_name FROM users ORDER BY first_name")
            user_options = ['all'] + [u[0] for u in users] if users else ['all']
            user_filter = st.selectbox(
                "Пользователь/Benutzer",
                options=user_options,
                format_func=lambda x: 'Все/Alle' if x == 'all' else next((u[1] for u in users if u[0] == x), x) if users else x
            )
        
        with col3:
            # Document type filter
            doc_types = get_user_document_types(language)
            type_options = ['all'] + list(doc_types.keys())
            type_filter = st.selectbox(
                "Тип/Typ",
                options=type_options,
                format_func=lambda x: 'Все/Alle' if x == 'all' else doc_types.get(x, x)
            )
        
        with col4:
            st.write("")  # Spacing
            if st.button("📥 Экспорт/Export"):
                export_user_documents_data(language)
        
        # Build query with filters
        query = """
            SELECT 
                ud.id,
                ud.document_type,
                ud.title,
                ud.date_issued,
                ud.date_expiry,
                ud.file_url,
                ud.note,
                u.first_name || ' ' || u.last_name as user_name,
                ub.first_name || ' ' || ub.last_name as uploaded_by_name,
                ud.uploaded_at,
                CASE 
                    WHEN ud.date_expiry IS NULL THEN 'no_expiry'
                    WHEN ud.date_expiry < CURRENT_DATE THEN 'expired'
                    WHEN ud.date_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
                    ELSE 'valid'
                END as status
            FROM user_documents ud
            JOIN users u ON ud.user_id = u.id
            LEFT JOIN users ub ON ud.uploaded_by = ub.id
            WHERE ud.is_active = true
        """
        params = {}
        
        if search_term:
            query += """ AND (
                u.first_name ILIKE :search OR 
                u.last_name ILIKE :search OR
                ud.title ILIKE :search OR
                ud.document_type::text ILIKE :search
            )"""
            params['search'] = f"%{search_term}%"
        
        if user_filter != 'all':
            query += " AND ud.user_id = :user_id"
            params['user_id'] = user_filter
        
        if type_filter != 'all':
            query += " AND ud.document_type = :doc_type"
            params['doc_type'] = type_filter
        
        query += " ORDER BY ud.uploaded_at DESC"
        
        documents = execute_query(query, params)
        
        if documents and isinstance(documents, list) and len(documents) > 0:
            st.write(f"**Найдено документов: {len(documents)}**")
            
            # Display documents
            for doc in documents:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        doc_types = get_user_document_types(language)
                        st.write(f"**{doc[2]}**")  # title
                        st.write(f"📋 {doc_types.get(doc[1], doc[1])}")  # document_type
                        st.write(f"👤 {doc[7]}")  # user_name
                    
                    with col2:
                        if doc[3]:  # date_issued
                            st.write(f"📅 Выдан/Ausgestellt: {doc[3].strftime('%d.%m.%Y')}")
                        if doc[4]:  # date_expiry
                            st.write(f"⏳ Действует до/Gültig bis: {doc[4].strftime('%d.%m.%Y')}")
                    
                    with col3:
                        # Status indicator
                        status_icons = {
                            'expired': '🔴 Просрочен/Abgelaufen',
                            'expiring': '🟡 Истекает/Läuft ab',
                            'valid': '🟢 Действителен/Gültig',
                            'no_expiry': '⚪ Без срока/Unbefristet'
                        }
                        st.write(status_icons.get(doc[10], '⚪'))
                        
                        if doc[5]:  # file_url
                            file_name = doc[5].split('/')[-1]
                            file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
                            
                            if file_ext in ['jpg', 'jpeg', 'png', 'gif']:
                                st.write("🖼️ Изображение/Bild")
                            elif file_ext == 'pdf':
                                st.write("📄 PDF документ/PDF-Dokument")
                            else:
                                st.write("📎 Файл есть/Datei vorhanden")
                            
                            st.caption(f"📁 {file_name}")
                        
                        if doc[8]:  # uploaded_by_name
                            st.write(f"👤 {doc[8]}")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_user_doc_{doc[0]}"):
                            st.session_state[f"edit_user_doc_{doc[0]}"] = True
                        if st.button(f"🗑️", key=f"delete_user_doc_{doc[0]}"):
                            delete_user_document(doc[0], language)
                        if doc[5] and st.button(f"📎", key=f"view_user_doc_{doc[0]}"):
                            st.session_state[f"view_user_file_{doc[0]}"] = {
                                'url': doc[5],
                                'title': doc[2],
                                'language': language
                            }
                    
                    # Show edit form if requested
                    if st.session_state.get(f"edit_user_doc_{doc[0]}", False):
                        show_edit_user_document_form(doc, language)
                    
                    if doc[6]:  # note
                        st.write(f"📝 {doc[6]}")
                    
                    st.divider()
        else:
            st.info("Документы не найдены/Keine Dokumente gefunden")
    
    except Exception as e:
        st.error(f"Ошибка загрузки документов/Fehler beim Laden der Dokumente: {str(e)}")

def show_add_user_document_form(language='ru'):
    """Show form to add new user document"""
    st.subheader("Добавить документ пользователя/Benutzerdokument hinzufügen")
    
    with st.form("add_user_document_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            # User selection
            users = execute_query("SELECT id, first_name || ' ' || last_name as full_name FROM users ORDER BY first_name")
            if not users or not isinstance(users, list) or len(users) == 0:
                st.warning("Необходимо создать пользователей / Benutzer müssen erstellt werden")
                return
            
            user_id = st.selectbox(
                "Пользователь/Benutzer",
                options=[u[0] for u in users],
                format_func=lambda x: next((u[1] for u in users if u[0] == x), x),
                key="new_user_doc_user"
            )
            
            # Document type
            doc_types = get_user_document_types(language)
            document_type = st.selectbox(
                "Тип документа/Dokumenttyp",
                options=list(doc_types.keys()),
                format_func=lambda x: doc_types[x],
                key="new_user_doc_type"
            )
            
            # Title
            title = st.text_input(
                "Название/Titel",
                placeholder="Водительские права серии AB/Führerschein Klasse AB...",
                key="new_user_doc_title"
            )
        
        with col2:
            # Issue date
            date_issued = st.date_input(
                "Дата выдачи/Ausstellungsdatum",
                value=date.today(),
                key="new_user_doc_issued"
            )
            
            # Expiry date
            has_expiry = st.checkbox(
                "Есть срок действия/Hat Ablaufdatum",
                key="new_user_doc_has_expiry"
            )
            date_expiry = None
            if has_expiry:
                date_expiry = st.date_input(
                    "Срок действия до/Gültig bis",
                    value=date.today() + timedelta(days=365),
                    key="new_user_doc_expiry"
                )
            
            # File upload
            uploaded_file = st.file_uploader(
                "Файл документа/Dokumentdatei",
                type=['pdf', 'jpg', 'jpeg', 'png'],
                key="new_user_doc_file"
            )
        
        # Note
        note = st.text_area(
            "Комментарий/Kommentar",
            placeholder="Дополнительная информация о документе...",
            key="new_user_doc_note"
        )
        
        # Submit button
        submitted = st.form_submit_button("💾 Сохранить/Speichern")
        
        if submitted:
            if user_id and document_type and title:
                try:
                    file_url = None
                    if uploaded_file:
                        file_url = upload_file(uploaded_file, 'user_documents')
                    
                    # Get current user ID for uploaded_by
                    current_user = execute_query("SELECT id FROM users LIMIT 1")
                    uploaded_by = current_user[0][0] if current_user else None
                    
                    execute_query("""
                        INSERT INTO user_documents 
                        (user_id, document_type, title, date_issued, date_expiry, file_url, note, uploaded_by)
                        VALUES (:user_id, :document_type, :title, :date_issued, :date_expiry, :file_url, :note, :uploaded_by)
                    """, {
                        'user_id': user_id,
                        'document_type': document_type,
                        'title': title,
                        'date_issued': date_issued,
                        'date_expiry': date_expiry,
                        'file_url': file_url,
                        'note': note if note else None,
                        'uploaded_by': uploaded_by
                    })
                    
                    st.success("Документ успешно добавлен/Dokument erfolgreich hinzugefügt")
                    st.rerun()
                except Exception as e:
                    st.error(f"Ошибка сохранения/Speicherfehler: {str(e)}")
            else:
                st.error("Заполните обязательные поля/Füllen Sie die Pflichtfelder aus")

def show_edit_user_document_form(doc, language='ru'):
    """Show form to edit user document"""
    st.subheader(f"✏️ Редактировать: {doc[2]}")
    
    with st.form(f"edit_user_document_form_{doc[0]}"):
        col1, col2 = st.columns(2)
        
        with col1:
            # User selection
            users = execute_query("SELECT id, first_name || ' ' || last_name as full_name FROM users ORDER BY first_name")
            if not users or not isinstance(users, list) or len(users) == 0:
                st.warning("Пользователи не найдены / Keine Benutzer gefunden")
                return
            
            # Find current user
            current_user_index = 0
            for i, user in enumerate(users):
                if doc[7].strip() == user[1].strip():  # Match by full name
                    current_user_index = i
                    break
            
            user_id = st.selectbox(
                "Пользователь/Benutzer",
                options=[u[0] for u in users],
                format_func=lambda x: next((u[1] for u in users if u[0] == x), x),
                index=current_user_index,
                key=f"edit_user_doc_user_{doc[0]}"
            )
            
            # Document type
            doc_types = get_user_document_types(language)
            type_index = list(doc_types.keys()).index(doc[1]) if doc[1] in doc_types else 0
            document_type = st.selectbox(
                "Тип документа/Dokumenttyp",
                options=list(doc_types.keys()),
                format_func=lambda x: doc_types[x],
                index=type_index,
                key=f"edit_user_doc_type_{doc[0]}"
            )
            
            # Title
            title = st.text_input(
                "Название/Titel",
                value=doc[2] or '',
                key=f"edit_user_doc_title_{doc[0]}"
            )
        
        with col2:
            # Issue date
            date_issued = st.date_input(
                "Дата выдачи/Ausstellungsdatum",
                value=doc[3] if doc[3] else date.today(),
                key=f"edit_user_doc_issued_{doc[0]}"
            )
            
            # Expiry date
            has_expiry = st.checkbox(
                "Есть срок действия/Hat Ablaufdatum",
                value=bool(doc[4]),
                key=f"edit_user_doc_has_expiry_{doc[0]}"
            )
            date_expiry = None
            if has_expiry:
                date_expiry = st.date_input(
                    "Срок действия до/Gültig bis",
                    value=doc[4] if doc[4] else date.today() + timedelta(days=365),
                    key=f"edit_user_doc_expiry_{doc[0]}"
                )
            
            # Show current file
            if doc[5]:
                st.write(f"Текущий файл/Aktuelle Datei: {doc[5].split('/')[-1]}")
            
            # File upload
            uploaded_file = st.file_uploader(
                "Новый файл/Neue Datei",
                type=['pdf', 'jpg', 'jpeg', 'png'],
                key=f"edit_user_doc_file_{doc[0]}"
            )
        
        # Note
        note = st.text_area(
            "Комментарий/Kommentar",
            value=doc[6] or '',
            key=f"edit_user_doc_note_{doc[0]}"
        )
        
        col_save, col_cancel = st.columns(2)
        
        with col_save:
            submitted = st.form_submit_button("💾 Сохранить/Speichern")
        
        with col_cancel:
            cancelled = st.form_submit_button("❌ Отмена/Abbrechen")
        
        if submitted:
            if user_id:
                try:
                    file_url = doc[5]  # Keep existing file URL
                    if uploaded_file:
                        file_url = upload_file(uploaded_file, 'user_documents')
                    
                    execute_query("""
                        UPDATE user_documents 
                        SET user_id = :user_id, document_type = :document_type, title = :title,
                            date_issued = :date_issued, date_expiry = :date_expiry, file_url = :file_url, note = :note
                        WHERE id = :id
                    """, {
                        'id': doc[0],
                        'user_id': user_id,
                        'document_type': document_type,
                        'title': title,
                        'date_issued': date_issued,
                        'date_expiry': date_expiry,
                        'file_url': file_url,
                        'note': note if note else None
                    })
                    if f"edit_user_doc_{doc[0]}" in st.session_state:
                        del st.session_state[f"edit_user_doc_{doc[0]}"]
                    st.success("Документ обновлен/Dokument aktualisiert")
                    st.rerun()
                except Exception as e:
                    st.error(f"Ошибка сохранения/Speicherfehler: {str(e)}")
            else:
                st.error("Выберите пользователя / Wählen Sie einen Benutzer")
        
        if cancelled:
            if f"edit_user_doc_{doc[0]}" in st.session_state:
                del st.session_state[f"edit_user_doc_{doc[0]}"]
            st.rerun()

def show_expiring_user_documents(language='ru'):
    """Show user documents expiring soon"""
    st.subheader("⚠️ Документы с истекающим сроком/Ablaufende Benutzerdokumente")
    
    try:
        # Get documents expiring in next 60 days
        query = """
            SELECT 
                ud.id,
                ud.document_type,
                ud.title,
                ud.date_expiry,
                u.first_name || ' ' || u.last_name as user_name,
                CASE 
                    WHEN ud.date_expiry < CURRENT_DATE THEN 'expired'
                    WHEN ud.date_expiry <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
                    WHEN ud.date_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
                    ELSE 'notice'
                END as urgency,
                ud.date_expiry - CURRENT_DATE as days_left
            FROM user_documents ud
            JOIN users u ON ud.user_id = u.id
            WHERE ud.is_active = true 
            AND ud.date_expiry IS NOT NULL
            AND ud.date_expiry <= CURRENT_DATE + INTERVAL '60 days'
            ORDER BY ud.date_expiry ASC
        """
        
        expiring_docs = execute_query(query)
        
        if expiring_docs and isinstance(expiring_docs, list) and len(expiring_docs) > 0:
            doc_types = get_user_document_types(language)
            
            for doc in expiring_docs:
                urgency_colors = {
                    'expired': '🔴',
                    'critical': '🟠', 
                    'warning': '🟡',
                    'notice': '🔵'
                }
                
                urgency_text = {
                    'expired': 'ПРОСРОЧЕН/ABGELAUFEN',
                    'critical': 'КРИТИЧНО/KRITISCH',
                    'warning': 'ВНИМАНИЕ/WARNUNG',
                    'notice': 'УВЕДОМЛЕНИЕ/HINWEIS'
                }
                
                with st.container():
                    col1, col2, col3 = st.columns([3, 2, 1])
                    
                    with col1:
                        st.write(f"**{doc[2]}**")
                        st.write(f"📋 {doc_types.get(doc[1], doc[1])}")
                        st.write(f"👤 {doc[4]}")
                    
                    with col2:
                        st.write(f"📅 Истекает/Läuft ab: {doc[3].strftime('%d.%m.%Y')}")
                        if doc[6] is not None:
                            if doc[6] < 0:
                                st.write(f"⏰ Просрочен на {abs(doc[6])} дней")
                            else:
                                st.write(f"⏰ Осталось дней: {doc[6]}")
                    
                    with col3:
                        st.write(f"{urgency_colors[doc[5]]} {urgency_text[doc[5]]}")
                    
                    st.divider()
        else:
            st.info("Истекающих документов не найдено/Keine ablaufenden Dokumente gefunden")
    
    except Exception as e:
        st.error(f"Ошибка загрузки данных/Fehler beim Laden der Daten: {str(e)}")

def delete_user_document(doc_id, language='ru'):
    """Delete user document"""
    try:
        execute_query("UPDATE user_documents SET is_active = false WHERE id = :id", {'id': doc_id})
        st.success("Документ удален/Dokument gelöscht")
        st.rerun()
    except Exception as e:
        st.error(f"Ошибка удаления/Löschfehler: {str(e)}")

def show_user_file_viewer(file_url, title, language='ru'):
    """Show user file viewer in full width"""
    if file_url:
        st.header(f"📎 {title}")
        
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
                st.success("📄 **PDF-Dokument bereit zur Ansicht**")
                
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
                            mime=get_mime_type(file_extension),
                            use_container_width=True
                        )
                        
                        # File info
                        file_size = len(file_data)
                        if file_size < 1024:
                            size_str = f"{file_size} байт"
                        elif file_size < 1024*1024:
                            size_str = f"{file_size//1024} КБ"
                        else:
                            size_str = f"{file_size//(1024*1024)} МБ"
                        
                        st.metric("Размер файла", size_str)
                        
                    else:
                        st.error("🚫 Файл не найден")
                        st.error("🚫 Datei nicht gefunden")
                else:
                    # External URL
                    st.link_button(
                        "🔗 **Открыть**\n**Öffnen**",
                        file_url,
                        use_container_width=True
                    )
            except Exception as e:
                st.error("❌ Ошибка доступа")
                st.error("❌ Dateizugriffsfehler")

def get_mime_type(file_extension):
    """Get MIME type for file extension"""
    mime_types = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif'
    }
    return mime_types.get(file_extension.lower(), 'application/octet-stream')

def export_user_documents_data(language='ru'):
    """Export user documents data to CSV"""
    try:
        query = """
            SELECT 
                u.first_name || ' ' || u.last_name as user_name,
                ud.document_type,
                ud.title,
                ud.date_issued,
                ud.date_expiry,
                ud.note,
                ub.first_name || ' ' || ub.last_name as uploaded_by,
                ud.uploaded_at
            FROM user_documents ud
            JOIN users u ON ud.user_id = u.id
            LEFT JOIN users ub ON ud.uploaded_by = ub.id
            WHERE ud.is_active = true
            ORDER BY u.first_name, ud.uploaded_at DESC
        """
        
        documents = execute_query(query)
        
        if documents and isinstance(documents, list) and len(documents) > 0:
            doc_types = get_user_document_types(language)
            
            export_data = []
            for doc in documents:
                export_data.append([
                    doc[0],  # user_name
                    doc_types.get(doc[1], doc[1]),  # document_type
                    doc[2],  # title
                    doc[3].strftime('%d.%m.%Y') if doc[3] else '',  # date_issued
                    doc[4].strftime('%d.%m.%Y') if doc[4] else '',  # date_expiry
                    doc[5] or '',  # note
                    doc[6] or '',  # uploaded_by
                    doc[7].strftime('%d.%m.%Y %H:%M') if doc[7] else ''  # uploaded_at
                ])
            
            # Create DataFrame
            df = pd.DataFrame(export_data, columns=[
                'Пользователь/Benutzer',
                'Тип документа/Dokumenttyp', 
                'Название/Titel',
                'Дата выдачи/Ausstellungsdatum',
                'Действует до/Gültig bis',
                'Комментарий/Kommentar',
                'Загрузил/Hochgeladen von',
                'Дата загрузки/Upload-Datum'
            ])
            
            # Export to CSV
            csv_data = export_to_csv(df, f"user_documents_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            
            st.download_button(
                label="📥 Скачать CSV/CSV herunterladen",
                data=csv_data,
                file_name=f"user_documents_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )
            
            st.success(f"Экспортировано {len(documents)} документов/Exportiert {len(documents)} Dokumente")
        else:
            st.warning("Нет данных для экспорта/Keine Daten zum Exportieren")
    
    except Exception as e:
        st.error(f"Ошибка экспорта/Export-Fehler: {str(e)}")
