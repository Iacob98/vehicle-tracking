import streamlit as st
import uuid
from datetime import date, timedelta
from database import execute_query
from translations import get_text
from utils import upload_file, display_file

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

def get_documents_with_sort(sort_by='document_type', sort_direction='asc', type_filter='all', vehicle_filter='all', search_term=''):
    """Get vehicle documents with custom sorting and filtering"""
    # Build WHERE clause
    where_clause = "WHERE vd.is_active = true"
    params = {}
    
    if type_filter != 'all':
        where_clause += " AND vd.document_type = :type_filter"
        params['type_filter'] = type_filter
    
    if vehicle_filter != 'all':
        where_clause += " AND vd.vehicle_id = :vehicle_filter"
        params['vehicle_filter'] = vehicle_filter
    
    if search_term:
        where_clause += " AND vd.title ILIKE :search_term"
        params['search_term'] = f"%{search_term}%"
    
    # Always sort by document type first for grouping, then by expiry date
    order_clause = "ORDER BY vd.document_type ASC, vd.date_expiry ASC NULLS LAST, v.name ASC"
    
    query = f"""
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
        {where_clause}
        {order_clause}
        LIMIT 100
    """
    
    return execute_query(query, params)

def get_document_types():
    """Get document type translations"""
    return {
        'insurance': 'Страховка / Versicherung',
        'inspection': 'Техосмотр / TÜV',
        'registration': 'Свидетельство о регистрации / Zulassungsbescheinigung',
        'other': 'Другое / Sonstiges'
    }

def show_documents_list():
    """Show list of documents with inline editing and sorting"""
    try:
        # Check if we're editing a document
        edit_document_id = st.session_state.get('edit_document_id', None)
        
        if edit_document_id:
            show_edit_document_form(edit_document_id)
            return
        
        # Check if any document is being viewed
        view_document_id = None
        for key in st.session_state:
            if key.startswith("view_document_") and st.session_state[key]:
                view_document_id = key.replace("view_document_", "")
                break
        
        if view_document_id:
            show_document_viewer(view_document_id)
            return
        
        # Filtering controls - simplified layout
        col1, col2, col3 = st.columns([2, 2, 1])
        
        with col1:
            # Vehicle filter
            vehicles = execute_query("SELECT id, name, license_plate FROM vehicles ORDER BY name")
            vehicle_options = ['all'] + [v[0] for v in vehicles] if vehicles else ['all']
            
            vehicle_filter = st.selectbox(
                "Автомобили",
                options=vehicle_options,
                format_func=lambda x: 'Все автомобили/Alle Fahrzeuge' if x == 'all' else next((f"{v[1]} ({v[2]})" for v in vehicles if v[0] == x), x),
                key="doc_vehicle_filter"
            )
        
        with col2:
            doc_types = get_document_types()
            type_filter = st.selectbox(
                "Тип документа/Dokumenttyp",
                options=['all'] + list(doc_types.keys()),
                format_func=lambda x: 'Все типы/Alle Typen' if x == 'all' else doc_types.get(x, x),
                key="doc_type_filter"
            )
        
        with col3:
            # Search functionality
            search_term = st.text_input(
                "🔍 Поиск/Suche",
                placeholder="Название документа...",
                key="doc_search"
            )
        
        # Always sort by document type first for grouping, then by expiry date
        sort_by = 'document_type'
        sort_direction = 'asc'
        
        st.divider()
        
        documents = get_documents_with_sort(sort_by, sort_direction, type_filter, vehicle_filter, search_term)
        
        if documents:
            # Statistics
            total_docs = len(documents)
            expired = len([d for d in documents if d[8] == 'expired'])
            expiring = len([d for d in documents if d[8] == 'expiring'])
            
            # Show selected vehicle info if filtered
            if vehicle_filter != 'all':
                selected_vehicle = next((f"{v[1]} ({v[2]})" for v in vehicles if v[0] == vehicle_filter), "")
                st.info(f"🚗 Документы для автомобиля: **{selected_vehicle}**")
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Всего документов/Dokumente gesamt", total_docs)
            with col2:
                st.metric("🔴 Просрочены/Abgelaufen", expired)
            with col3:
                st.metric("⚠️ Истекают/Laufen ab", expiring)
            
            st.divider()
            
            # Group documents by type
            doc_types = get_document_types()
            grouped_docs = {}
            
            for doc in documents:
                doc_type = doc[1]  # document_type
                if doc_type not in grouped_docs:
                    grouped_docs[doc_type] = []
                grouped_docs[doc_type].append(doc)
            
            # Display grouped documents
            for doc_type, type_documents in grouped_docs.items():
                type_name = doc_types.get(doc_type, doc_type)
                
                st.subheader(f"📁 {type_name}")
                
                for doc in type_documents:
                    with st.container():
                        # Document card layout
                        col1, col2, col3 = st.columns([4, 3, 1])
                        
                        with col1:
                            # Status icon and title
                            status_icon = '🔴' if doc[8] == 'expired' else '⚠️' if doc[8] == 'expiring' else '✅'
                            st.write(f"**{doc[2]}**")
                            
                            # Vehicle info
                            st.write(f"🚗 {doc[6]} ({doc[7]})")
                            
                            # Description
                            if doc_type == 'insurance':
                                st.write("📄 Страховка автомобиля")
                            elif doc_type == 'inspection':
                                st.write("🔧 Техосмотр автомобиля")
                            elif doc_type == 'registration':
                                st.write("📋 Свидетельство о регистрации")
                            else:
                                st.write("📄 Документ автомобиля")
                        
                        with col2:
                            # Status and dates
                            status_text = 'Действителен/Gültig' if doc[8] == 'valid' else 'Истекает/Läuft ab' if doc[8] == 'expiring' else 'Просрочен/Abgelaufen'
                            status_color = 'green' if doc[8] == 'valid' else 'orange' if doc[8] == 'expiring' else 'red'
                            
                            st.markdown(f":{status_color}[{status_icon} {status_text}]")
                            
                            issued_date = doc[3].strftime('%d.%m.%Y') if doc[3] else ''
                            st.write(f"🟦 Выдан/Ausgestellt: {issued_date}")
                            
                            if doc[4]:
                                expiry_date = doc[4].strftime('%d.%m.%Y')
                                st.write(f"🟦 Действует до/Gültig bis: {expiry_date}")
                            
                            # File info
                            if doc[5]:
                                file_ext = doc[5].split('.')[-1].upper() if '.' in doc[5] else ''
                                st.write(f"📄 {file_ext} документ/{file_ext}-Dokument")
                                file_name = doc[5].split('/')[-1] if '/' in doc[5] else doc[5]
                                st.caption(f"📎 {file_name}")
                            
                            # User info
                            st.write("👤 Иван Иванов")  # Placeholder for uploaded_by
                        
                        with col3:
                            # Action buttons
                            st.write("")  # Spacing
                            
                            if doc[5]:  # Has file
                                if st.button("👁️", key=f"view_{doc[0]}", help="Просмотр"):
                                    st.session_state[f"view_document_{doc[0]}"] = True
                                    st.rerun()
                            
                            if st.button("✏️", key=f"edit_{doc[0]}", help="Редактировать"):
                                st.session_state.edit_document_id = doc[0]
                                st.rerun()
                            
                            if st.button("🗑️", key=f"delete_{doc[0]}", help="Удалить"):
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

def show_edit_document_form(document_id):
    """Show form to edit existing document"""
    try:
        # Get current document data
        document_data = execute_query("""
            SELECT vd.vehicle_id, vd.document_type, vd.title, vd.date_issued, vd.date_expiry, 
                   vd.file_url, vd.note, v.name as vehicle_name, v.license_plate
            FROM vehicle_documents vd
            JOIN vehicles v ON vd.vehicle_id = v.id
            WHERE vd.id = :id AND vd.is_active = true
        """, {'id': document_id})
        
        if not document_data:
            st.error("Документ не найден")
            if st.button("⬅️ Назад к списку"):
                del st.session_state.edit_document_id
                st.rerun()
            return
        
        current_doc = document_data[0]
        
        st.subheader("✏️ Редактировать документ / Dokument bearbeiten")
        
        if st.button("⬅️ Назад к списку / Zurück zur Liste"):
            del st.session_state.edit_document_id
            st.rerun()
        
        with st.form("edit_document"):
            col1, col2 = st.columns(2)
            
            with col1:
                # Vehicle selection
                vehicles = execute_query("SELECT id, name, license_plate FROM vehicles ORDER BY name")
                if not vehicles:
                    st.warning("Необходимо создать автомобили")
                    return
                
                current_vehicle_index = 0
                if current_doc[0]:
                    try:
                        current_vehicle_index = [v[0] for v in vehicles].index(current_doc[0])
                    except ValueError:
                        current_vehicle_index = 0
                
                vehicle_id = st.selectbox(
                    get_text('vehicles', language),
                    options=[v[0] for v in vehicles],
                    format_func=lambda x: next((f"{v[1]} ({v[2]})" for v in vehicles if v[0] == x), x),
                    index=current_vehicle_index
                )
                
                doc_types = get_document_types()
                current_type_index = 0
                if current_doc[1] in doc_types:
                    current_type_index = list(doc_types.keys()).index(current_doc[1])
                
                document_type = st.selectbox(
                    "Тип документа/Dokumenttyp",
                    options=list(doc_types.keys()),
                    format_func=lambda x: doc_types[x],
                    index=current_type_index
                )
                
                title = st.text_input(
                    "Название/Titel",
                    value=current_doc[2] or ""
                )
            
            with col2:
                date_issued = st.date_input(
                    "Дата выдачи/Ausstellungsdatum",
                    value=current_doc[3] if current_doc[3] else date.today()
                )
                
                has_expiry = st.checkbox(
                    "Есть срок действия/Hat Ablaufdatum", 
                    value=current_doc[4] is not None
                )
                date_expiry = None
                if has_expiry:
                    date_expiry = st.date_input(
                        "Действует до/Gültig bis",
                        value=current_doc[4] if current_doc[4] else date.today() + timedelta(days=365)
                    )
                
                # File upload
                if current_doc[5]:
                    st.info(f"Текущий файл: {current_doc[5].split('/')[-1]}")
                
                uploaded_file = st.file_uploader(
                    "Новый файл/Neue Datei",
                    type=['pdf', 'jpg', 'jpeg', 'png']
                )
            
            note = st.text_area(
                "Комментарий/Kommentar",
                value=current_doc[6] or ""
            )
            
            col_save, col_cancel = st.columns(2)
            with col_save:
                if st.form_submit_button("💾 Сохранить / Speichern", type="primary"):
                    if title:
                        try:
                            file_url = current_doc[5]  # Keep existing file
                            if uploaded_file:
                                file_url = upload_file(uploaded_file, 'documents')
                            
                            execute_query("""
                                UPDATE vehicle_documents 
                                SET vehicle_id = :vehicle_id, document_type = :document_type, 
                                    title = :title, date_issued = :date_issued, date_expiry = :date_expiry,
                                    file_url = :file_url, note = :note
                                WHERE id = :id
                            """, {
                                'id': document_id,
                                'vehicle_id': vehicle_id,
                                'document_type': document_type,
                                'title': title,
                                'date_issued': date_issued,
                                'date_expiry': date_expiry,
                                'file_url': file_url,
                                'note': note if note else None
                            })
                            st.success("Документ обновлен / Dokument aktualisiert")
                            get_documents_cached.clear()  # Clear cache
                            del st.session_state.edit_document_id
                            st.rerun()
                        except Exception as e:
                            st.error(f"Ошибка обновления: {str(e)}")
                    else:
                        st.error("Название обязательно / Titel ist erforderlich")
            
            with col_cancel:
                if st.form_submit_button("❌ Отмена / Abbrechen"):
                    del st.session_state.edit_document_id
                    st.rerun()
                    
    except Exception as e:
        st.error(f"Ошибка загрузки данных: {str(e)}")
        if st.button("⬅️ Назад к списку"):
            if 'edit_document_id' in st.session_state:
                del st.session_state.edit_document_id
            st.rerun()

def show_document_viewer(document_id):
    """Show document file viewer"""
    try:
        # Get document data
        document_data = execute_query("""
            SELECT vd.title, vd.file_url, v.name as vehicle_name, v.license_plate,
                   vd.document_type
            FROM vehicle_documents vd
            JOIN vehicles v ON vd.vehicle_id = v.id
            WHERE vd.id = :id AND vd.is_active = true
        """, {'id': document_id})
        
        if not document_data or not document_data[0][1]:  # No file
            st.error("Файл документа не найден")
            if st.button("⬅️ Назад к списку"):
                # Clear all view states
                for key in list(st.session_state.keys()):
                    if key.startswith("view_document_"):
                        del st.session_state[key]
                st.rerun()
            return
        
        doc = document_data[0]
        file_url = doc[1]
        doc_types = get_document_types()
        
        st.subheader(f"📄 {doc[0]}")
        st.write(f"🚗 {doc[2]} ({doc[3]})")
        st.write(f"📁 {doc_types.get(doc[4], doc[4])}")
        
        if st.button("⬅️ Назад к списку / Zurück zur Liste"):
            # Clear all view states
            for key in list(st.session_state.keys()):
                if key.startswith("view_document_"):
                    del st.session_state[key]
            st.rerun()
        
        st.divider()
        
        # Display file using new system
        file_path = file_url.lstrip('/') if file_url.startswith('/') else file_url
        success = display_file(file_path, doc[0])
        
        if not success:
            st.error("❌ Не удалось отобразить файл")
            st.write(f"Путь к файлу: {file_path}")
            
            # Try alternative display methods
            import os
            if os.path.exists(file_path):
                st.info("✅ Файл существует на диске")
                try:
                    file_size = os.path.getsize(file_path)
                    st.write(f"Размер файла: {file_size} байт")
                except Exception as e:
                    st.write(f"Ошибка получения размера: {str(e)}")
            else:
                st.error("❌ Файл не найден на диске")
                
            # Fallback download button
            try:
                if os.path.exists(file_path):
                    with open(file_path, "rb") as f:
                        st.download_button(
                            label="📥 Скачать файл",
                            data=f.read(),
                            file_name=os.path.basename(file_path)
                        )
            except Exception as e:
                st.error(f"Ошибка скачивания: {str(e)}")
            
    except Exception as e:
        st.error(f"Ошибка просмотра документа: {str(e)}")
        if st.button("⬅️ Назад к списку"):
            for key in list(st.session_state.keys()):
                if key.startswith("view_document_"):
                    del st.session_state[key]
            st.rerun()

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