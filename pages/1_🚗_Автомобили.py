import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, upload_file, display_file, get_document_types, get_documents_with_sort, delete_document
from pagination import paginate_data
from datetime import datetime
import uuid

# Page config
st.set_page_config(
    page_title="Автомобили",
    page_icon="🚗",
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




def show_vehicles_list():
    """Show list of vehicles with inline editing"""
    try:
        # Check if we're editing a vehicle
        edit_vehicle_id = st.session_state.get('edit_vehicle_id', None)
        view_vehicle_docs = st.session_state.get('view_vehicle_docs', None)
        edit_document_id = st.session_state.get('edit_document_id', None)
        
        # Check for document viewing
        view_document_id = None
        for key in st.session_state.keys():
            if key.startswith("view_document_"):
                view_document_id = key.replace("view_document_", "")
                break
        
        if edit_vehicle_id:
            show_edit_vehicle_form(edit_vehicle_id)
            return
        
        if view_vehicle_docs:
            show_vehicle_documents(view_vehicle_docs)
            return
        
        if view_document_id:
            show_document_viewer(view_document_id)
            return
        
        if edit_document_id:
            show_edit_document_form(edit_document_id)
            return
        
        # Filters
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder="Название, гос.номер, VIN..."
            )
        
        with col2:
            status_filter = st.selectbox(
                get_text('status', language),
                options=['all', 'active', 'repair', 'unavailable'],
                format_func=lambda x: get_text(x, language) if x != 'all' else 'Все/Alle'
            )
        
        with col3:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_vehicles()
        
        # Build query with filters
        query = """
            SELECT id, name, license_plate, vin, status, model, year, photo_url
            FROM vehicles
            WHERE 1=1
        """
        params = {}
        
        if search_term:
            query += """ AND (
                name ILIKE :search OR 
                license_plate ILIKE :search OR 
                vin ILIKE :search
            )"""
            params['search'] = f"%{search_term}%"
        
        if status_filter != 'all':
            query += " AND status = :status"
            params['status'] = status_filter
        
        query += " ORDER BY name"
        
        vehicles = execute_query(query, params)
        
        if vehicles:
            # Pagination  
            paginated_vehicles = paginate_data(vehicles, 20, 'vehicles_list')
            
            for vehicle in paginated_vehicles:
                with st.container():
                    col1, col2, col3, col4, col5 = st.columns([1, 3, 2, 1, 1.5])
                    
                    with col1:
                        # Display vehicle photo thumbnail
                        if vehicle[7]:  # photo_url
                            photo_path = vehicle[7].lstrip('/') if vehicle[7].startswith('/') else vehicle[7]
                            try:
                                import os
                                if os.path.exists(photo_path):
                                    st.image(photo_path, width=80, caption="")
                                else:
                                    st.write("🚗")  # Default car icon
                            except Exception:
                                st.write("🚗")  # Default car icon
                        else:
                            st.write("🚗")  # Default car icon if no photo
                    
                    with col2:
                        st.write(f"**{vehicle[1]}**")
                        st.write(f"📋 {vehicle[2]} | VIN: {vehicle[3]}")
                    
                    with col3:
                        if vehicle[6]:
                            st.write(f"📅 {vehicle[6]}")
                        if vehicle[5]:
                            st.write(f"🚗 {vehicle[5]}")
                    
                    with col4:
                        status_icon = {
                            'active': '🟢',
                            'repair': '🔧',
                            'unavailable': '🔴'
                        }.get(vehicle[4], '⚫')
                        st.write(f"{status_icon} {get_text(vehicle[4], language)}")
                    
                    with col5:
                        col_docs, col_edit, col_delete = st.columns(3)
                        with col_docs:
                            if st.button("📄", key=f"docs_{vehicle[0]}", help="Документы"):
                                st.session_state.view_vehicle_docs = vehicle[0]
                                st.rerun()
                        with col_edit:
                            if st.button("✏️", key=f"edit_{vehicle[0]}", help="Редактировать"):
                                st.session_state.edit_vehicle_id = vehicle[0]
                                st.rerun()
                        with col_delete:
                            if st.button("🗑️", key=f"delete_{vehicle[0]}", help="Удалить"):
                                delete_vehicle(vehicle[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading vehicles: {str(e)}")

def show_add_vehicle_form():
    """Show form to add new vehicle"""
    with st.form("add_vehicle"):
        col1, col2 = st.columns(2)
        
        with col1:
            name = st.text_input(
                get_text('name', language),
                placeholder="Автомобиль-1"
            )
            license_plate = st.text_input(
                "Гос. номер / Kennzeichen",
                placeholder="A123BC"
            )
            vin = st.text_input(
                "VIN",
                placeholder="1HGBH41JXMN109186"
            )
        
        with col2:
            model = st.text_input(
                "Модель / Modell",
                placeholder="Mercedes Sprinter"
            )
            year = st.number_input(
                "Год / Jahr",
                min_value=1990,
                max_value=2030,
                value=2020
            )
            status = st.selectbox(
                get_text('status', language),
                options=['active', 'repair', 'unavailable'],
                format_func=lambda x: get_text(x, language)
            )
        
        # Photo upload section
        st.write("📷 **Фото автомобиля / Fahrzeugfoto**")
        photo_file = st.file_uploader(
            "Выберите фото / Foto auswählen",
            type=['jpg', 'jpeg', 'png', 'gif'],
            help="Загрузите фото автомобиля для отображения в списке"
        )
        
        if st.form_submit_button(get_text('save', language)):
            if name and license_plate:
                try:
                    # Handle photo upload
                    photo_url = None
                    if photo_file:
                        photo_url = upload_file(photo_file, 'vehicles')
                    
                    vehicle_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO vehicles (id, organization_id, name, license_plate, vin, status, model, year, photo_url)
                        VALUES (:id, :organization_id, :name, :license_plate, :vin, :status, :model, :year, :photo_url)
                    """, {
                        'id': vehicle_id,
                        'organization_id': st.session_state.get('organization_id'),
                        'name': name,
                        'license_plate': license_plate,
                        'vin': vin,
                        'status': status,
                        'model': model,
                        'year': year,
                        'photo_url': photo_url
                    })
                    st.success(get_text('success_save', language))
                    # Clear file uploader by resetting session state
                    if 'photo_file' in st.session_state:
                        del st.session_state['photo_file']
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
            else:
                st.error("Название и гос.номер обязательны")

def show_edit_vehicle_form(vehicle_id):
    """Show form to edit existing vehicle"""
    try:
        # Get current vehicle data
        vehicle_data = execute_query("""
            SELECT name, license_plate, vin, status, model, year, photo_url 
            FROM vehicles 
            WHERE id = :id
        """, {'id': vehicle_id})
        
        if not vehicle_data:
            st.error("Автомобиль не найден")
            if st.button("⬅️ Назад к списку"):
                del st.session_state.edit_vehicle_id
                st.rerun()
            return
        
        current_vehicle = vehicle_data[0]
        
        st.subheader("✏️ Редактировать автомобиль / Fahrzeug bearbeiten")
        
        if st.button("⬅️ Назад к списку / Zurück zur Liste"):
            del st.session_state.edit_vehicle_id
            st.rerun()
        
        with st.form("edit_vehicle"):
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input(
                    "Название / Name",
                    value=current_vehicle[0] or "",
                    placeholder="Автомобиль-1"
                )
                license_plate = st.text_input(
                    "Гос. номер / Kennzeichen",
                    value=current_vehicle[1] or "",
                    placeholder="А123АА123"
                )
                vin = st.text_input(
                    "VIN",
                    value=current_vehicle[2] or "",
                    placeholder="1HGBH41JXMN109186"
                )
            
            with col2:
                model = st.text_input(
                    "Модель / Modell",
                    value=current_vehicle[4] or "",
                    placeholder="Mercedes Sprinter"
                )
                year = st.number_input(
                    "Год / Jahr",
                    min_value=1990,
                    max_value=2030,
                    value=current_vehicle[5] if current_vehicle[5] else 2020
                )
                
                status_options = ['active', 'repair', 'unavailable']
                current_status_index = 0
                if current_vehicle[3] in status_options:
                    current_status_index = status_options.index(current_vehicle[3])
                
                status = st.selectbox(
                    get_text('status', language),
                    options=status_options,
                    index=current_status_index,
                    format_func=lambda x: get_text(x, language)
                )
            
            # Current photo section
            current_photo_url = current_vehicle[6] if len(current_vehicle) > 6 else None
            
            st.write("📷 **Фото автомобиля / Fahrzeugfoto**")
            
            if current_photo_url:
                col_photo, col_info = st.columns([1, 2])
                with col_photo:
                    photo_path = current_photo_url.lstrip('/') if current_photo_url.startswith('/') else current_photo_url
                    try:
                        import os
                        if os.path.exists(photo_path):
                            st.image(photo_path, width=150, caption="Текущее фото")
                        else:
                            st.info("Текущее фото не найдено")
                    except Exception:
                        st.info("Ошибка отображения текущего фото")
                with col_info:
                    st.info("✅ Текущее фото загружено")
                    replace_photo = st.checkbox("Заменить фото / Foto ersetzen")
            else:
                st.info("📷 Фото не загружено")
                replace_photo = True
            
            # Photo upload
            photo_file = None
            if current_photo_url is None or replace_photo:
                photo_file = st.file_uploader(
                    "Выберите новое фото / Neues Foto auswählen" if current_photo_url else "Выберите фото / Foto auswählen",
                    type=['jpg', 'jpeg', 'png', 'gif'],
                    help="Загрузите фото автомобиля для отображения в списке"
                )
            
            col_save, col_cancel = st.columns(2)
            with col_save:
                if st.form_submit_button("💾 Сохранить / Speichern", type="primary"):
                    if name and license_plate:
                        try:
                            # Handle photo upload
                            photo_url_to_save = current_photo_url  # Keep current photo by default
                            if photo_file:
                                # Upload new photo
                                new_photo_url = upload_file(photo_file, 'vehicles')
                                if new_photo_url:
                                    photo_url_to_save = new_photo_url
                            elif replace_photo and current_photo_url:
                                # User wants to remove current photo
                                photo_url_to_save = None
                            
                            execute_query("""
                                UPDATE vehicles 
                                SET name = :name, license_plate = :license_plate, vin = :vin, 
                                    status = :status, model = :model, year = :year, photo_url = :photo_url
                                WHERE id = :id
                            """, {
                                'id': vehicle_id,
                                'name': name,
                                'license_plate': license_plate,
                                'vin': vin,
                                'status': status,
                                'model': model,
                                'year': year,
                                'photo_url': photo_url_to_save
                            })
                            st.success("Автомобиль обновлен / Fahrzeug aktualisiert")
                            del st.session_state.edit_vehicle_id
                            st.rerun()
                        except Exception as e:
                            st.error(f"Ошибка обновления: {str(e)}")
                    else:
                        st.error("Название и гос.номер обязательны")
            
            with col_cancel:
                if st.form_submit_button("❌ Отмена / Abbrechen"):
                    del st.session_state.edit_vehicle_id
                    st.rerun()
                    
    except Exception as e:
        st.error(f"Ошибка загрузки данных: {str(e)}")
        if st.button("⬅️ Назад к списку", key="back_from_edit_vehicle_error"):
            if 'edit_vehicle_id' in st.session_state:
                del st.session_state.edit_vehicle_id
            st.rerun()

def delete_vehicle(vehicle_id):
    """Delete vehicle"""
    try:
        execute_query("DELETE FROM vehicles WHERE id = :id", {'id': vehicle_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

def show_vehicle_documents(vehicle_id):
    """Show documents for specific vehicle"""
    try:
        # Get vehicle info
        vehicle_info = execute_query("""
            SELECT name, license_plate, photo_url 
            FROM vehicles 
            WHERE id = :id
        """, {'id': vehicle_id})
        
        if not vehicle_info:
            st.error("Автомобиль не найден")
            return
        
        vehicle = vehicle_info[0]
        
        # Header with vehicle info
        col_back, col_title, col_photo = st.columns([1, 3, 1])
        
        with col_back:
            if st.button("⬅️ Назад к списку", key=f"back_to_vehicles_from_docs_{vehicle_id}"):
                del st.session_state.view_vehicle_docs
                st.rerun()
        
        with col_title:
            st.subheader(f"📄 Документы: {vehicle[0]} ({vehicle[1]})")
        
        with col_photo:
            if vehicle[2]:  # photo_url
                photo_path = vehicle[2].lstrip('/') if vehicle[2].startswith('/') else vehicle[2]
                try:
                    import os
                    if os.path.exists(photo_path):
                        st.image(photo_path, width=80)
                    else:
                        st.write("🚗")
                except Exception:
                    st.write("🚗")
            else:
                st.write("🚗")
        
        # Documents tabs
        tab1, tab2 = st.tabs(["📄 Документы", "➕ Добавить документ"])
        
        with tab1:
            show_vehicle_documents_list(vehicle_id)
        
        with tab2:
            show_add_vehicle_document_form(vehicle_id)
    
    except Exception as e:
        st.error(f"Ошибка загрузки документов: {str(e)}")
        if st.button("⬅️ Назад к списку", key="back_to_vehicles_from_docs_error"):
            if 'view_vehicle_docs' in st.session_state:
                del st.session_state.view_vehicle_docs
            st.rerun()

def show_vehicle_documents_list(vehicle_id):
    """Show list of documents for specific vehicle"""
    try:
        # Get documents for this vehicle
        documents = execute_query("""
            SELECT 
                vd.id,
                vd.document_type,
                vd.title,
                vd.date_issued,
                vd.date_expiry,
                vd.file_url,
                CASE 
                    WHEN vd.date_expiry IS NOT NULL AND vd.date_expiry < CURRENT_DATE THEN 'expired'
                    WHEN vd.date_expiry IS NOT NULL AND vd.date_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
                    ELSE 'valid'
                END as status
            FROM vehicle_documents vd
            WHERE vd.vehicle_id = :vehicle_id AND vd.is_active = true
            ORDER BY vd.document_type, vd.date_expiry ASC NULLS LAST
        """, {'vehicle_id': vehicle_id})
        
        if documents:
            # Statistics
            total_docs = len(documents)
            expired = sum(1 for doc in documents if doc[6] == 'expired')
            expiring = sum(1 for doc in documents if doc[6] == 'expiring')
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("📄 Всего документов", total_docs)
            with col2:
                st.metric("🔴 Просрочено", expired)
            with col3:
                st.metric("⚠️ Истекает", expiring)
            
            st.divider()
            
            # Document types mapping
            doc_types = {
                'insurance': 'Страховка/Versicherung',
                'inspection': 'Техосмотр/TÜV',
                'registration': 'Регистрация/Zulassung',
                'license': 'Лицензия/Lizenz',
                'permit': 'Разрешение/Genehmigung'
            }
            
            # Group documents by type
            grouped_docs = {}
            for doc in documents:
                doc_type = doc[1]
                if doc_type not in grouped_docs:
                    grouped_docs[doc_type] = []
                grouped_docs[doc_type].append(doc)
            
            # Display grouped documents
            for doc_type, type_documents in grouped_docs.items():
                type_name = doc_types.get(doc_type, doc_type)
                st.subheader(f"📁 {type_name}")
                
                for doc in type_documents:
                    with st.container():
                        col1, col2, col3 = st.columns([3, 2, 1])
                        
                        with col1:
                            # Status icon and title
                            status_icon = '🔴' if doc[6] == 'expired' else '⚠️' if doc[6] == 'expiring' else '✅'
                            st.write(f"**{doc[2]}**")
                            
                            # File info
                            if doc[5]:
                                file_ext = doc[5].split('.')[-1].upper() if '.' in doc[5] else ''
                                st.write(f"📄 {file_ext} документ")
                            else:
                                st.write("📎 Нет файла")
                        
                        with col2:
                            # Status and dates
                            status_text = 'Действителен' if doc[6] == 'valid' else 'Истекает' if doc[6] == 'expiring' else 'Просрочен'
                            status_color = 'green' if doc[6] == 'valid' else 'orange' if doc[6] == 'expiring' else 'red'
                            
                            st.markdown(f":{status_color}[{status_icon} {status_text}]")
                            
                            issued_date = doc[3].strftime('%d.%m.%Y') if doc[3] else ''
                            if issued_date:
                                st.write(f"🟦 Выдан: {issued_date}")
                            
                            if doc[4]:
                                expiry_date = doc[4].strftime('%d.%m.%Y')
                                st.write(f"🟦 До: {expiry_date}")
                        
                        with col3:
                            # Action buttons
                            if doc[5]:  # Has file
                                if st.button("👁️", key=f"view_doc_{doc[0]}", help="Просмотр"):
                                    st.session_state[f"view_document_{doc[0]}"] = True
                                    st.rerun()
                            
                            if st.button("✏️", key=f"edit_doc_{doc[0]}", help="Редактировать"):
                                st.session_state.edit_document_id = doc[0]
                                st.rerun()
                            
                            if st.button("🗑️", key=f"delete_doc_{doc[0]}", help="Удалить"):
                                delete_vehicle_document(doc[0])
                
                st.divider()
        else:
            st.info("📄 Документы не найдены")
            st.write("Используйте вкладку **Добавить документ** для загрузки первого документа.")
    
    except Exception as e:
        st.error(f"Ошибка загрузки документов: {str(e)}")

def show_add_vehicle_document_form(vehicle_id):
    """Show form to add document for vehicle"""
    with st.form("add_vehicle_document"):
        col1, col2 = st.columns(2)
        
        with col1:
            title = st.text_input(
                "Название документа",
                placeholder="Страховой полис ОСАГО"
            )
            
            doc_types = get_document_types()
            
            document_type = st.selectbox(
                "Тип документа",
                options=list(doc_types.keys()),
                format_func=lambda x: doc_types[x]
            )
        
        with col2:
            date_issued = st.date_input(
                "Дата выдачи",
                value=None
            )
            
            date_expiry = st.date_input(
                "Срок действия до",
                value=None
            )
        
        # File upload
        st.write("📎 **Файл документа**")
        uploaded_file = st.file_uploader(
            "Выберите файл",
            type=['pdf', 'jpg', 'jpeg', 'png', 'gif'],
            help="Загрузите скан или фото документа"
        )
        
        if st.form_submit_button("💾 Сохранить документ", type="primary"):
            if title and document_type:
                try:
                    # Upload file if provided
                    file_url = None
                    if uploaded_file:
                        file_url = upload_file(uploaded_file, 'documents')
                    
                    # Insert document
                    doc_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO vehicle_documents 
                        (id, organization_id, vehicle_id, document_type, title, date_issued, date_expiry, file_url, is_active)
                        VALUES (:id, :organization_id, :vehicle_id, :document_type, :title, :date_issued, :date_expiry, :file_url, true)
                    """, {
                        'id': doc_id,
                        'organization_id': st.session_state.get('organization_id'),
                        'vehicle_id': vehicle_id,
                        'document_type': document_type,
                        'title': title,
                        'date_issued': date_issued,
                        'date_expiry': date_expiry,
                        'file_url': file_url
                    })
                    
                    st.success("✅ Документ добавлен!")
                    # Clear file uploader by resetting session state
                    if 'uploaded_file' in st.session_state:
                        del st.session_state['uploaded_file']
                    st.rerun()
                
                except Exception as e:
                    st.error(f"Ошибка сохранения: {str(e)}")
            else:
                st.error("Название и тип документа обязательны")

def show_document_viewer(document_id):
    """Show document file viewer with improved error handling"""
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
            if st.button("⬅️ Назад", key=f"back_from_document_viewer_error_{document_id}"):
                # Clear all view states
                for key in list(st.session_state.keys()):
                    if key.startswith("view_document_"):
                        del st.session_state[key]
                st.rerun()
            return
        
        doc = document_data[0]
        file_url = doc[1]
        doc_types = get_document_types()
        
        # Header
        col_back, col_title = st.columns([1, 4])
        
        with col_back:
            if st.button("⬅️ Назад", key=f"back_from_document_viewer_{document_id}"):
                # Clear view state
                for key in list(st.session_state.keys()):
                    if key.startswith("view_document_"):
                        del st.session_state[key]
                st.rerun()
        
        with col_title:
            st.subheader(f"👁️ {doc[0]}")
            st.write(f"🚗 {doc[2]} ({doc[3]})")
            st.write(f"📁 {doc_types.get(doc[4], doc[4])}")
        
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
        if st.button("⬅️ Назад", key=f"back_from_document_viewer_error_{document_id}"):
            for key in list(st.session_state.keys()):
                if key.startswith("view_document_"):
                    del st.session_state[key]
            st.rerun()

def show_edit_document_form(document_id):
    """Show form to edit document"""
    try:
        # Get document data
        doc_data = execute_query("""
            SELECT vd.title, vd.document_type, vd.date_issued, vd.date_expiry, vd.file_url, v.name, v.license_plate, vd.vehicle_id
            FROM vehicle_documents vd
            JOIN vehicles v ON vd.vehicle_id = v.id
            WHERE vd.id = :id AND vd.is_active = true
        """, {'id': document_id})
        
        if not doc_data:
            st.error("Документ не найден")
            return
        
        doc = doc_data[0]
        
        # Header
        col_back, col_title = st.columns([1, 4])
        
        with col_back:
            if st.button("⬅️ Назад", key=f"back_from_edit_document_{document_id}"):
                del st.session_state.edit_document_id
                st.rerun()
        
        with col_title:
            st.subheader(f"✏️ Редактировать: {doc[0]}")
            st.write(f"🚗 {doc[5]} ({doc[6]})")
        
        with st.form("edit_vehicle_document"):
            col1, col2 = st.columns(2)
            
            with col1:
                title = st.text_input(
                    "Название документа",
                    value=doc[0] or "",
                    placeholder="Страховой полис ОСАГО"
                )
                
                doc_types = get_document_types()
                
                current_type_index = 0
                if doc[1] in doc_types:
                    current_type_index = list(doc_types.keys()).index(doc[1])
                
                document_type = st.selectbox(
                    "Тип документа",
                    options=list(doc_types.keys()),
                    index=current_type_index,
                    format_func=lambda x: doc_types[x]
                )
            
            with col2:
                date_issued = st.date_input(
                    "Дата выдачи",
                    value=doc[2] if doc[2] else None
                )
                
                date_expiry = st.date_input(
                    "Срок действия до",
                    value=doc[3] if doc[3] else None
                )
            
            # Current file info and replacement
            if doc[4]:
                st.info(f"📎 Текущий файл: {doc[4].split('/')[-1]}")
                replace_file = st.checkbox("Заменить файл")
            else:
                st.info("📎 Файл не прикреплен")
                replace_file = True
            
            # File upload
            uploaded_file = None
            if doc[4] is None or replace_file:
                uploaded_file = st.file_uploader(
                    "Новый файл документа" if doc[4] else "Файл документа",
                    type=['pdf', 'jpg', 'jpeg', 'png', 'gif'],
                    help="Загрузите скан или фото документа"
                )
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                if st.form_submit_button("💾 Сохранить", type="primary"):
                    if title and document_type:
                        try:
                            # Handle file upload
                            file_url_to_save = doc[4]  # Keep current file by default
                            if uploaded_file:
                                new_file_url = upload_file(uploaded_file, 'documents')
                                if new_file_url:
                                    file_url_to_save = new_file_url
                            elif replace_file and doc[4]:
                                file_url_to_save = None  # Remove current file
                            
                            # Update document
                            execute_query("""
                                UPDATE vehicle_documents 
                                SET title = :title, document_type = :document_type, 
                                    date_issued = :date_issued, date_expiry = :date_expiry, 
                                    file_url = :file_url
                                WHERE id = :id
                            """, {
                                'id': document_id,
                                'title': title,
                                'document_type': document_type,
                                'date_issued': date_issued,
                                'date_expiry': date_expiry,
                                'file_url': file_url_to_save
                            })
                            
                            st.success("✅ Документ обновлен!")
                            del st.session_state.edit_document_id
                            st.session_state.view_vehicle_docs = doc[7]  # Return to vehicle docs
                            st.rerun()
                        
                        except Exception as e:
                            st.error(f"Ошибка сохранения: {str(e)}")
                    else:
                        st.error("Название и тип документа обязательны")
            
            with col_cancel:
                if st.form_submit_button("❌ Отмена"):
                    del st.session_state.edit_document_id
                    st.session_state.view_vehicle_docs = doc[7]  # Return to vehicle docs
                    st.rerun()
    
    except Exception as e:
        st.error(f"Ошибка загрузки документа: {str(e)}")
        if st.button("⬅️ Назад", key=f"back_from_edit_document_error_{document_id}"):
            if 'edit_document_id' in st.session_state:
                del st.session_state.edit_document_id
            st.rerun()

def delete_vehicle_document(document_id):
    """Delete vehicle document"""
    try:
        execute_query("""
            UPDATE vehicle_documents 
            SET is_active = false 
            WHERE id = :id
        """, {'id': document_id})
        st.success("Документ удален")
        st.rerun()
    except Exception as e:
        st.error(f"Ошибка удаления: {str(e)}")

def show_all_documents_list():
    """Show list of all documents with enhanced filtering and sorting from original documents page"""
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
                key="all_doc_vehicle_filter"
            )
        
        with col2:
            doc_types = get_document_types()
            type_filter = st.selectbox(
                "Тип документа/Dokumenttyp",
                options=['all'] + list(doc_types.keys()),
                format_func=lambda x: 'Все типы/Alle Typen' if x == 'all' else doc_types.get(x, x),
                key="all_doc_type_filter"
            )
        
        with col3:
            # Search functionality
            search_term = st.text_input(
                "🔍 Поиск/Suche",
                placeholder="Название документа...",
                key="all_doc_search"
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
                        
                        with col3:
                            # Action buttons
                            st.write("")  # Spacing
                            
                            if doc[5]:  # Has file
                                if st.button("👁️", key=f"view_all_{doc[0]}", help="Просмотр"):
                                    st.session_state[f"view_document_{doc[0]}"] = True
                                    st.rerun()
                            
                            if st.button("✏️", key=f"edit_all_{doc[0]}", help="Редактировать"):
                                st.session_state.edit_document_id = doc[0]
                                st.rerun()
                            
                            if st.button("🗑️", key=f"delete_all_{doc[0]}", help="Удалить"):
                                delete_document(doc[0])
        
                st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading documents: {str(e)}")

def show_expiring_documents():
    """Show all expiring documents across all vehicles"""
    try:
        st.subheader("⚠️ Истекающие документы")
        st.write("Документы, которые истекают в течение 30 дней или уже просрочены")
        
        # Get expiring/expired documents
        documents = execute_query("""
            SELECT 
                vd.id,
                vd.document_type,
                vd.title,
                vd.date_issued,
                vd.date_expiry,
                vd.file_url,
                v.name as vehicle_name,
                v.license_plate,
                v.photo_url,
                CASE 
                    WHEN vd.date_expiry IS NOT NULL AND vd.date_expiry < CURRENT_DATE THEN 'expired'
                    WHEN vd.date_expiry IS NOT NULL AND vd.date_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
                    ELSE 'valid'
                END as status
            FROM vehicle_documents vd
            JOIN vehicles v ON vd.vehicle_id = v.id
            WHERE vd.is_active = true 
            AND vd.date_expiry IS NOT NULL 
            AND vd.date_expiry <= CURRENT_DATE + INTERVAL '30 days'
            ORDER BY vd.date_expiry ASC NULLS LAST, v.name
        """)
        
        if documents:
            # Statistics
            total_docs = len(documents)
            expired = sum(1 for doc in documents if doc[9] == 'expired')
            expiring = sum(1 for doc in documents if doc[9] == 'expiring')
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("⚠️ Всего требующих внимания", total_docs)
            with col2:
                st.metric("🔴 Просрочено", expired)
            with col3:
                st.metric("⚠️ Истекает скоро", expiring)
            
            st.divider()
            
            # Document types mapping
            doc_types = get_document_types()
            
            # Display documents
            for doc in documents:
                with st.container():
                    col1, col2, col3, col4 = st.columns([1, 3, 2, 1])
                    
                    with col1:
                        # Vehicle photo thumbnail
                        if doc[8]:  # photo_url
                            photo_path = doc[8].lstrip('/') if doc[8].startswith('/') else doc[8]
                            try:
                                import os
                                if os.path.exists(photo_path):
                                    st.image(photo_path, width=60)
                                else:
                                    st.write("🚗")
                            except Exception:
                                st.write("🚗")
                        else:
                            st.write("🚗")
                    
                    with col2:
                        # Document and vehicle info
                        status_icon = '🔴' if doc[9] == 'expired' else '⚠️'
                        doc_type_name = doc_types.get(doc[1], doc[1])
                        
                        st.write(f"**{doc[2]}**")
                        st.write(f"📁 {doc_type_name}")
                        st.write(f"🚗 {doc[6]} ({doc[7]})")
                        
                        # File info
                        if doc[5]:
                            file_ext = doc[5].split('.')[-1].upper() if '.' in doc[5] else ''
                            st.caption(f"📄 {file_ext} файл")
                    
                    with col3:
                        # Status and dates
                        if doc[9] == 'expired':
                            st.markdown(":red[🔴 Просрочен]")
                            days_overdue = (datetime.now().date() - doc[4]).days
                            st.write(f"Просрочен на {days_overdue} дн.")
                        else:
                            st.markdown(":orange[⚠️ Истекает]")
                            days_left = (doc[4] - datetime.now().date()).days
                            st.write(f"Осталось {days_left} дн.")
                        
                        # Dates
                        issued_date = doc[3].strftime('%d.%m.%Y') if doc[3] else ''
                        expiry_date = doc[4].strftime('%d.%m.%Y') if doc[4] else ''
                        
                        if issued_date:
                            st.caption(f"Выдан: {issued_date}")
                        st.caption(f"До: {expiry_date}")
                    
                    with col4:
                        # Action buttons
                        if doc[5]:  # Has file
                            if st.button("👁️", key=f"view_exp_doc_{doc[0]}", help="Просмотр"):
                                st.session_state[f"view_document_{doc[0]}"] = True
                                st.rerun()
                        
                        if st.button("✏️", key=f"edit_exp_doc_{doc[0]}", help="Редактировать"):
                            st.session_state.edit_document_id = doc[0]
                            st.rerun()
                        
                        if st.button("🚗", key=f"goto_vehicle_{doc[0]}", help="К автомобилю"):
                            # Get vehicle ID from document
                            vehicle_data = execute_query("""
                                SELECT vehicle_id FROM vehicle_documents WHERE id = :doc_id
                            """, {'doc_id': doc[0]})
                            if vehicle_data:
                                st.session_state.view_vehicle_docs = vehicle_data[0][0]
                                st.rerun()
                
                st.divider()
        else:
            st.success("✅ Нет истекающих или просроченных документов!")
            st.info("Все документы автомобилей имеют актуальные сроки действия.")
    
    except Exception as e:
        st.error(f"Ошибка загрузки истекающих документов: {str(e)}")

def show_vehicle_assignments():
    """Show and manage vehicle assignments to teams"""
    st.subheader("👥 Назначения автомобилей бригадам")
    st.info("""
    На этой странице вы можете:
    - **🚗 Назначить** автомобиль бригаде с выбором конкретного водителя
    - **📋 Просмотреть** текущие назначения с информацией о водителях
    - **⏹️ Завершить** назначение автомобиля
    
    **Логика штрафов:** Штрафы за нарушения будут привязаны к конкретному водителю в бригаде.
    """)
    
    # Add new assignment section
    with st.expander("➕ Назначить автомобиль бригаде"):
        show_add_assignment_form()
    
    # Current assignments
    try:
        assignments = execute_query("""
            SELECT 
                va.id,
                v.name as vehicle_name,
                v.license_plate,
                t.name as team_name,
                va.start_date,
                va.end_date,
                v.photo_url,
                u.first_name || ' ' || u.last_name as driver_name
            FROM vehicle_assignments va
            JOIN vehicles v ON va.vehicle_id = v.id
            JOIN teams t ON va.team_id = t.id
            LEFT JOIN users u ON va.driver_id = u.id
            WHERE va.organization_id = :organization_id
            ORDER BY va.start_date DESC
        """, {
            'organization_id': st.session_state.get('organization_id')
        })
        
        if assignments:
            st.subheader("🚗 Текущие назначения")
            
            # Show statistics
            active_assignments = [a for a in assignments if a[5] is None]
            inactive_assignments = [a for a in assignments if a[5] is not None]
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Активные назначения", len(active_assignments))
            with col2:
                st.metric("Завершенные назначения", len(inactive_assignments))
            
            st.divider()
            
            for assignment in assignments:
                with st.container():
                    col1, col2, col3, col4 = st.columns([1, 3, 2, 1])
                    
                    with col1:
                        # Vehicle photo thumbnail
                        if assignment[6]:  # photo_url
                            photo_path = assignment[6].lstrip('/') if assignment[6].startswith('/') else assignment[6]
                            try:
                                import os
                                if os.path.exists(photo_path):
                                    st.image(photo_path, width=60)
                                else:
                                    st.write("🚗")
                            except Exception:
                                st.write("🚗")
                        else:
                            st.write("🚗")
                    
                    with col2:
                        st.write(f"**🚗 {assignment[1]}** ({assignment[2]})")
                        st.write(f"👥 Бригада: {assignment[3]}")
                        if assignment[7]:  # driver_name
                            st.write(f"👤 Водитель: {assignment[7]}")
                        else:
                            st.write("👤 Водитель: не указан")
                    
                    with col3:
                        start_date = assignment[4].strftime('%d.%m.%Y') if assignment[4] else ''
                        end_date = assignment[5].strftime('%d.%m.%Y') if assignment[5] else 'Активно'
                        
                        if assignment[5] is None:  # Active assignment
                            st.markdown(f":green[📅 С {start_date}]")
                            st.markdown(f":green[✅ {end_date}]")
                        else:  # Ended assignment  
                            st.write(f"📅 {start_date} - {end_date}")
                            st.markdown(f":gray[⏹️ Завершено]")
                    
                    with col4:
                        if assignment[5] is None:  # If end_date is None (active assignment)
                            if st.button("⏹️ Завершить", key=f"end_assignment_{assignment[0]}", help="Завершить назначение"):
                                end_assignment(assignment[0])
                
                st.divider()
        else:
            st.info("Нет назначений автомобилей")
    
    except Exception as e:
        st.error(f"Ошибка загрузки назначений: {str(e)}")

def show_add_assignment_form():
    """Show form to add vehicle assignment with driver selection"""
    # Initialize session state for dynamic driver loading
    if 'selected_team_for_assignment' not in st.session_state:
        st.session_state.selected_team_for_assignment = None
    
    with st.form("add_assignment_form"):
        col1, col2 = st.columns(2)
        
        # Get vehicles and teams for selection
        vehicles = execute_query("""
            SELECT id, name, license_plate 
            FROM vehicles 
            WHERE organization_id = :organization_id
            ORDER BY name
        """, {
            'organization_id': st.session_state.get('organization_id')
        })
        
        teams = execute_query("""
            SELECT id, name 
            FROM teams 
            WHERE organization_id = :organization_id
            ORDER BY name
        """, {
            'organization_id': st.session_state.get('organization_id')
        })
        
        if not vehicles or not teams:
            st.warning("⚠️ Необходимо создать автомобили и бригады перед назначением")
            return
        
        with col1:
            vehicle_options = [(str(v[0]), f"{v[1]} ({v[2]})") for v in vehicles]
            vehicle_id = st.selectbox(
                "🚗 Выберите автомобиль",
                options=[v[0] for v in vehicle_options],
                format_func=lambda x: next(v[1] for v in vehicle_options if v[0] == x),
                key="assign_vehicle_id"
            )
        
        with col2:
            team_options = [(str(t[0]), t[1]) for t in teams]
            team_id = st.selectbox(
                "👥 Выберите бригаду",
                options=[t[0] for t in team_options],
                format_func=lambda x: next(t[1] for t in team_options if t[0] == x),
                key="assign_team_id"
            )
        
        # Get drivers from selected team
        if team_id:
            drivers = execute_query("""
                SELECT u.id, u.first_name, u.last_name, u.role
                FROM users u
                WHERE u.organization_id = :organization_id
                AND (u.team_id = :team_id OR u.id = (
                    SELECT lead_id FROM teams WHERE id = :team_id AND lead_id IS NOT NULL
                ))
                ORDER BY u.first_name, u.last_name
            """, {
                'organization_id': st.session_state.get('organization_id'),
                'team_id': team_id
            })
            
            col3, col4 = st.columns(2)
            
            with col3:
                if drivers:
                    driver_options = [('none', 'Не указывать водителя')] + [(str(d[0]), f"{d[1]} {d[2]} ({d[3]})") for d in drivers]
                    driver_id = st.selectbox(
                        "👤 Выберите водителя",
                        options=[d[0] for d in driver_options],
                        format_func=lambda x: next(d[1] for d in driver_options if d[0] == x),
                        key="assign_driver_id"
                    )
                else:
                    st.info("В выбранной бригаде нет пользователей")
                    driver_id = 'none'
            
            with col4:
                start_date = st.date_input(
                    "📅 Дата начала",
                    value=datetime.now().date(),
                    key="assign_start_date"
                )
        else:
            driver_id = 'none'
            start_date = datetime.now().date()
        
        submitted = st.form_submit_button("✅ Назначить автомобиль", type="primary")
        
        if submitted:
            try:
                # End any existing assignment for this vehicle
                execute_query("""
                    UPDATE vehicle_assignments 
                    SET end_date = :date 
                    WHERE vehicle_id = :vehicle_id 
                    AND end_date IS NULL 
                    AND organization_id = :organization_id
                """, {
                    'date': start_date,
                    'vehicle_id': vehicle_id,
                    'organization_id': st.session_state.get('organization_id')
                })
                
                # Create new assignment
                assignment_id = str(uuid.uuid4())
                driver_id_to_insert = driver_id if driver_id != 'none' else None
                
                execute_query("""
                    INSERT INTO vehicle_assignments 
                    (id, organization_id, vehicle_id, team_id, driver_id, start_date)
                    VALUES (:id, :organization_id, :vehicle_id, :team_id, :driver_id, :start_date)
                """, {
                    'id': assignment_id,
                    'organization_id': st.session_state.get('organization_id'),
                    'vehicle_id': vehicle_id,
                    'team_id': team_id,
                    'driver_id': driver_id_to_insert,
                    'start_date': start_date
                })
                
                vehicle_name = next(v[1] for v in vehicle_options if v[0] == vehicle_id)
                team_name = next(t[1] for t in team_options if t[0] == team_id)
                
                if driver_id_to_insert:
                    driver_name = next(d[1] for d in driver_options if d[0] == driver_id).split(' (')[0]
                    st.success(f"✅ Автомобиль **{vehicle_name}** назначен бригаде **{team_name}** (водитель: **{driver_name}**) с {start_date.strftime('%d.%m.%Y')}")
                else:
                    st.success(f"✅ Автомобиль **{vehicle_name}** назначен бригаде **{team_name}** (без указания водителя) с {start_date.strftime('%d.%m.%Y')}")
                
                st.rerun()
            except Exception as e:
                st.error(f"Ошибка назначения: {str(e)}")

def end_assignment(assignment_id):
    """End vehicle assignment"""
    try:
        execute_query("""
            UPDATE vehicle_assignments 
            SET end_date = CURRENT_DATE 
            WHERE id = :id AND organization_id = :organization_id
        """, {
            'id': assignment_id,
            'organization_id': st.session_state.get('organization_id')
        })
        st.success("⏹️ Назначение завершено")
        st.rerun()
    except Exception as e:
        st.error(f"Ошибка завершения назначения: {str(e)}")

def export_vehicles():
    """Export vehicles to CSV"""
    vehicles = execute_query("SELECT * FROM vehicles")
    if vehicles:
        df = pd.DataFrame(vehicles)
        csv = df.to_csv(index=False)
        st.download_button(
            label="📥 Download CSV",
            data=csv,
            file_name=f"vehicles_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )

# Main page
st.title(f"🚗 {get_text('vehicles', language)}")

# Handle session state actions first (these override main interface)
if 'edit_vehicle_id' in st.session_state:
    show_edit_vehicle_form(st.session_state.edit_vehicle_id)

elif 'view_vehicle_docs' in st.session_state:
    show_vehicle_documents(st.session_state.view_vehicle_docs)

elif 'edit_document_id' in st.session_state:
    show_edit_document_form(st.session_state.edit_document_id)

else:
    # Check for document viewer session states
    document_viewer_active = False
    for key in st.session_state.keys():
        if key.startswith('view_document_'):
            document_id = key.replace('view_document_', '')
            show_document_viewer(document_id)
            document_viewer_active = True
            break
    
    # Only show main tabs if no special views are active
    if not document_viewer_active:
        tab1, tab2, tab3, tab4, tab5 = st.tabs([
            get_text('vehicles', language),
            "📄 Все документы",
            "⚠️ Истекающие документы", 
            "👥 Назначения автомобилей",
            get_text('add', language)
        ])

        with tab1:
            show_vehicles_list()

        with tab2:
            show_all_documents_list()

        with tab3:
            show_expiring_documents()

        with tab4:
            show_vehicle_assignments()

        with tab5:
            show_add_vehicle_form()