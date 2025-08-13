import streamlit as st
import uuid
from datetime import date, datetime, timedelta
from database import execute_query
from translations import get_text
from utils import format_currency, export_to_csv, upload_file

def show_documents_page(language='ru'):
    """Main documents management page"""
    st.title(f"📄 {get_text('documents', language)}")
    
    tab1, tab2, tab3 = st.tabs([
        get_text('documents', language),
        get_text('add', language),
        get_text('expiring_soon', language)
    ])
    
    with tab1:
        show_documents_list(language)
    
    with tab2:
        show_add_document_form(language)
    
    with tab3:
        show_expiring_documents(language)

def show_documents_list(language='ru'):
    """Display list of vehicle documents"""
    try:
        # Filters
        col1, col2, col3 = st.columns(3)
        with col1:
            vehicles = get_vehicles_for_select(language)
            vehicle_options = ['all']
            if vehicles and isinstance(vehicles, list):
                vehicle_options.extend([v[0] for v in vehicles])
            
            vehicle_filter = st.selectbox(
                get_text('vehicles', language),
                options=vehicle_options,
                format_func=lambda x: 'Все автомобили/Alle Fahrzeuge' if x == 'all' else (
                    next((v[1] for v in vehicles if vehicles and v[0] == x), x) if vehicles else x
                )
            )
        
        with col2:
            doc_types = get_document_types(language)
            type_filter = st.selectbox(
                "Тип документа/Dokumenttyp",
                options=['all'] + list(doc_types.keys()),
                format_func=lambda x: 'Все типы/Alle Typen' if x == 'all' else doc_types.get(x, x)
            )
        
        with col3:
            search_term = st.text_input("🔍 Поиск/Suche")
        
        # Build query
        query = """
            SELECT 
                vd.id,
                vd.document_type,
                vd.title,
                vd.date_issued,
                vd.date_expiry,
                vd.file_url,
                vd.note,
                vd.uploaded_at,
                v.name as vehicle_name,
                v.license_plate,
                CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name,
                CASE 
                    WHEN vd.date_expiry IS NOT NULL AND vd.date_expiry < CURRENT_DATE THEN 'expired'
                    WHEN vd.date_expiry IS NOT NULL AND vd.date_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
                    ELSE 'valid'
                END as status
            FROM vehicle_documents vd
            JOIN vehicles v ON vd.vehicle_id = v.id
            LEFT JOIN users u ON vd.uploaded_by = u.id
            WHERE vd.is_active = true
        """
        params = {}
        
        if vehicle_filter != 'all':
            query += " AND vd.vehicle_id = :vehicle_id"
            params['vehicle_id'] = vehicle_filter
        
        if type_filter != 'all':
            query += " AND vd.document_type = :doc_type"
            params['doc_type'] = type_filter
        
        if search_term:
            query += " AND (vd.title ILIKE :search OR v.name ILIKE :search OR v.license_plate ILIKE :search)"
            params['search'] = f"%{search_term}%"
        
        query += " ORDER BY vd.date_expiry ASC NULLS LAST, vd.uploaded_at DESC"
        
        documents = execute_query(query, params)
        
        if documents and isinstance(documents, list) and len(documents) > 0:
            # Statistics
            total_docs = len(documents)
            expired = len([d for d in documents if d[11] == 'expired'])
            expiring = len([d for d in documents if d[11] == 'expiring'])
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Всего документов/Dokumente gesamt", total_docs)
            with col2:
                st.metric("🔴 Просрочены/Abgelaufen", expired)
            with col3:
                st.metric("🟡 Истекают/Laufen ab", expiring)
            with col4:
                if st.button("📊 Экспорт/Export"):
                    export_documents_data(documents, language)
            
            st.divider()
            
            # Display documents
            for doc in documents:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        doc_types = get_document_types(language)
                        st.write(f"**{doc[2]}**")
                        st.write(f"📋 {doc_types.get(doc[1], doc[1])}")
                        st.write(f"🚗 {doc[8]} ({doc[9]})")
                    
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
                            'valid': '🟢 Действителен/Gültig'
                        }
                        st.write(status_icons.get(doc[11], '⚪'))
                        
                        if doc[5]:  # file_url
                            st.write("📎 Файл есть/Datei vorhanden")
                        
                        if doc[10]:  # uploaded_by_name
                            st.write(f"👤 {doc[10]}")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_btn_doc_{doc[0]}"):
                            st.session_state[f"edit_doc_{doc[0]}"] = True
                        if st.button(f"🗑️", key=f"delete_doc_{doc[0]}"):
                            delete_document(doc[0], language)
                        if doc[5] and st.button(f"📎", key=f"view_doc_{doc[0]}"):
                            show_file_viewer(doc[5], doc[2], language)
                    
                    # Show edit form if requested
                    if st.session_state.get(f"edit_doc_{doc[0]}", False):
                        show_edit_document_form(doc, language)
                    
                    if doc[6]:  # note
                        st.write(f"📝 {doc[6]}")
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading documents: {str(e)}")

def show_add_document_form(language='ru'):
    """Show form to add new document"""
    st.subheader(f"{get_text('add', language)} документ/Dokument")
    
    with st.form("add_document_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            # Vehicle selection
            vehicles = get_vehicles_for_select(language)
            if not vehicles or not isinstance(vehicles, list) or len(vehicles) == 0:
                st.warning("Необходимо создать автомобили / Fahrzeuge müssen erstellt werden")
                return
            
            vehicle_id = st.selectbox(
                get_text('vehicles', language),
                options=[v[0] for v in vehicles],
                format_func=lambda x: next((v[1] for v in vehicles if v[0] == x), x),
                key="new_doc_vehicle"
            )
            
            # Document type
            doc_types = get_document_types(language)
            document_type = st.selectbox(
                "Тип документа/Dokumenttyp",
                options=list(doc_types.keys()),
                format_func=lambda x: doc_types[x],
                key="new_doc_type"
            )
            
            title = st.text_input(
                "Название/Titel",
                value=doc_types.get(document_type, ''),
                key="new_doc_title"
            )
        
        with col2:
            date_issued = st.date_input(
                "Дата выдачи/Ausstellungsdatum",
                value=date.today(),
                key="new_doc_issued"
            )
            
            has_expiry = st.checkbox("Есть срок действия/Hat Ablaufdatum")
            date_expiry = None
            if has_expiry:
                date_expiry = st.date_input(
                    "Срок действия до/Gültig bis",
                    value=date.today() + timedelta(days=365),
                    key="new_doc_expiry"
                )
            
            # File upload
            uploaded_file = st.file_uploader(
                "Файл документа/Dokumentdatei",
                type=['pdf', 'jpg', 'jpeg', 'png'],
                key="new_doc_file"
            )
        
        note = st.text_area(
            "Комментарий/Kommentar",
            key="new_doc_note"
        )
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            if not title:
                st.error("Название обязательно / Titel ist erforderlich")
            else:
                try:
                    file_url = None
                    if uploaded_file:
                        file_url = upload_file(uploaded_file, 'documents')
                    
                    # Get current user (simulate for now)
                    current_user_id = get_current_user_id()
                    
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
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")

def show_edit_document_form(doc, language='ru'):
    """Show form to edit document"""
    with st.expander(f"✏️ {get_text('edit', language)}: {doc[2]}", expanded=True):
        with st.form(f"edit_document_form_{doc[0]}"):
            col1, col2 = st.columns(2)
            
            with col1:
                # Vehicle selection
                vehicles = get_vehicles_for_select(language)
                vehicle_id = None
                
                if vehicles and isinstance(vehicles, list) and len(vehicles) > 0:
                    current_vehicle = None
                    for v in vehicles:
                        if doc[8] in v[1]:
                            current_vehicle = v[0]
                            break
                    
                    if not current_vehicle:
                        current_vehicle = vehicles[0][0]
                    
                    try:
                        current_index = [v[0] for v in vehicles].index(current_vehicle)
                    except ValueError:
                        current_index = 0
                    
                    vehicle_id = st.selectbox(
                        get_text('vehicles', language),
                        options=[v[0] for v in vehicles],
                        format_func=lambda x: next((v[1] for v in vehicles if v[0] == x), x),
                        index=current_index,
                        key=f"edit_doc_vehicle_{doc[0]}"
                    )
                else:
                    st.warning("Нет доступных автомобилей / Keine Fahrzeuge verfügbar")
                    return
                
                # Document type
                doc_types = get_document_types(language)
                document_type = st.selectbox(
                    "Тип документа/Dokumenttyp",
                    options=list(doc_types.keys()),
                    index=list(doc_types.keys()).index(doc[1]) if doc[1] in doc_types else 0,
                    format_func=lambda x: doc_types[x],
                    key=f"edit_doc_type_{doc[0]}"
                )
                
                title = st.text_input(
                    "Название/Titel",
                    value=doc[2],
                    key=f"edit_doc_title_{doc[0]}"
                )
            
            with col2:
                date_issued = st.date_input(
                    "Дата выдачи/Ausstellungsdatum",
                    value=doc[3] if doc[3] else date.today(),
                    key=f"edit_doc_issued_{doc[0]}"
                )
                
                has_expiry = st.checkbox(
                    "Есть срок действия/Hat Ablaufdatum",
                    value=bool(doc[4]),
                    key=f"edit_doc_has_expiry_{doc[0]}"
                )
                date_expiry = None
                if has_expiry:
                    date_expiry = st.date_input(
                        "Срок действия до/Gültig bis",
                        value=doc[4] if doc[4] else date.today() + timedelta(days=365),
                        key=f"edit_doc_expiry_{doc[0]}"
                    )
                
                # Show current file
                if doc[5]:
                    st.write(f"Текущий файл/Aktuelle Datei: {doc[5].split('/')[-1]}")
                
                # File upload
                uploaded_file = st.file_uploader(
                    "Новый файл/Neue Datei",
                    type=['pdf', 'jpg', 'jpeg', 'png'],
                    key=f"edit_doc_file_{doc[0]}"
                )
            
            note = st.text_area(
                "Комментарий/Kommentar",
                value=doc[6] or '',
                key=f"edit_doc_note_{doc[0]}"
            )
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                submitted = st.form_submit_button(get_text('save', language))
            
            with col_cancel:
                cancelled = st.form_submit_button(get_text('cancel', language))
            
            if submitted:
                if vehicle_id:
                    try:
                        file_url = doc[5]  # Keep existing file URL
                        if uploaded_file:
                            file_url = upload_file(uploaded_file, 'documents')
                        
                        execute_query("""
                            UPDATE vehicle_documents 
                            SET vehicle_id = :vehicle_id, document_type = :document_type, title = :title,
                                date_issued = :date_issued, date_expiry = :date_expiry, file_url = :file_url, note = :note
                            WHERE id = :id
                        """, {
                            'id': doc[0],
                            'vehicle_id': vehicle_id,
                            'document_type': document_type,
                            'title': title,
                            'date_issued': date_issued,
                            'date_expiry': date_expiry,
                            'file_url': file_url,
                            'note': note if note else None
                        })
                        if f"edit_doc_{doc[0]}" in st.session_state:
                            del st.session_state[f"edit_doc_{doc[0]}"]
                        st.success(get_text('success_save', language))
                        st.rerun()
                    except Exception as e:
                        st.error(f"{get_text('error_save', language)}: {str(e)}")
                else:
                    st.error("Выберите автомобиль / Wählen Sie ein Fahrzeug")
            
            if cancelled:
                if f"edit_doc_{doc[0]}" in st.session_state:
                    del st.session_state[f"edit_doc_{doc[0]}"]
                st.rerun()

def show_expiring_documents(language='ru'):
    """Show documents expiring soon"""
    st.subheader("⚠️ Документы с истекающим сроком/Ablaufende Dokumente")
    
    try:
        # Get documents expiring in next 60 days
        query = """
            SELECT 
                vd.id,
                vd.document_type,
                vd.title,
                vd.date_expiry,
                v.name as vehicle_name,
                v.license_plate,
                CASE 
                    WHEN vd.date_expiry < CURRENT_DATE THEN 'expired'
                    WHEN vd.date_expiry <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
                    WHEN vd.date_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
                    ELSE 'notice'
                END as urgency,
                vd.date_expiry - CURRENT_DATE as days_left
            FROM vehicle_documents vd
            JOIN vehicles v ON vd.vehicle_id = v.id
            WHERE vd.is_active = true 
            AND vd.date_expiry IS NOT NULL
            AND vd.date_expiry <= CURRENT_DATE + INTERVAL '60 days'
            ORDER BY vd.date_expiry ASC
        """
        
        expiring_docs = execute_query(query)
        
        if expiring_docs and isinstance(expiring_docs, list) and len(expiring_docs) > 0:
            doc_types = get_document_types(language)
            
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
                
                color = urgency_colors.get(doc[6], '⚪')
                text = urgency_text.get(doc[6], '')
                days_left = doc[7].days if doc[7] else 0
                
                with st.container():
                    col1, col2, col3 = st.columns([4, 2, 2])
                    
                    with col1:
                        st.write(f"{color} **{doc[2]}**")
                        st.write(f"📋 {doc_types.get(doc[1], doc[1])}")
                        st.write(f"🚗 {doc[4]} ({doc[5]})")
                    
                    with col2:
                        st.write(f"📅 {doc[3].strftime('%d.%m.%Y')}")
                        if days_left >= 0:
                            st.write(f"⏳ Дней осталось/Tage übrig: {days_left}")
                        else:
                            st.write(f"⏳ Просрочен на/Überfällig seit: {abs(days_left)} дней/Tage")
                    
                    with col3:
                        st.write(f"**{text}**")
                    
                    st.divider()
        else:
            st.success("✅ Нет документов с истекающим сроком / Keine ablaufenden Dokumente")
    
    except Exception as e:
        st.error(f"Error loading expiring documents: {str(e)}")

def get_document_types(language='ru'):
    """Get document types with translations"""
    if language == 'de':
        return {
            'fahrzeugschein': 'Fahrzeugschein (Zulassungsbescheinigung Teil I)',
            'fahrzeugbrief': 'Fahrzeugbrief (Zulassungsbescheinigung Teil II)',
            'tuv_certificate': 'TÜV-Bescheinigung (HU)',
            'insurance': 'Versicherungsnachweis',
            'purchase_contract': 'Kaufvertrag',
            'vehicle_photo': 'Fahrzeugfoto',
            'service_book': 'Serviceheft',
            'expense_report': 'Kostennachweis',
            'lease_contract': 'Leasingvertrag',
            'tax_document': 'KFZ-Steuerbescheid',
            'operation_permit': 'Betriebserlaubnis'
        }
    else:
        return {
            'fahrzeugschein': 'Свидетельство о регистрации (часть I)',
            'fahrzeugbrief': 'Свидетельство о регистрации (часть II)',
            'tuv_certificate': 'Техосмотр (TÜV)',
            'insurance': 'Страховка',
            'purchase_contract': 'Договор купли-продажи',
            'vehicle_photo': 'Фото автомобиля',
            'service_book': 'Сервисная книжка',
            'expense_report': 'Отчет о расходах',
            'lease_contract': 'Лизинговый договор',
            'tax_document': 'Налоговый документ',
            'operation_permit': 'Разрешение на эксплуатацию'
        }

def get_vehicles_for_select(language='ru'):
    """Get vehicles for select dropdown"""
    try:
        vehicles = execute_query("""
            SELECT id, name || ' (' || license_plate || ')' as display_name 
            FROM vehicles 
            ORDER BY name
        """)
        return vehicles if vehicles else []
    except Exception as e:
        return []

def get_current_user_id():
    """Get current user ID (simulate for now)"""
    # In real implementation, this would get from session/auth
    users = execute_query("SELECT id FROM users LIMIT 1")
    return users[0][0] if users else None

def delete_document(doc_id, language='ru'):
    """Delete document"""
    try:
        execute_query("UPDATE vehicle_documents SET is_active = false WHERE id = :id", {'id': doc_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"{get_text('error_delete', language)}: {str(e)}")

def show_file_viewer(file_url, title, language='ru'):
    """Show file viewer in modal"""
    if file_url:
        with st.expander(f"📎 {title}", expanded=True):
            col1, col2 = st.columns([3, 1])
            
            with col1:
                # Determine file type
                file_extension = file_url.split('.')[-1].lower()
                
                if file_extension in ['jpg', 'jpeg', 'png', 'gif']:
                    try:
                        import os
                        if file_url.startswith('/'):
                            file_path = file_url.lstrip('/')
                            if os.path.exists(file_path):
                                st.image(file_path, caption=title, use_container_width=True)
                            else:
                                st.error("Файл изображения не найден/Bilddatei nicht gefunden")
                        else:
                            st.image(file_url, caption=title, use_container_width=True)
                    except Exception as e:
                        st.error(f"Ошибка загрузки изображения/Fehler beim Laden des Bildes: {str(e)}")
                elif file_extension == 'pdf':
                    st.write("📄 PDF файл/PDF-Datei")
                    # For PDF, show a link since Streamlit can't display PDFs directly
                    st.markdown(f"[Открыть PDF в новом окне/PDF in neuem Fenster öffnen]({file_url})")
                else:
                    st.write(f"📎 Файл: {file_url.split('/')[-1]}")
            
            with col2:
                # Download button
                try:
                    import os
                    if file_url.startswith('/'):
                        # Local file
                        file_path = file_url.lstrip('/')
                        if os.path.exists(file_path):
                            with open(file_path, "rb") as f:
                                st.download_button(
                                    label="⬇️ Скачать/Download",
                                    data=f.read(),
                                    file_name=file_url.split('/')[-1],
                                    mime=get_mime_type(file_extension)
                                )
                        else:
                            st.write("Файл не найден/Datei nicht gefunden")
                    else:
                        # External URL
                        st.write(f"[Скачать файл/Datei herunterladen]({file_url})")
                except Exception as e:
                    st.write(f"[Скачать файл/Datei herunterladen]({file_url})")
                
                if st.button("❌ Закрыть/Schließen", key=f"close_viewer_{title}"):
                    st.rerun()

def get_mime_type(file_extension):
    """Get MIME type for file extension"""
    mime_types = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    return mime_types.get(file_extension.lower(), 'application/octet-stream')

def export_documents_data(documents, language='ru'):
    """Export documents data to CSV"""
    try:
        export_data = []
        doc_types = get_document_types(language)
        
        for doc in documents:
            export_data.append([
                doc_types.get(doc[1], doc[1]),  # document_type
                doc[2],  # title
                doc[8],  # vehicle_name
                doc[9],  # license_plate
                doc[3].strftime('%d.%m.%Y') if doc[3] else '',  # date_issued
                doc[4].strftime('%d.%m.%Y') if doc[4] else '',  # date_expiry
                doc[6] or '',  # note
                doc[10] or '',  # uploaded_by_name
                doc[7].strftime('%d.%m.%Y %H:%M') if doc[7] else ''  # uploaded_at
            ])
        
        export_to_csv(export_data, "vehicle_documents")
    except Exception as e:
        st.error(f"Export error: {str(e)}")