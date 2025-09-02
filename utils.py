import streamlit as st
import pandas as pd
from datetime import datetime, date
from database import execute_query
from translations import get_text
import uuid
import os

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

def upload_multiple_files(files, upload_type='documents'):
    """Handle multiple files upload with comprehensive diagnostics and verification"""
    if not files:
        return []
        
    import os
    import time
    uploaded_paths = []
    
    st.info(f"🔄 **Начинаем загрузку {len(files)} файлов в `uploads/{upload_type}/`**")
    st.info(f"🔄 **Dateien werden in `uploads/{upload_type}/` hochgeladen**")
    
    # Pre-upload diagnostics
    upload_dir = f"uploads/{upload_type}"
    st.write(f"📁 **Целевая директория:** `{upload_dir}`")
    st.write(f"📁 **Рабочая директория:** `{os.getcwd()}`")
    
    try:
        os.makedirs(upload_dir, exist_ok=True)
        st.success(f"✅ Директория подготовлена: `{upload_dir}`")
        
        # Check directory permissions
        test_file_path = os.path.join(upload_dir, "test_write_permissions.tmp")
        try:
            with open(test_file_path, "w") as test_file:
                test_file.write("test")
            os.remove(test_file_path)
            st.success("✅ Права на запись проверены - OK")
        except Exception as perm_error:
            st.error(f"❌ Нет прав на запись в директорию: {str(perm_error)}")
            return []
            
    except Exception as dir_error:
        st.error(f"❌ Ошибка создания директории: {str(dir_error)}")
        return []
    
    progress_bar = st.progress(0)
    
    for i, file in enumerate(files, 1):
        progress_bar.progress(i / len(files))
        
        if file is not None:
            try:
                st.write(f"**📤 Обработка файла {i}/{len(files)}:** `{file.name}`")
                
                # Generate unique filename with safer handling
                file_id = str(uuid.uuid4())
                clean_name = "".join(c for c in file.name if c.isalnum() or c in '._-')
                file_extension = clean_name.split('.')[-1] if '.' in clean_name else 'bin'
                unique_filename = f"{file_id}.{file_extension}"
                file_path = os.path.join(upload_dir, unique_filename)
                
                st.write(f"  🎯 **Генерируем путь:** `{file_path}`")
                
                # Get file data with comprehensive checking
                try:
                    file_data = file.getvalue()
                except Exception as data_error:
                    st.error(f"  ❌ Ошибка чтения данных файла: {str(data_error)}")
                    continue
                
                if not file_data:
                    st.warning(f"  ⚠️ Файл `{file.name}` пустой (0 байт), пропускаем")
                    continue
                
                st.write(f"  📊 **Размер данных:** {len(file_data)} байт")
                
                # Save file with verification
                try:
                    with open(file_path, "wb") as f:
                        bytes_written = f.write(file_data)
                    st.write(f"  💾 **Записано байт:** {bytes_written}")
                except Exception as write_error:
                    st.error(f"  ❌ Ошибка записи файла: {str(write_error)}")
                    continue
                
                # Immediate verification
                verification_success = False
                try:
                    if os.path.exists(file_path):
                        actual_size = os.path.getsize(file_path)
                        if actual_size == len(file_data) and actual_size > 0:
                            verification_success = True
                            st.success(f"  ✅ **ВЕРИФИКАЦИЯ УСПЕШНА:** файл существует, размер совпадает ({actual_size} байт)")
                        else:
                            st.error(f"  ❌ Размер не совпадает: ожидали {len(file_data)}, получили {actual_size}")
                    else:
                        st.error(f"  ❌ Файл не найден после записи: `{file_path}`")
                except Exception as verify_error:
                    st.error(f"  ❌ Ошибка верификации: {str(verify_error)}")
                
                if verification_success:
                    uploaded_paths.append(file_path)
                    
                    # Additional verification after small delay
                    time.sleep(0.1)
                    if os.path.exists(file_path):
                        st.success(f"  🎉 **Файл успешно сохранен:** `{os.path.basename(file_path)}`")
                    else:
                        st.warning(f"  ⚠️ Файл исчез после сохранения!")
                else:
                    st.error(f"  ❌ **Файл НЕ сохранился:** `{file.name}`")
                
                st.write("---")
                    
            except Exception as e:
                st.error(f"❌ **Критическая ошибка при обработке `{file.name}`:** {str(e)}")
                import traceback
                with st.expander("🔍 Подробности ошибки"):
                    st.code(traceback.format_exc())
                continue
    
    progress_bar.progress(1.0)
    
    # Final summary
    if uploaded_paths:
        st.success(f"🎉 **ИТОГО: Успешно загружено {len(uploaded_paths)} из {len(files)} файлов**")
        st.success(f"🎉 **GESAMT: {len(uploaded_paths)} von {len(files)} Dateien erfolgreich hochgeladen**")
        
        with st.expander("📋 Список загруженных файлов", expanded=False):
            for i, path in enumerate(uploaded_paths, 1):
                file_size = os.path.getsize(path) if os.path.exists(path) else 0
                st.write(f"  {i}. `{os.path.basename(path)}` ({file_size} байт)")
    else:
        st.error("❌ **Ни один файл не был загружен!**")
        st.error("❌ **Keine Dateien wurden hochgeladen!**")
    
    return uploaded_paths

def display_file(file_path, file_title="Файл"):
    """Enhanced display file content with comprehensive diagnostic logging"""
    if not file_path:
        st.error("❌ Путь к файлу не указан")
        st.error("❌ Dateipfad nicht angegeben")
        return False
    
    import os
    import base64
    
    # === DIAGNOSTIC LOGGING START ===
    st.info("🔍 **Диагностика файла / File Diagnostics**")
    
    with st.expander("🛠️ Техническая информация / Technical Info", expanded=False):
        st.write(f"**Исходный путь:** `{file_path}`")
        st.write(f"**Рабочая директория:** `{os.getcwd()}`")
        
        # Clean and normalize file path
        clean_path = file_path.strip()
        # Remove leading slash if present to avoid double slashes
        if clean_path.startswith('/'):
            clean_path = clean_path[1:]
        
        st.write(f"**Очищенный путь:** `{clean_path}`")
        st.write(f"**Абсолютный путь:** `{os.path.abspath(clean_path)}`")
        
        # Directory analysis
        dir_path = os.path.dirname(clean_path)
        st.write(f"**Директория:** `{dir_path}`")
        st.write(f"**Директория существует:** {os.path.exists(dir_path)}")
        
        if os.path.exists(dir_path):
            try:
                files_in_dir = os.listdir(dir_path)
                st.write(f"**Файлов в директории:** {len(files_in_dir)}")
                
                # Show first few files for reference
                if files_in_dir:
                    st.write("**Примеры файлов в директории:**")
                    for i, filename in enumerate(files_in_dir[:5]):
                        file_size = os.path.getsize(os.path.join(dir_path, filename))
                        st.write(f"  - `{filename}` ({file_size} байт)")
                        if i >= 4:
                            break
                    if len(files_in_dir) > 5:
                        st.write(f"  ... и еще {len(files_in_dir) - 5} файлов")
            except Exception as e:
                st.write(f"**Ошибка чтения директории:** {str(e)}")
        
        # File status check
        st.write(f"**Файл существует:** {os.path.exists(clean_path)}")
        
        if os.path.exists(clean_path):
            try:
                file_stat = os.stat(clean_path)
                st.write(f"**Размер файла:** {file_stat.st_size} байт")
                st.write(f"**Права доступа:** {oct(file_stat.st_mode)[-3:]}")
                st.write(f"**Можно читать:** {os.access(clean_path, os.R_OK)}")
                st.write(f"**Время изменения:** {file_stat.st_mtime}")
            except Exception as e:
                st.write(f"**Ошибка получения информации о файле:** {str(e)}")
    
    # === DIAGNOSTIC LOGGING END ===
    
    # Check if file exists
    if not os.path.exists(clean_path):
        st.error(f"❌ **Файл не найден на диске**")
        st.error(f"❌ **Datei nicht auf Festplatte gefunden**")
        
        # Enhanced error information
        st.error(f"🔍 **Искомый путь:** `{clean_path}`")
        st.error(f"🔍 **Suchpfad:** `{clean_path}`")
        
        # Suggest similar files if directory exists
        dir_path = os.path.dirname(clean_path)
        if os.path.exists(dir_path):
            try:
                similar_files = [f for f in os.listdir(dir_path) 
                               if f.lower().endswith(('.pdf', '.jpg', '.png', '.gif', '.doc', '.docx'))]
                if similar_files:
                    st.info(f"💡 **Найдены похожие файлы в директории ({len(similar_files)}):**")
                    for similar_file in similar_files[:3]:
                        st.write(f"  - `{similar_file}`")
                    if len(similar_files) > 3:
                        st.write(f"  ... и еще {len(similar_files) - 3} файлов")
            except Exception as e:
                st.warning(f"Не удалось проверить похожие файлы: {str(e)}")
        
        return False
    
    # Get file extension and info
    file_ext = clean_path.split('.')[-1].lower() if '.' in clean_path else ''
    file_size = os.path.getsize(clean_path)
    file_name = os.path.basename(clean_path)
    
    # File size formatting
    if file_size < 1024:
        size_str = f"{file_size} байт"
    elif file_size < 1024*1024:
        size_str = f"{file_size//1024} КБ"
    else:
        size_str = f"{file_size//(1024*1024)} МБ"
    
    try:
        # Images
        if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico']:
            st.success(f"🖼️ **{file_name}** ({size_str})")
            st.image(clean_path, caption=file_title, use_container_width=True)
            _add_download_button(clean_path, file_name)
            return True
        
        # PDF files - Enhanced viewer
        elif file_ext == 'pdf':
            st.success(f"📄 **PDF документ:** {file_name} ({size_str})")
            
            # Create tabs for different viewing options
            tab1, tab2 = st.tabs(["📖 Просмотр / Ansicht", "⬇️ Скачать / Download"])
            
            with tab1:
                _display_pdf_inline(clean_path, file_title)
            
            with tab2:
                _add_download_button(clean_path, file_name, "application/pdf")
            return True
        
        # Text files
        elif file_ext in ['txt', 'md', 'log', 'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c']:
            st.success(f"📝 **Текстовый файл:** {file_name} ({size_str})")
            
            # Try to read as text with encoding detection
            try:
                with open(clean_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                try:
                    with open(clean_path, 'r', encoding='cp1251') as f:
                        content = f.read()
                except UnicodeDecodeError:
                    with open(clean_path, 'r', encoding='latin1') as f:
                        content = f.read()
            
            # Display with appropriate formatting
            if file_ext == 'csv':
                try:
                    import pandas as pd
                    df = pd.read_csv(clean_path)
                    st.dataframe(df, use_container_width=True)
                except Exception:
                    st.code(content, language='csv')
            elif file_ext == 'json':
                st.json(content)
            elif file_ext in ['py', 'java', 'cpp', 'c', 'js', 'html', 'css', 'xml']:
                st.code(content, language=file_ext)
            elif file_ext == 'md':
                st.markdown(content)
            else:
                st.text_area("Содержимое файла:", content, height=400)
            
            _add_download_button(clean_path, file_name)
            return True
        
        # Video files
        elif file_ext in ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']:
            st.success(f"🎥 **Видео:** {file_name} ({size_str})")
            
            # Create video player
            if file_ext in ['mp4', 'webm']:
                st.video(clean_path)
            else:
                st.info("💡 Используйте кнопку скачивания для просмотра видео")
                st.info("💡 Nutzen Sie den Download-Button zum Ansehen des Videos")
            
            _add_download_button(clean_path, file_name)
            return True
        
        # Audio files
        elif file_ext in ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']:
            st.success(f"🎵 **Аудио:** {file_name} ({size_str})")
            st.audio(clean_path)
            _add_download_button(clean_path, file_name)
            return True
        
        # Office documents
        elif file_ext in ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt']:
            format_name = {
                'docx': 'Word документ', 'doc': 'Word документ',
                'xlsx': 'Excel таблица', 'xls': 'Excel таблица', 
                'pptx': 'PowerPoint презентация', 'ppt': 'PowerPoint презентация'
            }.get(file_ext, 'Office документ')
            
            st.success(f"📊 **{format_name}:** {file_name} ({size_str})")
            st.info("💡 Используйте кнопку скачивания для открытия в соответствующем приложении")
            st.info("💡 Nutzen Sie den Download-Button zum Öffnen in der entsprechenden App")
            _add_download_button(clean_path, file_name)
            return True
        
        # Archive files  
        elif file_ext in ['zip', 'rar', '7z', 'tar', 'gz']:
            st.success(f"📦 **Архив:** {file_name} ({size_str})")
            st.info("💡 Используйте кнопку скачивания для извлечения файлов")
            st.info("💡 Nutzen Sie den Download-Button zum Extrahieren der Dateien")
            _add_download_button(clean_path, file_name)
            return True
        
        # Unknown format
        else:
            st.warning(f"📎 **Неизвестный формат:** {file_name} ({size_str})")
            st.info("💡 Файл можно скачать для просмотра в подходящем приложении")
            st.info("💡 Datei kann heruntergeladen werden zur Ansicht in geeigneter App")
            _add_download_button(clean_path, file_name)
            return True
            
    except Exception as e:
        st.error(f"Ошибка отображения файла: {str(e)}")
        st.error(f"Dateianzeigefehler: {str(e)}")
        st.write(f"Путь: {clean_path}")
        # Fallback download button
        _add_download_button(clean_path, file_name)
        return False

def _display_pdf_inline(file_path, title):
    """Display PDF inline using pdf2image conversion with improved error handling"""
    try:
        from pdf2image import convert_from_path
        from PIL import Image
        import tempfile
        import os
        import subprocess
        
        # Check if poppler is available
        try:
            result = subprocess.run(['pdftoppm', '-v'], capture_output=True, text=True)
            if result.returncode != 0:
                raise FileNotFoundError("pdftoppm not found")
        except FileNotFoundError:
            st.warning("⚠️ PDF просмотр недоступен - poppler не установлен")
            st.warning("⚠️ PDF-Ansicht nicht verfügbar - poppler nicht installiert") 
            st.info("💡 Используйте кнопку скачивания для просмотра PDF")
            st.info("💡 Nutzen Sie den Download-Button für die PDF-Ansicht")
            return
        
        # Convert PDF to images
        with st.spinner("🔄 Конвертация PDF для просмотра..."):
            try:
                # Convert only first 5 pages to avoid memory issues
                pages = convert_from_path(file_path, first_page=1, last_page=5, dpi=150, thread_count=1)
                
                if not pages:
                    st.error("❌ Не удалось конвертировать PDF страницы")
                    return
                
                st.info(f"📄 Показаны первые {len(pages)} страниц из PDF")
                st.info(f"📄 Erste {len(pages)} Seiten der PDF werden angezeigt")
                
                # Display each page as image
                for i, page in enumerate(pages, 1):
                    st.markdown(f"**Страница {i} / Seite {i}**")
                    
                    # Convert PIL image to format Streamlit can display
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                        try:
                            page.save(tmp_file.name, 'PNG')
                            st.image(tmp_file.name, use_container_width=True)
                        finally:
                            # Clean up temp file
                            try:
                                os.unlink(tmp_file.name)
                            except:
                                pass  # Ignore cleanup errors
                    
                    if i < len(pages):
                        st.divider()
                        
            except Exception as convert_error:
                st.error(f"❌ Ошибка при конвертации PDF: {str(convert_error)}")
                st.info("💡 Попробуйте скачать файл для просмотра")
                st.info("💡 Versuchen Sie die Datei herunterzuladen")
    
    except ImportError as import_error:
        st.warning("⚠️ PDF просмотр недоступен - отсутствуют необходимые библиотеки")
        st.warning("⚠️ PDF-Ansicht nicht verfügbar - erforderliche Bibliotheken fehlen")
        st.info("💡 Используйте кнопку скачивания")
        st.info("💡 Nutzen Sie den Download-Button")
    except Exception as e:
        st.error(f"❌ Общая ошибка PDF просмотра: {str(e)}")
        st.info("💡 Попробуйте скачать файл для просмотра")
        st.info("💡 Versuchen Sie die Datei herunterzuladen")

def _add_download_button(file_path, file_name, mime_type=None):
    """Add download button for file"""
    try:
        with open(file_path, "rb") as f:
            file_data = f.read()
        
        st.download_button(
            label=f"⬇️ **Скачать файл**\n**Datei herunterladen**",
            data=file_data,
            file_name=file_name,
            mime=mime_type,
            use_container_width=True
        )
    except Exception as e:
        st.error(f"Ошибка подготовки скачивания: {str(e)}")

def get_document_types():
    """Get document types mapping based on database enum"""
    return {
        'fahrzeugschein': 'Fahrzeugschein/Регистрация',
        'fahrzeugbrief': 'Fahrzeugbrief/Техпаспорт', 
        'tuv_certificate': 'TÜV/Техосмотр',
        'insurance': 'Versicherung/Страховка',
        'purchase_contract': 'Kaufvertrag/Договор покупки',
        'rental_contract': 'Mietvertrag/Договор аренды',
        'vehicle_photo': 'Fahrzeugfoto/Фото автомобиля',
        'service_book': 'Serviceheft/Сервисная книжка',
        'expense_report': 'Kostennachweis/Отчет о расходах',
        'lease_contract': 'Leasingvertrag/Договор лизинга',
        'tax_document': 'Steuerdokument/Налоговый документ',
        'operation_permit': 'Betriebserlaubnis/Разрешение на эксплуатацию'
    }

def get_documents_with_sort(sort_by='title', sort_direction='asc', type_filter='all', vehicle_filter='all', search_term=''):
    """Get documents with sorting and filtering"""
    try:
        # Base query
        base_query = """
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
                    WHEN vd.date_expiry IS NULL THEN 'valid'
                    WHEN vd.date_expiry < CURRENT_DATE THEN 'expired'
                    WHEN vd.date_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
                    ELSE 'valid'
                END as status
            FROM vehicle_documents vd
            JOIN vehicles v ON vd.vehicle_id = v.id
            WHERE vd.is_active = true
        """
        
        params = {}
        
        # Add filters
        if type_filter != 'all':
            base_query += " AND vd.document_type = :type_filter"
            params['type_filter'] = type_filter
        
        if vehicle_filter != 'all':
            base_query += " AND vd.vehicle_id = :vehicle_filter"
            params['vehicle_filter'] = vehicle_filter
        
        if search_term:
            base_query += " AND (vd.title ILIKE :search_term OR v.name ILIKE :search_term)"
            params['search_term'] = f'%{search_term}%'
        
        # Add sorting
        sort_column = {
            'title': 'vd.title',
            'document_type': 'vd.document_type',
            'date_issued': 'vd.date_issued',
            'date_expiry': 'vd.date_expiry',
            'vehicle_name': 'v.name'
        }.get(sort_by, 'vd.title')
        
        sort_dir = 'DESC' if sort_direction == 'desc' else 'ASC'
        base_query += f" ORDER BY {sort_column} {sort_dir}, vd.title ASC"
        
        return execute_query(base_query, params) or []
        
    except Exception as e:
        st.error(f"Error loading documents: {str(e)}")
        return []

def delete_document(document_id):
    """Delete a document"""
    try:
        execute_query("""
            UPDATE vehicle_documents 
            SET is_active = false 
            WHERE id = :id
        """, {'id': document_id})
        st.success("Документ удален")
        st.rerun()
    except Exception as e:
        st.error(f"Ошибка удаления документа: {str(e)}")

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

def ensure_directory_exists(directory_path):
    """Ensure directory exists, create if not"""
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)
