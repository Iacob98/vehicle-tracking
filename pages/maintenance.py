import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, get_vehicles_for_select, upload_file, format_currency
from datetime import datetime, date
import uuid

def show_page(language='ru'):
    """Show maintenance management page"""
    st.title(f"🔧 {get_text('maintenance', language)}")
    
    # Tabs for different views
    tab1, tab2 = st.tabs([
        get_text('maintenance', language),
        get_text('add', language)
    ])
    
    with tab1:
        show_maintenance_list(language)
    
    with tab2:
        show_add_maintenance_form(language)

def show_maintenance_list(language='ru'):
    """Show list of maintenance records"""
    try:
        # Filters
        col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder="Автомобиль... / Fahrzeug..."
            )
        
        with col2:
            type_filter = st.selectbox(
                "Тип/Typ",
                options=['all', 'inspection', 'repair'],
                format_func=lambda x: get_text(x, language) if x != 'all' else 'Все/Alle'
            )
        
        with col3:
            date_from = st.date_input(
                "От/Von",
                value=None,
                key="maintenance_date_from"
            )
        
        with col4:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_maintenance_data(language)
        
        # Build query with filters
        query = """
            SELECT 
                m.id,
                m.date,
                v.name as vehicle_name,
                v.license_plate,
                m.type,
                m.description,
                m.receipt_url
            FROM maintenances m
            JOIN vehicles v ON m.vehicle_id = v.id
            WHERE 1=1
        """
        params = {}
        
        if search_term:
            query += """ AND (
                v.name ILIKE :search OR 
                v.license_plate ILIKE :search
            )"""
            params['search'] = f"%{search_term}%"
        
        if type_filter != 'all':
            query += " AND m.type = :type"
            params['type'] = type_filter
        
        if date_from:
            query += " AND m.date >= :date_from"
            params['date_from'] = date_from
        
        query += " ORDER BY m.date DESC"
        
        maintenances = execute_query(query, params)
        
        if maintenances:
            # Summary statistics
            total_records = len(maintenances)
            inspections = len([m for m in maintenances if m[4] == 'inspection'])
            repairs = len([m for m in maintenances if m[4] == 'repair'])
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Всего записей/Einträge insgesamt", total_records)
            with col2:
                st.metric(f"🔍 {get_text('inspection', language)}", inspections)
            with col3:
                st.metric(f"🔧 {get_text('repair', language)}", repairs)
            
            st.divider()
            
            # Display maintenance records
            for maintenance in maintenances:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{maintenance[2]}** ({maintenance[3]})")
                        maintenance_date = maintenance[1].strftime('%d.%m.%Y') if maintenance[1] else ''
                        st.write(f"📅 {maintenance_date}")
                    
                    with col2:
                        type_icon = '🔍' if maintenance[4] == 'inspection' else '🔧'
                        st.write(f"{type_icon} {get_text(maintenance[4], language)}")
                    
                    with col3:
                        if maintenance[5]:  # description
                            description = maintenance[5][:50] + "..." if len(maintenance[5]) > 50 else maintenance[5]
                            st.write(f"📝 {description}")
                        
                        if maintenance[6]:  # receipt_url
                            st.write("🧾 Чек есть/Beleg vorhanden")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_maintenance_{maintenance[0]}"):
                            show_edit_maintenance_form(maintenance, language)
                        if st.button(f"🗑️", key=f"delete_maintenance_{maintenance[0]}"):
                            delete_maintenance(maintenance[0], language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading maintenance records: {str(e)}")

def show_add_maintenance_form(language='ru'):
    """Show form to add new maintenance record"""
    st.subheader(f"{get_text('add', language)} {get_text('maintenance', language)}")
    
    with st.form("add_maintenance_form"):
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
                key="new_maintenance_vehicle"
            )
            
            maintenance_date = st.date_input(
                get_text('date', language),
                value=date.today(),
                key="new_maintenance_date"
            )
            
            maintenance_type = st.selectbox(
                "Тип/Typ",
                options=['inspection', 'repair'],
                format_func=lambda x: get_text(x, language),
                key="new_maintenance_type"
            )
        
        with col2:
            description = st.text_area(
                get_text('description', language),
                placeholder="Описание работ... / Beschreibung der Arbeiten...",
                key="new_maintenance_description"
            )
            
            # Receipt upload
            receipt_file = st.file_uploader(
                "Чек/Beleg",
                type=['png', 'jpg', 'jpeg', 'pdf'],
                key="new_maintenance_receipt"
            )
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            try:
                receipt_url = upload_file(receipt_file, 'receipts') if receipt_file else None
                
                maintenance_id = str(uuid.uuid4())
                execute_query("""
                    INSERT INTO maintenances (id, vehicle_id, date, type, description, receipt_url)
                    VALUES (:id, :vehicle_id, :date, :type, :description, :receipt_url)
                """, {
                    'id': maintenance_id,
                    'vehicle_id': vehicle_id,
                    'date': maintenance_date,
                    'type': maintenance_type,
                    'description': description if description else None,
                    'receipt_url': receipt_url
                })
                st.success(get_text('success_save', language))
                st.rerun()
            except Exception as e:
                st.error(f"{get_text('error_save', language)}: {str(e)}")

def show_edit_maintenance_form(maintenance, language='ru'):
    """Show form to edit maintenance record"""
    with st.expander(f"✏️ {get_text('edit', language)}: {maintenance[2]}", expanded=True):
        with st.form(f"edit_maintenance_form_{maintenance[0]}"):
            col1, col2 = st.columns(2)
            
            with col1:
                # Vehicle selection
                vehicles = get_vehicles_for_select(language)
                current_vehicle = next((v[0] for v in vehicles if maintenance[2] in v[1]), vehicles[0][0] if vehicles else None)
                
                if vehicles:
                    vehicle_id = st.selectbox(
                        get_text('vehicles', language),
                        options=[v[0] for v in vehicles],
                        format_func=lambda x: next(v[1] for v in vehicles if v[0] == x),
                        index=[v[0] for v in vehicles].index(current_vehicle) if current_vehicle else 0,
                        key=f"edit_maintenance_vehicle_{maintenance[0]}"
                    )
                
                maintenance_date = st.date_input(
                    get_text('date', language),
                    value=maintenance[1],
                    key=f"edit_maintenance_date_{maintenance[0]}"
                )
                
                maintenance_type = st.selectbox(
                    "Тип/Typ",
                    options=['inspection', 'repair'],
                    index=['inspection', 'repair'].index(maintenance[4]),
                    format_func=lambda x: get_text(x, language),
                    key=f"edit_maintenance_type_{maintenance[0]}"
                )
            
            with col2:
                description = st.text_area(
                    get_text('description', language),
                    value=maintenance[5] or '',
                    key=f"edit_maintenance_description_{maintenance[0]}"
                )
                
                # Show current receipt if exists
                if maintenance[6]:  # receipt_url
                    st.write(f"Текущий чек/Aktueller Beleg: {maintenance[6]}")
                
                # Receipt upload
                receipt_file = st.file_uploader(
                    "Новый чек/Neuer Beleg",
                    type=['png', 'jpg', 'jpeg', 'pdf'],
                    key=f"edit_maintenance_receipt_{maintenance[0]}"
                )
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                submitted = st.form_submit_button(get_text('save', language))
            
            with col_cancel:
                cancelled = st.form_submit_button(get_text('cancel', language))
            
            if submitted:
                try:
                    receipt_url = maintenance[6]  # Keep existing receipt URL
                    if receipt_file:
                        receipt_url = upload_file(receipt_file, 'receipts')
                    
                    execute_query("""
                        UPDATE maintenances 
                        SET vehicle_id = :vehicle_id, date = :date, 
                            type = :type, description = :description, 
                            receipt_url = :receipt_url
                        WHERE id = :id
                    """, {
                        'id': maintenance[0],
                        'vehicle_id': vehicle_id,
                        'date': maintenance_date,
                        'type': maintenance_type,
                        'description': description if description else None,
                        'receipt_url': receipt_url
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")
            
            if cancelled:
                st.rerun()

def delete_maintenance(maintenance_id, language='ru'):
    """Delete maintenance record"""
    try:
        execute_query("DELETE FROM maintenances WHERE id = :id", {'id': maintenance_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"{get_text('error_delete', language)}: {str(e)}")

def export_maintenance_data(language='ru'):
    """Export maintenance data to CSV"""
    try:
        maintenances = execute_query("""
            SELECT 
                m.date,
                v.name as vehicle_name,
                v.license_plate,
                m.type,
                m.description
            FROM maintenances m
            JOIN vehicles v ON m.vehicle_id = v.id
            ORDER BY m.date DESC
        """)
        
        if maintenances:
            export_to_csv(maintenances, "maintenance")
        else:
            st.warning(get_text('no_data', language))
    except Exception as e:
        st.error(f"Export error: {str(e)}")
