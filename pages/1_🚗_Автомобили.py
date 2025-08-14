import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, upload_file, display_file
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

def show_vehicles_list():
    """Show list of vehicles with inline editing"""
    try:
        # Check if we're editing a vehicle
        edit_vehicle_id = st.session_state.get('edit_vehicle_id', None)
        
        if edit_vehicle_id:
            show_edit_vehicle_form(edit_vehicle_id)
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
                    col1, col2, col3, col4, col5 = st.columns([1, 3, 2, 1, 1])
                    
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
                        col_edit, col_delete = st.columns(2)
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
                        INSERT INTO vehicles (id, name, license_plate, vin, status, model, year, photo_url)
                        VALUES (:id, :name, :license_plate, :vin, :status, :model, :year, :photo_url)
                    """, {
                        'id': vehicle_id,
                        'name': name,
                        'license_plate': license_plate,
                        'vin': vin,
                        'status': status,
                        'model': model,
                        'year': year,
                        'photo_url': photo_url
                    })
                    st.success(get_text('success_save', language))
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
        if st.button("⬅️ Назад к списку"):
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

tab1, tab2 = st.tabs([
    get_text('vehicles', language),
    get_text('add', language)
])

with tab1:
    show_vehicles_list()

with tab2:
    show_add_vehicle_form()