import streamlit as st
import pandas as pd
from database import execute_query
from translations import get_text
from utils import export_to_csv, get_teams_for_select, get_materials_for_select
from datetime import datetime, date
import uuid

def show_page(language='ru'):
    """Show materials management page"""
    st.title(f"📦 {get_text('materials', language)}")
    
    # Tabs for different views
    tab1, tab2, tab3, tab4 = st.tabs([
        get_text('materials', language),
        get_text('add', language),
        "Выдача/Zuweisung",
        "История/Verlauf"
    ])
    
    with tab1:
        show_materials_list(language)
    
    with tab2:
        show_add_material_form(language)
    
    with tab3:
        show_material_assignments(language)
    
    with tab4:
        show_material_history(language)

def show_materials_list(language='ru'):
    """Show list of materials"""
    try:
        # Filters
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            search_term = st.text_input(
                get_text('search', language),
                placeholder=f"{get_text('name', language)}..."
            )
        
        with col2:
            type_filter = st.selectbox(
                "Тип/Typ",
                options=['all', 'material', 'equipment'],
                format_func=lambda x: get_text(x, language) if x != 'all' else 'Все/Alle'
            )
        
        with col3:
            st.write("")  # Spacing
            if st.button(f"📥 {get_text('export', language)}"):
                export_materials_data(language)
        
        # Build query with filters
        query = """
            SELECT 
                m.id,
                m.name,
                m.type,
                m.description,
                COUNT(DISTINCT ma.id) as assignments_count,
                COALESCE(SUM(CASE WHEN ma.status = 'active' THEN ma.quantity ELSE 0 END), 0) as active_quantity
            FROM materials m
            LEFT JOIN material_assignments ma ON m.id = ma.material_id
            WHERE 1=1
        """
        params = {}
        
        if search_term:
            query += " AND m.name ILIKE :search"
            params['search'] = f"%{search_term}%"
        
        if type_filter != 'all':
            query += " AND m.type = :type"
            params['type'] = type_filter
        
        query += """
            GROUP BY m.id, m.name, m.type, m.description
            ORDER BY m.name
        """
        
        materials = execute_query(query, params)
        
        if materials:
            for material in materials:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{material[1]}**")
                        if material[3]:  # description
                            description = material[3][:50] + "..." if len(material[3]) > 50 else material[3]
                            st.write(f"_{description}_")
                    
                    with col2:
                        type_icon = '📦' if material[2] == 'material' else '🔧'
                        st.write(f"{type_icon} {get_text(material[2], language)}")
                    
                    with col3:
                        st.write(f"📋 Назначений/Zuweisungen: {material[4]}")
                        st.write(f"📊 Активно/Aktiv: {material[5]}")
                    
                    with col4:
                        if st.button(f"✏️", key=f"edit_material_{material[0]}"):
                            show_edit_material_form(material, language)
                        if st.button(f"🗑️", key=f"delete_material_{material[0]}"):
                            delete_material(material[0], language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading materials: {str(e)}")

def show_add_material_form(language='ru'):
    """Show form to add new material"""
    st.subheader(f"{get_text('add', language)} {get_text('materials', language)}")
    
    with st.form("add_material_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            name = st.text_input(get_text('name', language), key="new_material_name")
            material_type = st.selectbox(
                "Тип/Typ",
                options=['material', 'equipment'],
                format_func=lambda x: get_text(x, language),
                key="new_material_type"
            )
        
        with col2:
            description = st.text_area(
                get_text('description', language),
                key="new_material_description"
            )
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            if not name:
                st.error("Название обязательно / Name ist erforderlich")
            else:
                try:
                    material_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO materials (id, name, type, description)
                        VALUES (:id, :name, :type, :description)
                    """, {
                        'id': material_id,
                        'name': name,
                        'type': material_type,
                        'description': description if description else None
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")

def show_edit_material_form(material, language='ru'):
    """Show form to edit material"""
    with st.expander(f"✏️ {get_text('edit', language)}: {material[1]}", expanded=True):
        with st.form(f"edit_material_form_{material[0]}"):
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input(
                    get_text('name', language),
                    value=material[1],
                    key=f"edit_material_name_{material[0]}"
                )
                material_type = st.selectbox(
                    "Тип/Typ",
                    options=['material', 'equipment'],
                    index=['material', 'equipment'].index(material[2]),
                    format_func=lambda x: get_text(x, language),
                    key=f"edit_material_type_{material[0]}"
                )
            
            with col2:
                description = st.text_area(
                    get_text('description', language),
                    value=material[3] or '',
                    key=f"edit_material_description_{material[0]}"
                )
            
            col_save, col_cancel = st.columns(2)
            
            with col_save:
                submitted = st.form_submit_button(get_text('save', language))
            
            with col_cancel:
                cancelled = st.form_submit_button(get_text('cancel', language))
            
            if submitted:
                try:
                    execute_query("""
                        UPDATE materials 
                        SET name = :name, type = :type, description = :description
                        WHERE id = :id
                    """, {
                        'id': material[0],
                        'name': name,
                        'type': material_type,
                        'description': description if description else None
                    })
                    st.success(get_text('success_save', language))
                    st.rerun()
                except Exception as e:
                    st.error(f"{get_text('error_save', language)}: {str(e)}")
            
            if cancelled:
                st.rerun()

def delete_material(material_id, language='ru'):
    """Delete material"""
    try:
        # Check if material has assignments
        assignments_count = execute_query(
            "SELECT COUNT(*) FROM material_assignments WHERE material_id = :id", 
            {'id': material_id}
        )[0][0]
        
        if assignments_count > 0:
            st.error("Нельзя удалить материал с назначениями / Material mit Zuweisungen kann nicht gelöscht werden")
            return
        
        execute_query("DELETE FROM materials WHERE id = :id", {'id': material_id})
        st.success(get_text('success_delete', language))
        st.rerun()
    except Exception as e:
        st.error(f"{get_text('error_delete', language)}: {str(e)}")

def show_material_assignments(language='ru'):
    """Show material assignments to teams"""
    st.subheader("Выдача материалов/Materialzuweisung")
    
    # Add new assignment form
    with st.expander(f"{get_text('add', language)} выдачу/Zuweisung"):
        show_add_assignment_form(language)
    
    # Current assignments
    try:
        assignments = execute_query("""
            SELECT 
                ma.id,
                m.name as material_name,
                m.type,
                t.name as team_name,
                ma.quantity,
                ma.start_date,
                ma.end_date,
                ma.status
            FROM material_assignments ma
            JOIN materials m ON ma.material_id = m.id
            JOIN teams t ON ma.team_id = t.id
            ORDER BY ma.start_date DESC
        """)
        
        if assignments:
            # Summary statistics
            active_assignments = len([a for a in assignments if a[7] == 'active'])
            total_active_quantity = sum(a[4] for a in assignments if a[7] == 'active')
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Активных выдач/Aktive Zuweisungen", active_assignments)
            with col2:
                st.metric("Общее количество/Gesamtmenge", total_active_quantity)
            
            st.divider()
            
            for assignment in assignments:
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        type_icon = '📦' if assignment[2] == 'material' else '🔧'
                        st.write(f"**{type_icon} {assignment[1]}**")
                        st.write(f"{get_text('team', language)}: {assignment[3]}")
                    
                    with col2:
                        st.write(f"{get_text('quantity', language)}: {assignment[4]}")
                        status_icon = {
                            'active': '🟢',
                            'returned': '🔵', 
                            'broken': '🔴'
                        }.get(assignment[7], '⚪')
                        st.write(f"{status_icon} {get_text(assignment[7], language)}")
                    
                    with col3:
                        start_date = assignment[5].strftime('%d.%m.%Y') if assignment[5] else ''
                        end_date = assignment[6].strftime('%d.%m.%Y') if assignment[6] else 'Активно/Aktiv'
                        st.write(f"{start_date} - {end_date}")
                    
                    with col4:
                        if assignment[7] == 'active':
                            if st.button("↩️", key=f"return_assignment_{assignment[0]}"):
                                return_material(assignment[0], language)
                            if st.button("💥", key=f"break_assignment_{assignment[0]}"):
                                mark_material_broken(assignment[0], language)
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading assignments: {str(e)}")

def show_add_assignment_form(language='ru'):
    """Show form to add material assignment"""
    with st.form("add_assignment_form"):
        col1, col2, col3 = st.columns(3)
        
        # Get materials and teams for selection
        materials = execute_query("SELECT id, name, type FROM materials ORDER BY name")
        teams = get_teams_for_select(language)
        
        if not materials or not teams:
            st.warning("Необходимо создать материалы и бригады / Materialien und Teams müssen erstellt werden")
            return
        
        with col1:
            material_options = [(str(m[0]), f"{m[1]} ({get_text(m[2], language)})") for m in materials]
            material_id = st.selectbox(
                get_text('materials', language),
                options=[m[0] for m in material_options],
                format_func=lambda x: next(m[1] for m in material_options if m[0] == x),
                key="assign_material_id"
            )
        
        with col2:
            team_id = st.selectbox(
                get_text('teams', language),
                options=[t[0] for t in teams],
                format_func=lambda x: next(t[1] for t in teams if t[0] == x),
                key="assign_team_id"
            )
        
        with col3:
            quantity = st.number_input(
                get_text('quantity', language),
                min_value=1,
                value=1,
                key="assign_quantity"
            )
            
            start_date = st.date_input(
                "Дата выдачи/Ausgabedatum",
                value=datetime.now().date(),
                key="assign_start_date"
            )
        
        submitted = st.form_submit_button(get_text('save', language))
        
        if submitted:
            try:
                assignment_id = str(uuid.uuid4())
                execute_query("""
                    INSERT INTO material_assignments (id, material_id, team_id, quantity, start_date, status)
                    VALUES (:id, :material_id, :team_id, :quantity, :start_date, 'active')
                """, {
                    'id': assignment_id,
                    'material_id': material_id,
                    'team_id': team_id,
                    'quantity': quantity,
                    'start_date': start_date
                })
                
                # Add to history
                history_id = str(uuid.uuid4())
                execute_query("""
                    INSERT INTO material_history (id, material_id, team_id, date, event, description)
                    VALUES (:id, :material_id, :team_id, :date, 'assigned', :description)
                """, {
                    'id': history_id,
                    'material_id': material_id,
                    'team_id': team_id,
                    'date': start_date,
                    'description': f"Выдано {quantity} единиц / {quantity} Einheiten ausgegeben"
                })
                
                st.success(get_text('success_save', language))
                st.rerun()
            except Exception as e:
                st.error(f"{get_text('error_save', language)}: {str(e)}")

def return_material(assignment_id, language='ru'):
    """Return material assignment"""
    try:
        # Get assignment details for history
        assignment = execute_query("""
            SELECT material_id, team_id, quantity FROM material_assignments WHERE id = :id
        """, {'id': assignment_id})[0]
        
        # Update assignment
        execute_query("""
            UPDATE material_assignments 
            SET status = 'returned', end_date = CURRENT_DATE 
            WHERE id = :id
        """, {'id': assignment_id})
        
        # Add to history
        history_id = str(uuid.uuid4())
        execute_query("""
            INSERT INTO material_history (id, material_id, team_id, date, event, description)
            VALUES (:id, :material_id, :team_id, CURRENT_DATE, 'returned', :description)
        """, {
            'id': history_id,
            'material_id': assignment[0],
            'team_id': assignment[1],
            'description': f"Возвращено {assignment[2]} единиц / {assignment[2]} Einheiten zurückgegeben"
        })
        
        st.success("Материал возвращен / Material zurückgegeben")
        st.rerun()
    except Exception as e:
        st.error(f"Ошибка возврата материала / Fehler bei der Materialrückgabe: {str(e)}")

def mark_material_broken(assignment_id, language='ru'):
    """Mark material as broken"""
    try:
        # Get assignment details for history
        assignment = execute_query("""
            SELECT material_id, team_id, quantity FROM material_assignments WHERE id = :id
        """, {'id': assignment_id})[0]
        
        # Update assignment
        execute_query("""
            UPDATE material_assignments 
            SET status = 'broken', end_date = CURRENT_DATE 
            WHERE id = :id
        """, {'id': assignment_id})
        
        # Add to history
        history_id = str(uuid.uuid4())
        execute_query("""
            INSERT INTO material_history (id, material_id, team_id, date, event, description)
            VALUES (:id, :material_id, :team_id, CURRENT_DATE, 'broken', :description)
        """, {
            'id': history_id,
            'material_id': assignment[0],
            'team_id': assignment[1],
            'description': f"Сломано {assignment[2]} единиц / {assignment[2]} Einheiten kaputt"
        })
        
        st.success("Материал отмечен как сломанный / Material als kaputt markiert")
        st.rerun()
    except Exception as e:
        st.error(f"Ошибка отметки материала / Fehler beim Markieren des Materials: {str(e)}")

def show_material_history(language='ru'):
    """Show material history"""
    st.subheader("История материалов/Materialverlauf")
    
    try:
        # Filters
        col1, col2, col3 = st.columns(3)
        
        with col1:
            materials = execute_query("SELECT id, name FROM materials ORDER BY name")
            if materials:
                material_options = [('all', 'Все/Alle')] + [(str(m[0]), m[1]) for m in materials]
                material_filter = st.selectbox(
                    get_text('materials', language),
                    options=[m[0] for m in material_options],
                    format_func=lambda x: next(m[1] for m in material_options if m[0] == x),
                    key="history_material_filter"
                )
        
        with col2:
            event_filter = st.selectbox(
                "Событие/Ereignis",
                options=['all', 'assigned', 'returned', 'broken'],
                format_func=lambda x: get_text(x, language) if x != 'all' else 'Все/Alle'
            )
        
        with col3:
            date_from = st.date_input(
                "От/Von",
                value=None,
                key="history_date_from"
            )
        
        # Build query with filters
        query = """
            SELECT 
                mh.date,
                m.name as material_name,
                t.name as team_name,
                mh.event,
                mh.description
            FROM material_history mh
            JOIN materials m ON mh.material_id = m.id
            JOIN teams t ON mh.team_id = t.id
            WHERE 1=1
        """
        params = {}
        
        if material_filter and material_filter != 'all':
            query += " AND mh.material_id = :material_id"
            params['material_id'] = material_filter
        
        if event_filter != 'all':
            query += " AND mh.event = :event"
            params['event'] = event_filter
        
        if date_from:
            query += " AND mh.date >= %(date_from)s"
            params['date_from'] = date_from
        
        query += " ORDER BY mh.date DESC"
        
        history = execute_query(query, params)
        
        if history:
            for record in history:
                with st.container():
                    col1, col2, col3 = st.columns([2, 2, 3])
                    
                    with col1:
                        event_icon = {
                            'assigned': '📤',
                            'returned': '📥',
                            'broken': '💥'
                        }.get(record[3], '📝')
                        
                        record_date = record[0].strftime('%d.%m.%Y') if record[0] else ''
                        st.write(f"**{record_date}**")
                        st.write(f"{event_icon} {get_text(record[3], language)}")
                    
                    with col2:
                        st.write(f"**{record[1]}**")
                        st.write(f"{get_text('team', language)}: {record[2]}")
                    
                    with col3:
                        if record[4]:  # description
                            st.write(record[4])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading material history: {str(e)}")

def export_materials_data(language='ru'):
    """Export materials data to CSV"""
    try:
        materials = execute_query("""
            SELECT 
                m.name,
                m.type,
                m.description,
                COUNT(DISTINCT ma.id) as assignments_count,
                COALESCE(SUM(CASE WHEN ma.status = 'active' THEN ma.quantity ELSE 0 END), 0) as active_quantity
            FROM materials m
            LEFT JOIN material_assignments ma ON m.id = ma.material_id
            GROUP BY m.id, m.name, m.type, m.description
            ORDER BY m.name
        """)
        
        if materials:
            export_to_csv(materials, "materials")
        else:
            st.warning(get_text('no_data', language))
    except Exception as e:
        st.error(f"Export error: {str(e)}")
