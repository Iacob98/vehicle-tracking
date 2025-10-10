import streamlit as st
import uuid
from datetime import date
from database import execute_query
from translations import get_text
from utils import format_currency, upload_file, upload_multiple_files
from auth import require_auth, show_org_header

# Page config
st.set_page_config(
    page_title="Штрафы",
    page_icon="🚧",
    layout="wide"
)

# Require authentication
require_auth()
show_org_header()

# Language from session state
language = st.session_state.get('language', 'ru')

@st.cache_data(ttl=300)
def get_penalties_cached():
    """Get penalties with caching"""
    return execute_query("""
        SELECT 
            p.id,
            p.date,
            v.name as vehicle_name,
            v.license_plate,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            p.amount,
            p.status,
            p.photo_url
        FROM penalties p
        LEFT JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE (p.description IS NULL OR p.description NOT LIKE '%Поломка материала%')
        ORDER BY p.date DESC
    """)

def show_penalty_photo_viewer(penalty_id, photo_url, title):
    """Show photo viewer for penalty"""
    st.header(f"📷 Фото штрафа: {title}")
    
    if st.button("⬅️ Назад к списку / Zurück zur Liste", use_container_width=True):
        if f"view_penalty_photo_{penalty_id}" in st.session_state:
            del st.session_state[f"view_penalty_photo_{penalty_id}"]
        st.rerun()
    
    if not photo_url:
        st.warning("Фото не найдено / Foto nicht gefunden")
        return
    
    # Split multiple photo URLs if they exist (semicolon separated)
    photo_urls = photo_url.split(';') if ';' in photo_url else [photo_url]
    
    if len(photo_urls) > 1:
        st.info(f"Всего фотографий: {len(photo_urls)} / Insgesamt Fotos: {len(photo_urls)}")
    
    # File info
    file_name = photo_url.split('/')[-1]
    file_extension = file_name.split('.')[-1].lower() if '.' in file_name else ''
    
    # Create main layout
    col_main, col_sidebar = st.columns([3, 1])
    
    with col_main:
        # Display all images
        for i, single_photo_url in enumerate(photo_urls, 1):
            if single_photo_url.strip():  # Check if URL is not empty
                file_name = single_photo_url.split('/')[-1]
                file_extension = file_name.split('.')[-1].lower() if '.' in file_name else ''
                
                if len(photo_urls) > 1:
                    st.subheader(f"Фото {i}")
                
                st.info(f"📁 **Файл:** {file_name}")
                
                # Display image
                if file_extension in ['jpg', 'jpeg', 'png', 'gif']:
                    try:
                        import os
                        if single_photo_url.startswith('/'):
                            file_path = single_photo_url.lstrip('/')
                            if os.path.exists(file_path):
                                st.image(file_path, caption=f"{title} - Фото {i}" if len(photo_urls) > 1 else title, use_container_width=True)
                            else:
                                st.error("🚫 Файл изображения не найден/Bilddatei nicht gefunden")
                        else:
                            st.image(single_photo_url, caption=f"{title} - Фото {i}" if len(photo_urls) > 1 else title, use_container_width=True)
                    except Exception as e:
                        st.error(f"❌ Ошибка загрузки изображения/Fehler beim Laden des Bildes: {str(e)}")
                else:
                    st.warning(f"📎 **Неподдерживаемый формат файла: .{file_extension}**")
                    st.info("💡 Поддерживаются только изображения: JPG, PNG, GIF")
                
                if i < len(photo_urls):  # Add separator except for last image
                    st.divider()
    
    with col_sidebar:
        st.markdown("### Действия / Aktionen")
        
        try:
            import os
            if photo_url.startswith('/'):
                # Local file
                file_path = photo_url.lstrip('/')
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
                st.markdown(f"🔗 [Скачать файл/Datei herunterladen]({photo_url})")
        except Exception as e:
            st.error("❌ Ошибка доступа к файлу")

def show_penalties_list():
    """Show list of penalties"""
    try:
        # Check if we're editing a penalty
        edit_penalty_id = st.session_state.get('edit_penalty_id', None)
        
        if edit_penalty_id:
            show_edit_penalty_form(edit_penalty_id)
            return
        
        # Check if we need to show payment form
        payment_penalty_id = None
        for key in st.session_state:
            if key.startswith("show_payment_") and st.session_state[key]:
                payment_penalty_id = key.replace("show_payment_", "")
                break
        
        if payment_penalty_id:
            show_payment_form(payment_penalty_id)
            return
        
        # Check if any photo is being viewed
        view_penalty_id = None
        for key in st.session_state:
            if key.startswith("view_penalty_photo_") and st.session_state[key]:
                view_penalty_id = key.replace("view_penalty_photo_", "")
                break
        
        if view_penalty_id:
            # Get penalty info for photo viewing
            penalty_info = execute_query("""
                SELECT 
                    v.name as vehicle_name,
                    v.license_plate,
                    p.photo_url
                FROM penalties p
                LEFT JOIN vehicles v ON p.vehicle_id = v.id
                WHERE p.id = :id
            """, {'id': view_penalty_id})
            
            if penalty_info and penalty_info[0][2]:  # photo_url exists
                title = f"{penalty_info[0][0]} ({penalty_info[0][1]})"
                show_penalty_photo_viewer(view_penalty_id, penalty_info[0][2], title)
                return
        
        penalties = get_penalties_cached()
        
        if penalties:
            # Summary statistics
            total_amount = sum(float(penalty[5]) for penalty in penalties)
            open_amount = sum(float(penalty[5]) for penalty in penalties if penalty[6] == 'open')
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Всего штрафов/Strafen insgesamt", len(penalties))
            with col2:
                st.metric("Общая сумма/Gesamtbetrag", format_currency(total_amount))
            with col3:
                st.metric("К оплате/Zu zahlen", format_currency(open_amount))
            
            st.divider()
            
            # Display penalties
            for penalty in penalties:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{penalty[2]}** ({penalty[3]})")
                        if penalty[4]:
                            st.write(f"👤 {penalty[4]}")
                        penalty_date = penalty[1].strftime('%d.%m.%Y') if penalty[1] else ''
                        st.write(f"📅 {penalty_date}")
                    
                    with col2:
                        st.write(f"💰 {format_currency(penalty[5])}")
                        status_icon = '🔴' if penalty[6] == 'open' else '🟢'
                        st.write(f"{status_icon} {get_text(penalty[6], language)}")
                    
                    with col3:
                        if penalty[7]:  # photo_url
                            st.write("📷 Фото есть/Foto vorhanden")
                            if st.button("👁️", key=f"view_photo_{penalty[0]}", help="Посмотреть фото"):
                                st.session_state[f"view_penalty_photo_{penalty[0]}"] = True
                                st.rerun()
                        else:
                            st.write("📷 Нет фото/Kein Foto")
                    
                    with col4:
                        # Action buttons
                        if st.button("✏️", key=f"edit_penalty_{penalty[0]}", help="Редактировать"):
                            st.session_state.edit_penalty_id = penalty[0]
                            st.rerun()
                        
                        col_pay, col_del = st.columns(2)
                        if penalty[6] == 'open':
                            with col_pay:
                                if st.button(f"✅", key=f"pay_{penalty[0]}", help="Оплатить"):
                                    st.session_state[f"show_payment_{penalty[0]}"] = True
                                    st.rerun()
                        with col_del:
                            if st.button(f"🗑️", key=f"delete_{penalty[0]}", help="Удалить"):
                                delete_penalty(penalty[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading penalties: {str(e)}")

def show_add_penalty_form():
    """Show form to add new penalty"""
    with st.form("add_penalty"):
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
            
            # Team selection
            teams = execute_query("SELECT id, name FROM teams ORDER BY name")
            if not teams:
                st.warning("Необходимо создать бригады")
                return
            
            team_id = st.selectbox(
                "Бригада/Team",
                options=[t[0] for t in teams],
                format_func=lambda x: next((t[1] for t in teams if t[0] == x), x)
            )
            
            # User selection from selected team
            users = execute_query("""
                SELECT id, first_name || ' ' || last_name as full_name 
                FROM users 
                WHERE team_id = :team_id OR id = (
                    SELECT lead_id FROM teams WHERE id = :team_id
                )
                ORDER BY first_name
            """, {'team_id': team_id})
            
            user_id = None
            if users:
                user_id = st.selectbox(
                    "Пользователь/Benutzer",
                    options=[None] + [u[0] for u in users],
                    format_func=lambda x: "Не указан" if x is None else next((u[1] for u in users if u[0] == x), x)
                )
        
        with col2:
            penalty_date = st.date_input(
                "Дата/Datum",
                value=date.today()
            )
            
            amount = st.number_input(
                "Сумма/Betrag (€)",
                min_value=0.0,
                step=10.0,
                value=100.0
            )
            
            # File upload
            uploaded_files = st.file_uploader(
                "Фото/Fotos",
                type=['jpg', 'jpeg', 'png'],
                accept_multiple_files=True,
                help="Можно загрузить несколько фотографий одновременно"
            )
            
            if uploaded_files:
                st.info(f"Выбрано {len(uploaded_files)} файл(ов): {', '.join([f.name for f in uploaded_files])}")
        
        description = st.text_area(
            "Описание/Beschreibung"
        )
        
        if st.form_submit_button(get_text('save', language)):
            try:
                photo_urls = []
                if uploaded_files:
                    photo_urls = upload_multiple_files(uploaded_files, 'penalties')
                
                # Join multiple photo URLs with semicolon separator
                photo_url = ';'.join(photo_urls) if photo_urls else None
                
                penalty_id = str(uuid.uuid4())
                execute_query("""
                    INSERT INTO penalties 
                    (id, organization_id, vehicle_id, team_id, user_id, amount, date, status, description, photo_url)
                    VALUES (:id, :organization_id, :vehicle_id, :team_id, :user_id, :amount, :date, 'open', :description, :photo_url)
                """, {
                    'id': penalty_id,
                    'organization_id': st.session_state.get('organization_id'),
                    'vehicle_id': vehicle_id,
                    'team_id': team_id,
                    'user_id': user_id,
                    'amount': amount,
                    'date': penalty_date,
                    'description': description if description else None,
                    'photo_url': photo_url
                })
                st.success(get_text('success_save', language))
                get_penalties_cached.clear()  # Clear cache
                st.rerun()
            except Exception as e:
                st.error(f"Error: {str(e)}")

def show_payment_form(penalty_id):
    """Show payment form with receipt upload requirement"""
    penalty_data = execute_query("""
        SELECT p.amount, p.description, v.name as vehicle_name, v.license_plate,
               CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM penalties p
        LEFT JOIN vehicles v ON p.vehicle_id = v.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = :id
    """, {'id': penalty_id})
    
    if not penalty_data:
        st.error("Штраф не найден")
        return
        
    penalty = penalty_data[0]
    
    st.subheader("💳 Отметить как оплаченный / Als bezahlt markieren")
    st.info(f"**Сумма штрафа:** {format_currency(penalty[0])}")
    if penalty[1]:
        st.info(f"**Описание:** {penalty[1]}")
    
    with st.form("payment_form"):
        st.warning("⚠️ **Обязательно прикрепите чек об оплате / Receipt photo required**")
        
        uploaded_receipt = st.file_uploader(
            "📄 Загрузите фото чека / Upload receipt photo *",
            type=['jpg', 'jpeg', 'png', 'pdf'],
            help="Обязательное поле для подтверждения оплаты"
        )
        
        payment_notes = st.text_area(
            "📝 Примечания к оплате / Payment notes",
            placeholder="Дополнительная информация об оплате..."
        )
        
        col1, col2 = st.columns(2)
        
        with col1:
            if st.form_submit_button("💳 Подтвердить оплату / Confirm Payment", type="primary"):
                if not uploaded_receipt:
                    st.error("❌ Необходимо загрузить фото чека! / Receipt photo required!")
                else:
                    try:
                        # Upload receipt file
                        receipt_url = upload_file(uploaded_receipt, 'penalty_receipts')
                        
                        # Update penalty status and add receipt
                        execute_query("""
                            UPDATE penalties 
                            SET status = 'paid', 
                                description = CASE 
                                    WHEN description IS NULL THEN :payment_notes
                                    WHEN :payment_notes IS NULL OR :payment_notes = '' THEN description
                                    ELSE description || ' | Оплачено: ' || :payment_notes
                                END,
                                photo_url = CASE 
                                    WHEN photo_url IS NULL THEN :receipt_url
                                    ELSE photo_url || ',' || :receipt_url
                                END
                            WHERE id = :id
                        """, {
                            'id': penalty_id,
                            'receipt_url': receipt_url,
                            'payment_notes': payment_notes if payment_notes else None
                        })
                        
                        st.success("✅ Штраф отмечен как оплаченный! / Penalty marked as paid!")
                        get_penalties_cached.clear()
                        if f'show_payment_{penalty_id}' in st.session_state:
                            del st.session_state[f'show_payment_{penalty_id}']
                        st.rerun()
                        
                    except Exception as e:
                        st.error(f"Ошибка при обработке оплаты: {str(e)}")
        
        with col2:
            if st.form_submit_button("❌ Отмена / Cancel"):
                if f'show_payment_{penalty_id}' in st.session_state:
                    del st.session_state[f'show_payment_{penalty_id}']
                st.rerun()

def show_edit_penalty_form(penalty_id):
    """Show form to edit existing penalty"""
    try:
        # Get current penalty data
        penalty_data = execute_query("""
            SELECT p.vehicle_id, p.team_id, p.user_id, p.date, p.amount, p.status, p.photo_url, p.description,
                   v.name as vehicle_name, v.license_plate,
                   t.name as team_name,
                   CONCAT(u.first_name, ' ', u.last_name) as user_name
            FROM penalties p
            LEFT JOIN vehicles v ON p.vehicle_id = v.id
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = :id
        """, {'id': penalty_id})
        
        if not penalty_data:
            st.error("Штраф не найден")
            if st.button("⬅️ Назад к списку"):
                del st.session_state.edit_penalty_id
                st.rerun()
            return
        
        current_penalty = penalty_data[0]
        
        st.subheader("✏️ Редактировать штраф / Strafe bearbeiten")
        
        if st.button("⬅️ Назад к списку / Zurück zur Liste"):
            del st.session_state.edit_penalty_id
            st.rerun()
        
        with st.form("edit_penalty"):
            col1, col2 = st.columns(2)
            
            with col1:
                # Vehicle selection
                vehicles = execute_query("SELECT id, name, license_plate FROM vehicles ORDER BY name")
                if not vehicles:
                    st.warning("Необходимо создать автомобили")
                    return
                
                current_vehicle_index = 0
                if current_penalty[0]:
                    try:
                        current_vehicle_index = [v[0] for v in vehicles].index(current_penalty[0])
                    except ValueError:
                        current_vehicle_index = 0
                
                vehicle_id = st.selectbox(
                    get_text('vehicles', language),
                    options=[v[0] for v in vehicles],
                    format_func=lambda x: next((f"{v[1]} ({v[2]})" for v in vehicles if v[0] == x), x),
                    index=current_vehicle_index
                )
                
                # Team selection
                teams = execute_query("SELECT id, name FROM teams ORDER BY name")
                if not teams:
                    st.warning("Необходимо создать бригады")
                    return
                
                current_team_index = 0
                if current_penalty[1]:  # team_id is at index 1 now
                    try:
                        current_team_index = [t[0] for t in teams].index(current_penalty[1])
                    except ValueError:
                        current_team_index = 0
                
                team_id = st.selectbox(
                    "Бригада/Team",
                    options=[t[0] for t in teams],
                    format_func=lambda x: next((t[1] for t in teams if t[0] == x), x),
                    index=current_team_index
                )
                
                # User selection from selected team
                users = execute_query("""
                    SELECT id, first_name || ' ' || last_name as full_name 
                    FROM users 
                    WHERE team_id = :team_id OR id = (
                        SELECT lead_id FROM teams WHERE id = :team_id
                    )
                    ORDER BY first_name
                """, {'team_id': team_id})
                
                user_options = [None] + [u[0] for u in users] if users else [None]
                current_user_index = 0
                if current_penalty[2] and users:  # user_id is at index 2 now
                    try:
                        current_user_index = user_options.index(current_penalty[2])
                    except ValueError:
                        current_user_index = 0
                
                user_id = st.selectbox(
                    "Пользователь/Benutzer",
                    options=user_options,
                    index=current_user_index,
                    format_func=lambda x: "Не указан" if x is None else next((u[1] for u in users if users and u[0] == x), str(x))
                )
            
            with col2:
                penalty_date = st.date_input(
                    "Дата/Datum",
                    value=current_penalty[3] if current_penalty[3] else date.today()  # date is at index 3
                )
                
                amount = st.number_input(
                    "Сумма/Betrag (€)",
                    min_value=0.0,
                    step=10.0,
                    value=float(current_penalty[4]) if current_penalty[4] else 100.0  # amount is at index 4
                )
                
                status_options = ['open', 'paid']
                current_status_index = 0
                if current_penalty[5] in status_options:  # status is at index 5
                    current_status_index = status_options.index(current_penalty[5])
                
                status = st.selectbox(
                    get_text('status', language),
                    options=status_options,
                    index=current_status_index,
                    format_func=lambda x: get_text(x, language)
                )
                
                # File upload
                if current_penalty[6]:  # photo_url is at index 6
                    st.info(f"Текущее фото: {current_penalty[6].split('/')[-1]}")
                
                uploaded_files = st.file_uploader(
                    "Новые фото/Neue Fotos",
                    type=['jpg', 'jpeg', 'png'],
                    accept_multiple_files=True,
                    help="Можно добавить несколько новых фотографий одновременно / Mehrere neue Fotos gleichzeitig hinzufügen"
                )
                
                if uploaded_files:
                    st.info(f"Выбрано {len(uploaded_files)} новых файл(ов): {', '.join([f.name for f in uploaded_files])}")
            
            description = st.text_area(
                "Описание/Beschreibung",
                value=current_penalty[7] or ""  # description is at index 7
            )
            
            col_save, col_cancel = st.columns(2)
            with col_save:
                if st.form_submit_button("💾 Сохранить / Speichern", type="primary"):
                    try:
                        # Handle photo updates
                        existing_photo_url = current_penalty[6]  # Keep existing photo (photo_url is at index 6)
                        photo_url = existing_photo_url
                        
                        if uploaded_files:
                            # Upload new files
                            new_photo_urls = upload_multiple_files(uploaded_files, 'penalties')
                            
                            if new_photo_urls:
                                # Combine existing and new photos
                                existing_photos = existing_photo_url.split(';') if existing_photo_url and ';' in existing_photo_url else ([existing_photo_url] if existing_photo_url else [])
                                all_photos = existing_photos + new_photo_urls
                                # Remove empty entries and join with semicolon
                                photo_url = ';'.join([p for p in all_photos if p.strip()])
                        
                        execute_query("""
                            UPDATE penalties 
                            SET vehicle_id = :vehicle_id, team_id = :team_id, user_id = :user_id, date = :date, 
                                amount = :amount, status = :status, photo_url = :photo_url, description = :description
                            WHERE id = :id
                        """, {
                            'id': penalty_id,
                            'vehicle_id': vehicle_id,
                            'team_id': team_id,
                            'user_id': user_id,
                            'date': penalty_date,
                            'amount': amount,
                            'status': status,
                            'photo_url': photo_url,
                            'description': description if description else None
                        })
                        st.success("Штраф обновлен / Strafe aktualisiert")
                        get_penalties_cached.clear()  # Clear cache
                        del st.session_state.edit_penalty_id
                        st.rerun()
                    except Exception as e:
                        st.error(f"Ошибка обновления: {str(e)}")
            
            with col_cancel:
                if st.form_submit_button("❌ Отмена / Abbrechen"):
                    del st.session_state.edit_penalty_id
                    st.rerun()
                    
    except Exception as e:
        st.error(f"Ошибка загрузки данных: {str(e)}")
        if st.button("⬅️ Назад к списку"):
            if 'edit_penalty_id' in st.session_state:
                del st.session_state.edit_penalty_id
            st.rerun()

def delete_penalty(penalty_id):
    """Delete penalty"""
    try:
        execute_query("DELETE FROM penalties WHERE id = :id", {'id': penalty_id})
        st.success(get_text('success_delete', language))
        get_penalties_cached.clear()  # Clear cache
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Main page
st.title(f"🚧 {get_text('penalties', language)}")

tab1, tab2 = st.tabs([
    get_text('penalties', language),
    get_text('add', language)
])

with tab1:
    show_penalties_list()

with tab2:
    show_add_penalty_form()