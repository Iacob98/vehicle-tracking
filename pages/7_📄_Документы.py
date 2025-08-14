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

def get_documents_with_sort(sort_by='date_expiry', sort_direction='desc', type_filter='all', vehicle_filter='all'):
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
    
    # Build ORDER BY clause
    sort_mapping = {
        'date_expiry': 'vd.date_expiry',
        'title': 'vd.title',
        'vehicle_name': 'v.name',
        'document_type': 'vd.document_type'
    }
    
    order_col = sort_mapping.get(sort_by, 'vd.date_expiry')
    order_direction = 'DESC' if sort_direction == 'desc' else 'ASC'
    
    # Handle NULL values and secondary sort
    if sort_by == 'date_expiry':
        order_clause = f"ORDER BY {order_col} {order_direction} NULLS LAST, v.name ASC"
    elif sort_by == 'vehicle_name':
        order_clause = f"ORDER BY v.name {order_direction}, vd.document_type ASC"
    elif sort_by == 'document_type':
        order_clause = f"ORDER BY vd.document_type {order_direction}, v.name ASC"
    else:
        order_clause = f"ORDER BY {order_col} {order_direction}, v.name ASC"
    
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
        
        # Sorting and filtering controls
        col1, col2, col3, col4 = st.columns([2, 1, 1, 2])
        
        with col1:
            sort_options = {
                'date_expiry': 'По сроку действия / Nach Ablaufdatum',
                'title': 'По названию / Nach Titel',
                'vehicle_name': '🚗 По автомобилю / Nach Fahrzeug',
                'document_type': '📁 По типу документа / Nach Dokumenttyp'
            }
            sort_by = st.selectbox(
                "Сортировать по / Sortieren nach",
                options=list(sort_options.keys()),
                format_func=lambda x: sort_options[x],
                key="doc_sort_by",
                index=2  # Default to sort by vehicle
            )
        
        with col2:
            sort_direction = st.selectbox(
                "Направление / Richtung",
                options=['asc', 'desc'],
                format_func=lambda x: '⬆️ По возрастанию / Aufsteigend' if x == 'asc' else '⬇️ По убыванию / Absteigend',
                index=0,  # Default to asc for better vehicle/type sorting
                key="doc_sort_dir"
            )
        
        with col3:
            doc_types = get_document_types()
            type_filter = st.selectbox(
                "Фильтр по типу / Nach Typ filtern",
                options=['all'] + list(doc_types.keys()),
                format_func=lambda x: 'Все типы / Alle Typen' if x == 'all' else doc_types.get(x, x),
                key="doc_type_filter"
            )
        
        with col4:
            # Vehicle filter
            vehicles = execute_query("SELECT id, name, license_plate FROM vehicles ORDER BY name")
            vehicle_options = ['all'] + [v[0] for v in vehicles] if vehicles else ['all']
            
            vehicle_filter = st.selectbox(
                "🚗 Фильтр по автомобилю / Nach Fahrzeug filtern",
                options=vehicle_options,
                format_func=lambda x: 'Все автомобили / Alle Fahrzeuge' if x == 'all' else next((f"{v[1]} ({v[2]})" for v in vehicles if v[0] == x), x),
                key="doc_vehicle_filter"
            )
        
        st.divider()
        
        documents = get_documents_with_sort(sort_by, sort_direction, type_filter, vehicle_filter)
        
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
            
            # Display documents with grouping
            current_group = None
            doc_types = get_document_types()
            
            for doc in documents:
                # Show group header for vehicle or type sorting
                if sort_by == 'vehicle_name':
                    group_key = f"{doc[6]} ({doc[7]})"
                    if current_group != group_key:
                        current_group = group_key
                        st.subheader(f"🚗 {group_key}")
                        
                elif sort_by == 'document_type':
                    group_key = doc_types.get(doc[1], doc[1])
                    if current_group != group_key:
                        current_group = group_key
                        st.subheader(f"📁 {group_key}")
                
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        # Status icon based on expiry
                        status_icon = '🔴' if doc[8] == 'expired' else '⚠️' if doc[8] == 'expiring' else '✅'
                        st.write(f"{status_icon} **{doc[2]}**")
                        
                        # Show vehicle info only if not sorting by vehicle
                        if sort_by != 'vehicle_name':
                            st.write(f"🚗 {doc[6]} ({doc[7]})")
                        
                        # Show document type only if not sorting by type
                        if sort_by != 'document_type':
                            st.write(f"📁 {doc_types.get(doc[1], doc[1])}")
                    
                    with col2:
                        issued_date = doc[3].strftime('%d.%m.%Y') if doc[3] else ''
                        st.write(f"Выдан/Ausgestellt: {issued_date}")
                        if doc[4]:
                            expiry_date = doc[4].strftime('%d.%m.%Y')
                            st.write(f"Действует до/Gültig bis: {expiry_date}")
                    
                    with col3:
                        if doc[5]:
                            st.write("📎 Файл есть/Datei vorhanden")
                            if st.button("👁️", key=f"view_doc_btn_{doc[0]}", help="Просмотреть файл"):
                                st.session_state[f"view_document_{doc[0]}"] = True
                                st.rerun()
                        else:
                            st.write("📎 Нет файла/Keine Datei")
                    
                    with col4:
                        col_edit, col_delete = st.columns(2)
                        with col_edit:
                            if st.button("✏️", key=f"edit_doc_{doc[0]}", help="Редактировать"):
                                st.session_state.edit_document_id = doc[0]
                                st.rerun()
                        with col_delete:
                            if st.button("🗑️", key=f"delete_doc_{doc[0]}", help="Удалить"):
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
        
        # Display file
        file_ext = file_url.split('.')[-1].lower() if '.' in file_url else ''
        
        if file_ext in ['jpg', 'jpeg', 'png', 'gif']:
            # Display image
            try:
                st.image(file_url, use_container_width=True, caption=doc[0])
            except Exception as e:
                st.error("❌ Ошибка загрузки изображения")
                st.write(f"🔗 [Скачать файл]({file_url})")
        elif file_ext == 'pdf':
            # Display PDF link and info
            st.info("📄 PDF документ")
            st.markdown(f"🔗 [Открыть PDF в новом окне]({file_url})")
            st.markdown(f"🔗 [Скачать PDF]({file_url})")
        else:
            # Other file types
            st.info(f"📎 Файл: {file_url.split('/')[-1]}")
            st.markdown(f"🔗 [Скачать файл]({file_url})")
            
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