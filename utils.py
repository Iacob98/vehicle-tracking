import streamlit as st
import pandas as pd
from datetime import datetime, date
from database import execute_query
from translations import get_text
import uuid

def format_currency(amount, currency='€'):
    """Format currency amount"""
    if amount is None:
        return '0.00'
    return f"{float(amount):,.2f} {currency}"

def format_date(date_obj):
    """Format date for display"""
    if date_obj is None:
        return ''
    if isinstance(date_obj, str):
        return date_obj
    return date_obj.strftime('%d.%m.%Y')

def validate_required_fields(fields_dict, language='ru'):
    """Validate required fields"""
    missing_fields = []
    for field_name, value in fields_dict.items():
        if not value or (isinstance(value, str) and value.strip() == ''):
            missing_fields.append(get_text(field_name, language))
    
    if missing_fields:
        st.error(f"{get_text('required_fields', language)}: {', '.join(missing_fields)}")
        return False
    return True

def show_confirmation_dialog(message, language='ru'):
    """Show confirmation dialog"""
    return st.checkbox(message)

def export_to_csv(data, filename):
    """Export data to CSV"""
    if data:
        df = pd.DataFrame(data)
        csv = df.to_csv(index=False)
        st.download_button(
            label="📥 CSV",
            data=csv,
            file_name=f"{filename}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv"
        )

def get_teams_for_select(language='ru'):
    """Get teams for select box"""
    try:
        teams = execute_query("SELECT id, name FROM teams ORDER BY name")
        if not teams or not isinstance(teams, list):
            return []
        return [(str(team[0]), team[1]) for team in teams]
    except Exception as e:
        st.error(f"Error loading teams: {str(e)}")
        return []

def get_users_for_select(language='ru'):
    """Get users for select box"""
    try:
        users = execute_query("SELECT id, first_name, last_name FROM users ORDER BY last_name, first_name")
        if not users or not isinstance(users, list):
            return []
        return [(str(user[0]), f"{user[1]} {user[2]}") for user in users]
    except Exception as e:
        st.error(f"Error loading users: {str(e)}")
        return []

def get_vehicles_for_select(language='ru'):
    """Get vehicles for select box"""
    try:
        vehicles = execute_query("SELECT id, name, license_plate FROM vehicles ORDER BY name")
        if not vehicles or not isinstance(vehicles, list):
            return []
        return [(str(vehicle[0]), f"{vehicle[1]} ({vehicle[2]})") for vehicle in vehicles]
    except Exception as e:
        st.error(f"Error loading vehicles: {str(e)}")
        return []

def get_materials_for_select(language='ru'):
    """Get materials for select box"""
    try:
        materials = execute_query("SELECT id, name FROM materials ORDER BY name")
        if not materials or not isinstance(materials, list):
            return []
        return [(str(material[0]), material[1]) for material in materials]
    except Exception as e:
        st.error(f"Error loading materials: {str(e)}")
        return []

def upload_file(file, upload_type='receipt'):
    """Handle file upload and return file path"""
    if file is not None:
        import os
        
        # Create uploads directory if it doesn't exist
        upload_dir = f"uploads/{upload_type}"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename with safer handling
        file_id = str(uuid.uuid4())
        # Clean filename to avoid issues with special characters
        clean_name = "".join(c for c in file.name if c.isalnum() or c in '._-')
        file_extension = clean_name.split('.')[-1] if '.' in clean_name else 'bin'
        unique_filename = f"{file_id}.{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        try:
            with open(file_path, "wb") as f:
                f.write(file.getbuffer())
            return file_path  # Return relative path without leading slash
        except Exception as e:
            st.error(f"Ошибка сохранения файла: {str(e)}")
            return None
    return None

def display_file(file_path, file_title="Файл"):
    """Display file content in Streamlit"""
    if not file_path:
        st.error("Путь к файлу не указан")
        return False
    
    import os
    
    # Check if file exists
    if not os.path.exists(file_path):
        st.error("Файл не найден")
        return False
    
    # Get file extension
    file_ext = file_path.split('.')[-1].lower() if '.' in file_path else ''
    
    try:
        if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
            # Display image directly from file path
            st.image(file_path, caption=file_title, use_container_width=True)
            return True
        elif file_ext == 'pdf':
            # For PDF, provide download link and info
            st.info("📄 PDF документ")
            with open(file_path, "rb") as pdf_file:
                st.download_button(
                    label="📥 Скачать PDF",
                    data=pdf_file.read(),
                    file_name=os.path.basename(file_path),
                    mime="application/pdf"
                )
            return True
        else:
            # For other files, provide download
            st.info(f"📎 Файл: {os.path.basename(file_path)}")
            with open(file_path, "rb") as file:
                st.download_button(
                    label="📥 Скачать файл",
                    data=file.read(),
                    file_name=os.path.basename(file_path)
                )
            return True
    except Exception as e:
        st.error(f"Ошибка отображения файла: {str(e)}")
        return False

def paginate_data(data, page_size=10):
    """Paginate data for display"""
    if not data:
        return [], 0, 0
    
    total_items = len(data)
    total_pages = (total_items + page_size - 1) // page_size
    
    if 'page_number' not in st.session_state:
        st.session_state.page_number = 1
    
    start_idx = (st.session_state.page_number - 1) * page_size
    end_idx = start_idx + page_size
    
    return data[start_idx:end_idx], st.session_state.page_number, total_pages

def show_pagination(current_page, total_pages, language='ru'):
    """Show pagination controls"""
    if total_pages <= 1:
        return
    
    col1, col2, col3, col4, col5 = st.columns([1, 1, 2, 1, 1])
    
    with col1:
        if st.button("⬅️", disabled=current_page <= 1):
            st.session_state.page_number = current_page - 1
            st.rerun()
    
    with col2:
        if st.button("⬅️⬅️", disabled=current_page <= 1):
            st.session_state.page_number = 1
            st.rerun()
    
    with col3:
        st.write(f"Страница {current_page} из {total_pages}" if language == 'ru' else f"Seite {current_page} von {total_pages}")
    
    with col4:
        if st.button("➡️➡️", disabled=current_page >= total_pages):
            st.session_state.page_number = total_pages
            st.rerun()
    
    with col5:
        if st.button("➡️", disabled=current_page >= total_pages):
            st.session_state.page_number = current_page + 1
            st.rerun()
