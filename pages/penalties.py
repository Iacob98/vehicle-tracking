import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, get_vehicles_for_select, get_users_for_select, upload_file, format_currency
from datetime import datetime, date
import uuid

def show_page(language='ru'):
    """Show penalties management page"""
    st.title(f"🚧 {get_text('penalties', language)}")
    
    # Tabs for different views
    tab1, tab2 = st.tabs([
        get_text('penalties', language),
        get_text('add', language)
    ])
    
    with tab1:
        show_penalties_list(language)
    
    with tab2:
        show_add_penalty_form(language)

def show_penalties_list(language='ru'):
    """Show list of penalties"""
    try:
        # Filters
        col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder="Автомобиль, пользователь... / Fahrzeug, Benutzer..."
            )
        
        with col2:
            status_filter = st.selectbox(
                get_text('status', language),
                options=['all', 'open', 'paid'],
                format_func=lambda x: get_text(x, language) if x != 'all' else 'Все/Alle'
            )
        
        with col3:
            date_from = st.date_input(
                "От/Von",
                value=None,
                key="penalty_date_from"
            )
        
        with col4:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_penalties_data(language)
        
        # Build query with filters
        query = """
            SELECT 
                p.id,
                p.date,
                v.name as vehicle_name,
                v.license_plate,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                p.amount,
                p.status,
                p.photo_url,
                p.description
            FROM penalties p
            JOIN vehicles v ON p.vehicle_id = v.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE (p.description IS NULL OR p.description NOT LIKE '%Поломка материала%')
        """
        params = {}
        
        if search_term:
            query += """ AND (
                v.name ILIKE :search OR 
                v.license_plate ILIKE :search OR
                u.first_name ILIKE :search OR
                u.last_name ILIKE :search
            )"""
            params['search'] = f"%{search_term}%"
        
        if status_filter != 'all':
            query += " AND p.status = :status"
            params['status'] = status_filter
        
        if date_from:
            query += " AND p.date >= :date_from"
            params['date_from'] = date_from
        
        query += " ORDER BY p.date DESC"
        
        penalties = execute_query(query, params)
        
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
                        else:
                            st.write("📷 Нет фото/Kein Foto")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_btn_penalty_{penalty[0]}"):
                            st.session_state[f"edit_penalty_{penalty[0]}"] = True
                        if st.button(f"🗑️", key=f"delete_penalty_{penalty[0]}"):
                            delete_penalty(penalty[0], language)
                        if penalty[6] == 'open' and st.button(f"✅", key=f"pay_penalty_{penalty[0]}"):
                            mark_penalty_paid(penalty[0], language)
                    
                    # Show edit form if requested
                    if st.session_state.get(f"edit_penalty_{penalty[0]}", False):
                        show_edit_penalty_form(penalty, language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading penalties: {str(e)}")

def show_add_penalty_form(language='ru'):
    """Show form to add new penalty"""
    st.subheader(f"{get_text('add', language)} {get_text('penalties', language)}")
    
    with st.form("add_penalty_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            # Vehicle selection
            vehicles = get_vehicles_for_select(language)
            if not vehicles:
                st.warning("Необходимо создать автомобили / Fahrzeuge müssen erstellt werden")
                return
            
            vehicle_id = st.selectbox(
                get_text('vehicles', language),
                options=[v[0] for v in vehicles],
                format_func=lambda x: next(v[1] for v in vehicles if v[0] == x),
                key="new_penalty_vehicle"
            )
            
            penalty_date = st.date_input(
                get_text('date', language),
                value=date.today(),
                key="new_penalty_date"
            )
            
            amount = st.number_input(
                get_text('amount', language),
                min_value=0.01,
                value=100.0,
                step=50.0,
                key="new_penalty_amount"
            )
        
        with col2:
            # User selection (optional)
            users = get_users_for_select(language)
            user_id = None
            if users:
                user_options = [('', 'Не выбран/Nicht ausgewählt')] + users
                selected_user = st.selectbox(
                    get_text('users', language),
                    options=[option[0] for option in user_options],
                    format_func=lambda x: next(option[1] for option in user_options if option[0] == x),
                    key="new_penalty_user"
                )
                user_id = selected_user if selected_user else None
            
            status = st.selectbox(
                get_text('status', language),
                options=['open', 'paid'],
                format_func=lambda x: get_text(x, language),
                key="new_penalty_status"
            )
            
            # Photo upload
            photo_file = st.file_uploader(
                "Фото документа/Foto des Dokuments",
                type=['png', 'jpg', 'jpeg'],
                key="new_penalty_photo"
            )
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            try:
                photo_url = upload_file(photo_file, 'penalties') if photo_file else None
                
                penalty_id = str(uuid.uuid4())
                execute_query("""
                    INSERT INTO penalties (id, vehicle_id, user_id, date, amount, photo_url, status)
                    VALUES (:id, :vehicle_id, :user_id, :date, :amount, :photo_url, :status)
                """, {
                    'id': penalty_id,
                    'vehicle_id': vehicle_id,
                    'user_id': user_id if user_id else None,
                    'date': penalty_date,
                    'amount': amount,
                    'photo_url': photo_url,
                    'status': status
                })
                st.success(get_text('success_save', language))
                st.rerun()
            except Exception as e:
                st.error(f"{get_text('error_save', language)}: {str(e)}")

def show_edit_penalty_form(penalty, language='ru'):
    """Show form to edit penalty"""
    with st.expander(f"✏️ {get_text('edit', language)}: {penalty[2]}", expanded=True):
        with st.form(f"edit_penalty_form_{penalty[0]}"):
            col1, col2 = st.columns(2)
            
            with col1:
                # Vehicle selection
                vehicles = get_vehicles_for_select(language)
                current_vehicle = next((v[0] for v in vehicles if penalty[2] in v[1]), vehicles[0][0] if vehicles else None)
                
                if vehicles:
                    vehicle_id = st.selectbox(
                        get_text('vehicles', language),
                        options=[v[0] for v in vehicles],
                        format_func=lambda x: next(v[1] for v in vehicles if v[0] == x),
                        index=[v[0] for v in vehicles].index(current_vehicle) if current_vehicle else 0,
                        key=f"edit_penalty_vehicle_{penalty[0]}"
                    )
                
                penalty_date = st.date_input(
                    get_text('date', language),
                    value=penalty[1],
                    key=f"edit_penalty_date_{penalty[0]}"
                )
                
                amount = st.number_input(
                    get_text('amount', language),
                    min_value=0.01,
                    value=float(penalty[5]),
                    step=50.0,
                    key=f"edit_penalty_amount_{penalty[0]}"
                )
            
            with col2:
                # User selection
                users = get_users_for_select(language)
                current_user = penalty[4]
                user_id = None
                
                if users:
                    user_options = [('', 'Не выбран/Nicht ausgewählt')] + users
                    current_index = 0
                    if current_user:
                        for i, option in enumerate(user_options):
                            if option[1] == current_user:
                                current_index = i
                                break
                    
                    selected_user = st.selectbox(
                        get_text('users', language),
                        options=[option[0] for option in user_options],
                        format_func=lambda x: next(option[1] for option in user_options if option[0] == x),
                        index=current_index,
                        key=f"edit_penalty_user_{penalty[0]}"
                    )
                    user_id = selected_user if selected_user else None
                
                status = st.selectbox(
                    get_text('status', language),
                    options=['open', 'paid'],
                    index=['open', 'paid'].index(penalty[6]),
                    format_func=lambda x: get_text(x, language),
                    key=f"edit_penalty_status_{penalty[0]}"
                )
                
                # Show current photo if exists
                if penalty[7]:  # photo_url
                    st.write(f"Текущее фото/Aktuelles Foto: {penalty[7]}")
                
                # Photo upload
                photo_file = st.file_uploader(
                    "Новое фото/Neues Foto",
                    type=['png', 'jpg', 'jpeg'],
                    key=f"edit_penalty_photo_{penalty[0]}"
                )
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                submitted = st.form_submit_button(get_text('save', language))
            
            with col_cancel:
                cancelled = st.form_submit_button(get_text('cancel', language))
            
            if submitted:
                try:
                    photo_url = penalty[7]  # Keep existing photo URL
                    if photo_file:
                        photo_url = upload_file(photo_file, 'penalties')
                    
                    execute_query("""
                        UPDATE penalties 
                        SET vehicle_id = :vehicle_id, user_id = :user_id, 
                            date = :date, amount = :amount, 
                            photo_url = :photo_url, status = :status
                        WHERE id = :id
                    """, {
                        'id': penalty[0],
                        'vehicle_id': vehicle_id,
                        'user_id': user_id if user_id else None,
                        'date': penalty_date,
                        'amount': amount,
                        'photo_url': photo_url,
                        'status': status
                    })
                    if f"edit_penalty_{penalty[0]}" in st.session_state:
                        del st.session_state[f"edit_penalty_{penalty[0]}"]
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")
            
            if cancelled:
                if f"edit_penalty_{penalty[0]}" in st.session_state:
                    del st.session_state[f"edit_penalty_{penalty[0]}"]
                st.rerun()

def mark_penalty_paid(penalty_id, language='ru'):
    """Mark penalty as paid"""
    try:
        execute_query("""
            UPDATE penalties SET status = 'paid' WHERE id = :id
        """, {'id': penalty_id})
        st.success("Штраф отмечен как оплаченный / Strafe als bezahlt markiert")
        st.rerun()
    except Exception as e:
        st.error(f"Error marking penalty as paid: {str(e)}")

def delete_penalty(penalty_id, language='ru'):
    """Delete penalty"""
    try:
        execute_query("DELETE FROM penalties WHERE id = :id", {'id': penalty_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"{get_text('error_delete', language)}: {str(e)}")

def export_penalties_data(language='ru'):
    """Export penalties data to CSV"""
    try:
        penalties = execute_query("""
            SELECT 
                p.date,
                v.name as vehicle_name,
                v.license_plate,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                p.amount,
                p.status
            FROM penalties p
            JOIN vehicles v ON p.vehicle_id = v.id
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.date DESC
        """)
        
        if penalties:
            export_to_csv(penalties, "penalties")
        else:
            st.warning(get_text('no_data', language))
    except Exception as e:
        st.error(f"Export error: {str(e)}")
