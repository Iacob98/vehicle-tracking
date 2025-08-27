import streamlit as st
import uuid
from datetime import date, datetime
from database import execute_query
from translations import get_text
from utils import format_currency

# Page config
st.set_page_config(
    page_title="Материалы",
    page_icon="📦",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

@st.cache_data(ttl=300)
def get_materials_cached():
    """Get materials with caching"""
    results = execute_query("""
        SELECT 
            m.id::text,
            m.name,
            m.type,
            m.total_quantity,
            COALESCE(m.unit, 'шт.') as unit,
            m.unit_price,
            COALESCE(m.assigned_quantity, 0) as assigned_quantity
        FROM materials m
        ORDER BY m.name
    """)
    return results

def show_materials_list():
    """Show list of materials with inline editing"""
    try:
        # Check if we're editing a material
        edit_material_id = st.session_state.get('edit_material_id', None)
        
        if edit_material_id:
            show_edit_material_form(edit_material_id)
            return
        
        materials = get_materials_cached()
        
        if materials:
            # Statistics
            total_materials = len(materials)
            total_value = sum(m[3] * (m[5] if m[5] else 0) for m in materials)
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Всего материалов/Materialien gesamt", total_materials)
            with col2:
                st.metric("Общая стоимость/Gesamtwert", format_currency(total_value))
            
            st.divider()
            
            # Display materials
            for material in materials:
                material_type = material[2]
                total_quantity = material[3]
                assigned_quantity = material[6]
                
                # Calculate availability based on type
                if material_type == 'material':
                    # Consumables: total is available (already consumed items are deducted)
                    available = total_quantity
                    status_text = f"📦 Расходка/Verbrauchsmaterial"
                else:
                    # Equipment: total minus assigned is available
                    available = total_quantity - assigned_quantity
                    status_text = f"🔧 Оборудование/Ausrüstung"
                
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                    
                    with col1:
                        st.write(f"**{material[1]}**")
                        st.write(status_text)
                        if material[5]:
                            st.write(f"💰 {format_currency(material[5])}/{material[4]}")
                    
                    with col2:
                        st.write(f"📦 Всего/Gesamt: {total_quantity} {material[4]}")
                        if material_type == 'material':
                            st.write(f"✅ Доступно/Verfügbar: {available} {material[4]}")
                        else:
                            st.write(f"✅ Свободно/Frei: {available} {material[4]}")
                    
                    with col3:
                        if material_type == 'equipment':
                            st.write(f"🔧 В использовании/Im Einsatz: {assigned_quantity} {material[4]}")
                            status_color = "🟢" if available > 0 else "🟡" if available == 0 else "🔴"
                            availability_text = "Доступно" if available > 0 else "Все выдано" if available == 0 else "Превышен лимит"
                            st.write(f"{status_color} {availability_text}")
                        else:
                            if available > 10:
                                st.write("🟢 В наличии")
                            elif available > 0:
                                st.write(f"🟡 Мало осталось ({available})")
                            else:
                                st.write("🔴 Закончился")
                    
                    with col4:
                        col_edit, col_delete = st.columns(2)
                        with col_edit:
                            edit_key = f"edit_mat_{material[0][:8]}"
                            if st.button("✏️", key=edit_key, help="Редактировать"):
                                st.session_state.edit_material_id = material[0]
                                st.rerun()
                        with col_delete:
                            delete_key = f"del_mat_{material[0][:8]}"
                            if st.button("🗑️", key=delete_key, help="Удалить"):
                                delete_material(material[0])
                    
                    st.divider()
        else:
            st.info(get_text('no_data', language))
    
    except Exception as e:
        st.error(f"Error loading materials: {str(e)}")

def show_add_material_form():
    """Show form to add new material"""
    with st.form("add_material"):
        col1, col2 = st.columns(2)
        
        with col1:
            name = st.text_input(
                get_text('name', language),
                placeholder="Название материала"
            )
            
            material_type = st.selectbox(
                "Тип/Typ", 
                options=['material', 'equipment'],
                format_func=lambda x: 'Материал (расходка)' if x == 'material' else 'Оборудование (возвратное)'
            )
            
            unit = st.text_input(
                "Единица измерения/Maßeinheit",
                value="шт.",
                placeholder="шт., кг, л..."
            )
        
        with col2:
            total_quantity = st.number_input(
                "Количество/Menge",
                min_value=1,
                value=1
            )
            
            unit_price = st.number_input(
                "Цена за единицу/Preis pro Einheit (€)",
                min_value=0.0,
                step=1.0,
                format="%.2f"
            )
        
        col_submit, col_cancel = st.columns([1, 1])
        
        with col_submit:
            if st.form_submit_button("✅ Добавить / Hinzufügen"):
                if name.strip():
                    try:
                        material_id = str(uuid.uuid4())
                        execute_query("""
                            INSERT INTO materials (id, organization_id, name, type, total_quantity, unit, unit_price, assigned_quantity)
                            VALUES (:id, :organization_id, :name, :type, :total_quantity, :unit, :unit_price, 0)
                        """, {
                            'id': material_id,
                            'organization_id': st.session_state.get('organization_id'),
                            'name': name.strip(),
                            'type': material_type,
                            'total_quantity': total_quantity,
                            'unit': unit.strip() if unit.strip() else 'шт.',
                            'unit_price': unit_price if unit_price > 0 else None
                        })
                        
                        st.success(f"✅ Материал '{name}' добавлен!")
                        get_materials_cached.clear()  # Clear cache
                        del st.session_state.show_add_material_form
                        st.rerun()
                        
                    except Exception as e:
                        st.error(f"Ошибка при добавлении: {str(e)}")
                else:
                    st.error("Название обязательно")
        
        with col_cancel:
            if st.form_submit_button("❌ Отмена / Abbrechen"):
                del st.session_state.show_add_material_form
                st.rerun()

def show_edit_material_form(material_id):
    """Show form to edit material"""
    try:
        # Get current material data
        material_data = execute_query("""
            SELECT id::text, name, type, total_quantity, unit, unit_price
            FROM materials WHERE id = :id
        """, {'id': material_id})
        
        if not material_data:
            st.error("Материал не найден")
            if st.button("⬅️ Назад к списку"):
                del st.session_state.edit_material_id
                st.rerun()
            return
        
        material = material_data[0]
        
        st.subheader(f"✏️ Редактирование: {material[1]}")
        
        with st.form("edit_material"):
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input("Название", value=material[1])
                material_type = st.selectbox(
                    "Тип",
                    options=['material', 'equipment'],
                    index=0 if material[2] == 'material' else 1,
                    format_func=lambda x: 'Материал (расходка)' if x == 'material' else 'Оборудование (возвратное)'
                )
                unit = st.text_input("Единица измерения", value=material[4] or 'шт.')
            
            with col2:
                total_quantity = st.number_input(
                    "Количество",
                    min_value=1,
                    value=int(material[3])
                )
                unit_price = st.number_input(
                    "Цена за единицу (€)",
                    min_value=0.0,
                    step=1.0,
                    value=float(material[5]) if material[5] else 0.0,
                    format="%.2f"
                )
            
            col_save, col_cancel = st.columns([1, 1])
            
            with col_save:
                if st.form_submit_button("💾 Сохранить / Speichern"):
                    if name.strip():
                        try:
                            execute_query("""
                                UPDATE materials 
                                SET name = :name, type = :type, total_quantity = :total_quantity,
                                    unit = :unit, unit_price = :unit_price
                                WHERE id = :id
                            """, {
                                'id': material_id,
                                'name': name.strip(),
                                'type': material_type,
                                'total_quantity': total_quantity,
                                'unit': unit.strip() if unit.strip() else 'шт.',
                                'unit_price': unit_price if unit_price > 0 else None
                            })
                            
                            st.success("✅ Материал обновлен!")
                            get_materials_cached.clear()  # Clear cache
                            del st.session_state.edit_material_id
                            st.rerun()
                            
                        except Exception as e:
                            st.error(f"Ошибка обновления: {str(e)}")
                    else:
                        st.error("Название обязательно")
            
            with col_cancel:
                if st.form_submit_button("❌ Отмена / Abbrechen"):
                    del st.session_state.edit_material_id
                    st.rerun()
                    
    except Exception as e:
        st.error(f"Ошибка загрузки данных: {str(e)}")
        if st.button("⬅️ Назад к списку"):
            if 'edit_material_id' in st.session_state:
                del st.session_state.edit_material_id
            st.rerun()

def delete_material(material_id):
    """Delete material"""
    try:
        execute_query("DELETE FROM materials WHERE id = :id", {'id': material_id})
        st.success(get_text('success_delete', language))
        get_materials_cached.clear()  # Clear cache
        st.rerun()
    except Exception as e:
        st.error(f"Error: {str(e)}")

def show_material_assignments():
    """Show active material assignments with return/break options"""
    st.subheader("📋 Выданные материалы / Ausgegebene Materialien")
    
    try:
        # Get active assignments
        assignments = execute_query("""
            SELECT 
                ma.id::text,
                m.name as material_name,
                m.type,
                t.name as team_name,
                ma.quantity,
                ma.date,
                ma.status,
                m.unit_price
            FROM material_assignments ma
            JOIN materials m ON ma.material_id = m.id
            JOIN teams t ON ma.team_id = t.id
            WHERE ma.status = 'active'
            ORDER BY ma.date DESC
        """)
        
        if assignments:
            # Summary statistics
            total_assignments = len(assignments)
            total_quantity = sum(a[4] for a in assignments)
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Активных выдач/Aktive Zuweisungen", total_assignments)
            with col2:
                st.metric("Общее количество/Gesamtmenge", total_quantity)
            
            st.divider()
            
            # Display assignments
            for assignment in assignments:
                assignment_id, material_name, material_type, team_name, quantity, assign_date, status, unit_price = assignment
                
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 2])
                    
                    with col1:
                        type_icon = '📦' if material_type == 'material' else '🔧'
                        st.write(f"**{type_icon} {material_name}**")
                        st.write(f"👥 {team_name}")
                        if unit_price:
                            st.write(f"💰 {format_currency(float(unit_price) * quantity)}")
                    
                    with col2:
                        st.write(f"📊 Количество: {quantity}")
                        st.write(f"📅 {assign_date.strftime('%d.%m.%Y') if assign_date else 'Н/Д'}")
                    
                    with col3:
                        st.write("🟢 Активно/Aktiv")
                    
                    with col4:
                        # Status update options
                        if material_type == 'equipment':
                            # Equipment can be returned or broken
                            new_status = st.selectbox(
                                "Изменить статус",
                                options=['active', 'returned', 'broken'],
                                format_func=lambda x: {
                                    'active': '🟢 Активно',
                                    'returned': '🔄 Возвращено',
                                    'broken': '🔴 Сломано'
                                }[x],
                                key=f"status_select_{assignment_id}",
                                index=0
                            )
                            
                            if st.button("Обновить", key=f"update_{assignment_id}"):
                                update_assignment_status(assignment_id, new_status, material_type, assignment)
                        
                        else:
                            # Materials (consumables) can only be finished or broken
                            col_finished, col_broken = st.columns(2)
                            with col_finished:
                                if st.button("✅ Закончилось", key=f"finished_{assignment_id}"):
                                    update_assignment_status(assignment_id, 'finished', material_type, assignment)
                            with col_broken:
                                if st.button("🔴 Сломан", key=f"broken_{assignment_id}"):
                                    update_assignment_status(assignment_id, 'broken', material_type, assignment)
                    
                    st.divider()
        else:
            st.info("📭 Нет активных выдач материалов")
            st.info("📭 Keine aktiven Materialzuweisungen")
    
    except Exception as e:
        st.error(f"Ошибка загрузки выдач: {str(e)}")

def update_assignment_status(assignment_id, new_status, material_type, assignment_data):
    """Update assignment status with proper inventory management"""
    try:
        assignment_id_val, material_name, material_type_val, team_name, quantity, assign_date, current_status, unit_price = assignment_data
        
        if new_status == current_status:
            st.warning("Статус не изменился")
            return
        
        # Map status to appropriate database enum values
        status_mapping = {
            'returned': 'returned',
            'broken': 'broken', 
            'finished': 'broken'  # finished materials are marked as broken in DB
        }
        
        event_mapping = {
            'returned': 'returned',
            'broken': 'broken',
            'finished': 'broken',  # finished materials use 'broken' event
            'active': 'assigned'
        }
        
        # Get the database-compatible status
        db_status = status_mapping.get(new_status, new_status)
        
        # Update assignment status
        execute_query("""
            UPDATE material_assignments 
            SET status = :status, event = :event
            WHERE id = :id
        """, {
            'id': assignment_id,
            'status': db_status,
            'event': event_mapping.get(new_status, 'assigned')
        })
        
        # Handle inventory changes based on status change
        if material_type == 'equipment':
            if new_status == 'returned':
                # Return equipment to available inventory
                execute_query("""
                    UPDATE materials 
                    SET assigned_quantity = COALESCE(assigned_quantity, 0) - :quantity
                    WHERE id = (SELECT material_id FROM material_assignments WHERE id = :assignment_id)
                """, {'quantity': quantity, 'assignment_id': assignment_id})
                st.success(f"✅ {material_name} возвращено в инвентарь ({quantity} ед.)")
                
            elif new_status == 'broken':
                # Mark as broken - reduce both assigned and total quantities
                execute_query("""
                    UPDATE materials 
                    SET assigned_quantity = COALESCE(assigned_quantity, 0) - :quantity,
                        total_quantity = total_quantity - :quantity
                    WHERE id = (SELECT material_id FROM material_assignments WHERE id = :assignment_id)
                """, {'quantity': quantity, 'assignment_id': assignment_id})
                
                # Create penalty for broken equipment
                if unit_price:
                    penalty_amount = float(unit_price) * quantity
                    penalty_id = str(uuid.uuid4())
                    
                    team_id = execute_query(
                        "SELECT team_id FROM material_assignments WHERE id = :id", 
                        {'id': assignment_id}
                    )[0][0]
                    
                    execute_query("""
                        INSERT INTO penalties (id, organization_id, team_id, amount, description, date, status)
                        VALUES (:id, :organization_id, :team_id, :amount, :description, :date, 'open')
                    """, {
                        'id': penalty_id,
                        'organization_id': st.session_state.get('organization_id'),
                        'team_id': team_id,
                        'amount': penalty_amount,
                        'description': f'Поломка оборудования: {material_name} ({quantity} ед.)',
                        'date': datetime.now().date()
                    })
                    
                    st.error(f"🔴 {material_name} отмечено как сломанное. Штраф: {format_currency(penalty_amount)}")
                else:
                    st.error(f"🔴 {material_name} отмечено как сломанное")
        
        else:  # material_type == 'material' (consumables)
            if new_status == 'finished':
                st.success(f"✅ Материал {material_name} отмечен как законченный")
            elif new_status == 'broken':
                # Create penalty for broken consumables
                if unit_price:
                    penalty_amount = float(unit_price) * quantity
                    penalty_id = str(uuid.uuid4())
                    
                    team_id = execute_query(
                        "SELECT team_id FROM material_assignments WHERE id = :id", 
                        {'id': assignment_id}
                    )[0][0]
                    
                    execute_query("""
                        INSERT INTO penalties (id, organization_id, team_id, amount, description, date, status)
                        VALUES (:id, :organization_id, :team_id, :amount, :description, :date, 'open')
                    """, {
                        'id': penalty_id,
                        'organization_id': st.session_state.get('organization_id'),
                        'team_id': team_id,
                        'amount': penalty_amount,
                        'description': f'Поломка материала: {material_name} ({quantity} ед.)',
                        'date': datetime.now().date()
                    })
                    
                    st.error(f"🔴 Материал {material_name} сломан. Штраф: {format_currency(penalty_amount)}")
                else:
                    st.error(f"🔴 Материал {material_name} отмечен как сломанный")
        
        get_materials_cached.clear()  # Clear cache
        st.rerun()
        
    except Exception as e:
        st.error(f"Ошибка обновления статуса: {str(e)}")

def show_material_history():
    """Show history of returned/broken/finished materials"""
    st.subheader("📜 История материалов")
    
    # Status filter
    status_filter = st.selectbox(
        "Фильтр по статусу",
        options=['all', 'returned', 'broken', 'finished'],
        format_func=lambda x: {
            'all': '🔍 Все статусы',
            'returned': '🔄 Возвращено',
            'broken': '🔴 Сломано',
            'finished': '✅ Закончилось'
        }[x],
        key="history_status_filter"
    )
    
    try:
        # Get historical assignments based on filter
        where_clause = "WHERE ma.status != 'active'"
        params = {}
        
        if status_filter != 'all':
            where_clause += " AND ma.status = :status"
            params['status'] = status_filter
        
        history = execute_query(f"""
            SELECT 
                ma.id::text,
                m.name as material_name,
                m.type,
                t.name as team_name,
                ma.quantity,
                ma.date as assigned_date,
                ma.status,
                m.unit_price
            FROM material_assignments ma
            JOIN materials m ON ma.material_id = m.id
            JOIN teams t ON ma.team_id = t.id
            {where_clause}
            ORDER BY ma.date DESC
            LIMIT 100
        """, params)
        
        if history:
            total_records = len(history)
            total_cost = sum(float(h[7] or 0) * h[4] for h in history)
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Записей в истории", total_records)
            with col2:
                st.metric("Общая стоимость", format_currency(total_cost))
            
            st.divider()
            
            # Display history
            for record in history:
                record_id, material_name, material_type, team_name, quantity, assigned_date, status, unit_price = record
                
                # Create status display
                status_display = {
                    'returned': '🔄 Возвращено',
                    'broken': '🔴 Сломано', 
                    'finished': '✅ Закончилось'
                }.get(status, status)
                
                with st.container():
                    col1, col2, col3, col4 = st.columns([3, 2, 2, 2])
                    
                    with col1:
                        type_icon = '📦' if material_type == 'material' else '🔧'
                        st.write(f"**{type_icon} {material_name}**")
                        st.write(f"👥 {team_name}")
                    
                    with col2:
                        st.write(f"📊 Количество: {quantity}")
                        st.write(f"📅 {assigned_date.strftime('%d.%m.%Y') if assigned_date else 'Н/Д'}")
                    
                    with col3:
                        st.write(status_display)
                        if unit_price:
                            cost = float(unit_price) * quantity
                            st.write(f"💰 {format_currency(cost)}")
                    
                    with col4:
                        # Show impact based on status
                        if status == 'broken':
                            st.error("💸 Списано + штраф")
                        elif status == 'returned' and material_type == 'equipment':
                            st.success("📦 В инвентаре")
                        elif status == 'finished':
                            st.info("📋 Использовано")
                    
                    st.divider()
        else:
            st.info("📭 История пуста")
            
    except Exception as e:
        st.error(f"Ошибка загрузки истории: {str(e)}")

# Main page layout
st.title("📦 Материалы / Materialien")

tab1, tab2, tab3 = st.tabs([
    "📦 Список материалов / Materialliste", 
    "📋 Выданные материалы / Ausgegebene Materialien",
    "📜 История / Geschichte"
])

with tab1:
    show_materials_list()
    
    # Add material form within the first tab
    st.divider()
    if st.button("➕ Добавить материал / Material hinzufügen", key="add_material_button"):
        st.session_state.show_add_material_form = True
    
    if st.session_state.get('show_add_material_form', False):
        show_add_material_form()

with tab2:
    show_material_assignments()
    
    # Add material assignment section
    st.divider()
    st.subheader("📤 Выдать материал / Material ausgeben")
    
    with st.form("assign_material"):
        col1, col2 = st.columns(2)
        
        with col1:
            # Material selection
            materials = get_materials_cached()
            if not materials:
                st.warning("Необходимо создать материалы")
            else:
                material_options = []
                material_labels = []
                
                for m in materials:
                    material_id, name, mat_type, total_qty, unit, unit_price, assigned_qty = m
                    if mat_type == 'material':
                        available = total_qty
                        type_label = 'Расходка'
                    else:
                        available = total_qty - assigned_qty
                        type_label = 'Оборудование'
                    
                    if available > 0:
                        material_options.append(material_id)
                        material_labels.append(f"{name} ({type_label}) - доступно: {available} {unit}")
                
                if material_options:
                    selected_material_idx = st.selectbox(
                        "Материал/Material",
                        options=range(len(material_options)),
                        format_func=lambda x: material_labels[x]
                    )
                    selected_material_id = material_options[selected_material_idx]
                else:
                    st.warning("Нет доступных материалов для выдачи")
                    selected_material_id = None
        
        with col2:
            # Team selection
            teams = execute_query("SELECT id::text, name FROM teams ORDER BY name")
            if teams and selected_material_id:
                team_options = [t[0] for t in teams]
                team_labels = [t[1] for t in teams]
                
                selected_team_idx = st.selectbox(
                    "Бригада/Team",
                    options=range(len(team_options)),
                    format_func=lambda x: team_labels[x]
                )
                selected_team_id = team_options[selected_team_idx]
                
                quantity = st.number_input(
                    "Количество/Menge",
                    min_value=1,
                    value=1
                )
            else:
                st.info("Выберите материал")
        
        if st.form_submit_button("📤 Выдать/Ausgeben"):
            if selected_material_id and teams:
                try:
                    # Get material info
                    material_info = execute_query("""
                        SELECT type, total_quantity, assigned_quantity, name
                        FROM materials 
                        WHERE id = :id
                    """, {'id': selected_material_id})
                    
                    if not material_info:
                        st.error("Материал не найден")
                    else:
                        material_type, current_total, current_assigned, material_name = material_info[0]
                        current_assigned = current_assigned or 0
                        
                        # Check availability
                        if material_type == 'material':
                            available = current_total
                        else:
                            available = current_total - current_assigned
                        
                        if available < quantity:
                            st.error(f"Недостаточно материала. Доступно: {available}")
                        else:
                            # Create assignment
                            assignment_id = str(uuid.uuid4())
                            execute_query("""
                                INSERT INTO material_assignments 
                                (id, organization_id, material_id, team_id, quantity, date, status, event)
                                VALUES (:id, :organization_id, :material_id, :team_id, :quantity, :date, 'active', 'assigned')
                            """, {
                                'id': assignment_id,
                                'organization_id': st.session_state.get('organization_id'),
                                'material_id': selected_material_id,
                                'team_id': selected_team_id,
                                'quantity': quantity,
                                'date': datetime.now()
                            })
                            
                            # Update material quantities
                            if material_type == 'material':
                                # Consumables: reduce total quantity
                                execute_query("""
                                    UPDATE materials 
                                    SET total_quantity = total_quantity - :quantity 
                                    WHERE id = :id
                                """, {'id': selected_material_id, 'quantity': quantity})
                                st.success(f"✅ Материал '{material_name}' выдан (списано {quantity} ед.)")
                            else:
                                # Equipment: increase assigned quantity
                                execute_query("""
                                    UPDATE materials 
                                    SET assigned_quantity = COALESCE(assigned_quantity, 0) + :quantity 
                                    WHERE id = :id
                                """, {'id': selected_material_id, 'quantity': quantity})
                                st.success(f"✅ Оборудование '{material_name}' выдано (в использовании {quantity} ед.)")
                            
                            get_materials_cached.clear()  # Clear cache
                            st.rerun()
                            
                except Exception as e:
                    st.error(f"Ошибка при выдаче: {str(e)}")
            else:
                st.error("Выберите материал и бригаду")

with tab3:
    show_material_history()