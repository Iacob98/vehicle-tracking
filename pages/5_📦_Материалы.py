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
    return execute_query("""
        SELECT 
            m.id,
            m.name,
            m.type,
            m.total_quantity,
            COALESCE(m.unit, 'шт.') as unit,
            m.unit_price,
            COALESCE(m.assigned_quantity, 0) as assigned_quantity
        FROM materials m
        ORDER BY m.name
    """)

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
                            if st.button("✏️", key=f"edit_material_{material[0]}", help="Редактировать"):
                                st.session_state.edit_material_id = material[0]
                                st.rerun()
                        with col_delete:
                            if st.button("🗑️", key=f"delete_material_{material[0]}", help="Удалить"):
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
                value=0.0
            )
        
        if st.form_submit_button(get_text('save', language)):
            if name:
                try:
                    material_id = str(uuid.uuid4())
                    execute_query("""
                        INSERT INTO materials 
                        (id, name, type, total_quantity, unit, unit_price)
                        VALUES (:id, :name, :type, :total_quantity, :unit, :unit_price)
                    """, {
                        'id': material_id,
                        'name': name,
                        'type': material_type,
                        'total_quantity': total_quantity,
                        'unit': unit,
                        'unit_price': unit_price if unit_price > 0 else None
                    })
                    st.success(get_text('success_save', language))
                    get_materials_cached.clear()  # Clear cache
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
            else:
                st.error("Название обязательно")

def show_edit_material_form(material_id):
    """Show form to edit existing material"""
    try:
        # Get current material data
        material_data = execute_query("""
            SELECT name, type, total_quantity, unit, unit_price 
            FROM materials 
            WHERE id = :id
        """, {'id': material_id})
        
        if not material_data:
            st.error("Материал не найден")
            if st.button("⬅️ Назад к списку"):
                del st.session_state.edit_material_id
                st.rerun()
            return
        
        current_material = material_data[0]
        
        st.subheader("✏️ Редактировать материал / Material bearbeiten")
        
        if st.button("⬅️ Назад к списку / Zurück zur Liste"):
            del st.session_state.edit_material_id
            st.rerun()
        
        with st.form("edit_material"):
            col1, col2 = st.columns(2)
            
            with col1:
                name = st.text_input(
                    "Название / Name",
                    value=current_material[0],
                    placeholder="Название материала"
                )
                
                material_type_options = ['equipment', 'consumables']
                current_type_index = 0
                if current_material[1] in material_type_options:
                    current_type_index = material_type_options.index(current_material[1])
                
                material_type = st.selectbox(
                    "Тип/Typ",
                    options=material_type_options,
                    index=current_type_index,
                    format_func=lambda x: get_text(x, language)
                )
                
                unit = st.text_input(
                    "Единица измерения/Maßeinheit",
                    value=current_material[3] or "шт.",
                    placeholder="шт., кг, л..."
                )
            
            with col2:
                total_quantity = st.number_input(
                    "Количество/Menge",
                    min_value=1,
                    value=int(current_material[2]) if current_material[2] else 1
                )
                
                unit_price = st.number_input(
                    "Цена за единицу/Preis pro Einheit (€)",
                    min_value=0.0,
                    step=1.0,
                    value=float(current_material[4]) if current_material[4] else 0.0
                )
            
            col_save, col_cancel = st.columns(2)
            with col_save:
                if st.form_submit_button("💾 Сохранить / Speichern", type="primary"):
                    if name:
                        try:
                            execute_query("""
                                UPDATE materials 
                                SET name = :name, type = :type, total_quantity = :total_quantity, 
                                    unit = :unit, unit_price = :unit_price
                                WHERE id = :id
                            """, {
                                'id': material_id,
                                'name': name,
                                'type': material_type,
                                'total_quantity': total_quantity,
                                'unit': unit,
                                'unit_price': unit_price if unit_price > 0 else None
                            })
                            st.success("Материал обновлен / Material aktualisiert")
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

# Main page
st.title(f"📦 {get_text('materials', language)}")

tab1, tab2, tab3, tab4 = st.tabs([
    get_text('materials', language),
    get_text('add', language),
    "Выдача материалов/Material ausgeben",
    "Выданные материалы/Ausgegebene Materialien"
])

with tab1:
    show_materials_list()

with tab2:
    show_add_material_form()

with tab3:
    st.subheader("Выдать материал бригаде/Material an Team ausgeben")
    
    with st.form("assign_material"):
        # Material selection
        materials = get_materials_cached()
        if not materials:
            st.warning("Необходимо создать материалы")
        else:
            material_id = st.selectbox(
                "Материал/Material",
                options=[m[0] for m in materials],
                format_func=lambda x: next((
                    f"{m[1]} - {'Расходка' if m[2] == 'material' else 'Оборудование'} " +
                    f"(доступно: {m[3] if m[2] == 'material' else m[3] - m[6]} {m[4]})"
                    for m in materials if m[0] == x), x)
            )
            
            # Team selection
            teams = execute_query("SELECT id, name FROM teams ORDER BY name")
            if teams:
                team_id = st.selectbox(
                    "Бригада/Team",
                    options=[t[0] for t in teams],
                    format_func=lambda x: next((t[1] for t in teams if t[0] == x), x)
                )
                
                quantity = st.number_input(
                    "Количество/Menge",
                    min_value=1,
                    value=1
                )
                
                if st.form_submit_button("Выдать/Ausgeben"):
                    try:
                        # Get material info to determine type
                        material_info = execute_query("""
                            SELECT type, total_quantity, assigned_quantity 
                            FROM materials 
                            WHERE id = :id
                        """, {'id': material_id})
                        
                        if not material_info:
                            st.error("Материал не найден")
                        else:
                            material_type = material_info[0][0]
                            current_total = material_info[0][1] or 0
                            current_assigned = material_info[0][2] or 0
                            
                            # Check availability based on type
                            process_assignment = False
                            if material_type == 'material':
                                # For consumables, check if we have enough in stock
                                if current_total < quantity:
                                    st.error(f"Недостаточно материала в наличии. Доступно: {current_total}")
                                else:
                                    process_assignment = True
                            else:
                                # For equipment, check if we have enough unassigned
                                available = current_total - current_assigned
                                if available < quantity:
                                    st.error(f"Недостаточно свободного оборудования. Доступно: {available}")
                                else:
                                    process_assignment = True
                            
                            # Create assignment record if validation passed
                            if process_assignment:
                                assignment_id = str(uuid.uuid4())
                                execute_query("""
                                    INSERT INTO material_assignments 
                                    (id, material_id, team_id, quantity, date, status, event)
                                    VALUES (:id, :material_id, :team_id, :quantity, :date, 'active', 'assigned')
                                """, {
                                    'id': assignment_id,
                                    'material_id': material_id,
                                    'team_id': team_id,
                                    'quantity': quantity,
                                    'date': datetime.now()
                                })
                                
                                # Update material quantities based on type
                                if material_type == 'material':
                                    # For consumables: reduce total quantity (consumed)
                                    execute_query("""
                                        UPDATE materials 
                                        SET total_quantity = total_quantity - :quantity 
                                        WHERE id = :id
                                    """, {'id': material_id, 'quantity': quantity})
                                    st.success(f"✅ Материал выдан (списано {quantity} единиц)")
                                else:
                                    # For equipment: increase assigned quantity (temporary assignment)
                                    execute_query("""
                                        UPDATE materials 
                                        SET assigned_quantity = COALESCE(assigned_quantity, 0) + :quantity 
                                        WHERE id = :id
                                    """, {'id': material_id, 'quantity': quantity})
                                    st.success(f"✅ Оборудование выдано (в использовании {quantity} единиц)")
                                
                                get_materials_cached.clear()  # Clear cache
                                st.rerun()
                        
                    except Exception as e:
                        st.error(f"Ошибка при выдаче: {str(e)}")

def show_material_assignments():
    """Show active material assignments with return/break options"""
    st.subheader("📋 Выданные материалы / Ausgegebene Materialien")
    
    try:
        # Get active assignments
        assignments = execute_query("""
            SELECT 
                ma.id,
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
                        if material_type == 'equipment':
                            st.write("🔧 Возвратное")
                        else:
                            st.write("📦 Списано")
                    
                    with col4:
                        if material_type == 'equipment':
                            if st.button("↩️ Вернуть", key=f"return_{assignment_id}", help="Возврат оборудования"):
                                return_material(assignment_id)
                        
                        if st.button("💥 Сломан", key=f"break_{assignment_id}", help="Отметить как сломанный"):
                            if f"break_dialog_{assignment_id}" not in st.session_state:
                                st.session_state[f"break_dialog_{assignment_id}"] = True
                                st.rerun()
                    
                    # Break dialog
                    if st.session_state.get(f"break_dialog_{assignment_id}", False):
                        show_break_material_dialog(assignment_id, material_name, unit_price, quantity)
                    
                    st.divider()
        else:
            st.info("📭 Нет активных выдач материалов")
            st.info("📭 Keine aktiven Materialzuweisungen")
    
    except Exception as e:
        st.error(f"Ошибка загрузки выдач: {str(e)}")

def return_material(assignment_id):
    """Return equipment to inventory"""
    try:
        # Get assignment details
        assignment_data = execute_query("""
            SELECT ma.material_id, ma.quantity, m.name
            FROM material_assignments ma
            JOIN materials m ON ma.material_id = m.id
            WHERE ma.id = :id AND ma.status = 'active'
        """, {'id': assignment_id})
        
        if not assignment_data:
            st.error("Выдача не найдена")
            return
        
        material_id, quantity, material_name = assignment_data[0]
        
        # Update assignment status
        execute_query("""
            UPDATE material_assignments 
            SET status = 'returned', event = 'returned'
            WHERE id = :id
        """, {'id': assignment_id})
        
        # Update material assigned quantity (for equipment)
        execute_query("""
            UPDATE materials 
            SET assigned_quantity = COALESCE(assigned_quantity, 0) - :quantity
            WHERE id = :id
        """, {'id': material_id, 'quantity': quantity})
        
        st.success(f"✅ {material_name} возвращено ({quantity} ед.)")
        st.rerun()
        
    except Exception as e:
        st.error(f"Ошибка возврата: {str(e)}")

def show_break_material_dialog(assignment_id, material_name, unit_price, quantity):
    """Show dialog to mark material as broken"""
    with st.expander(f"💥 Поломка материала: {material_name}", expanded=True):
        st.write("**Выберите причину поломки:**")
        st.write("**Wählen Sie den Grund für den Defekt:**")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("🔧 Техническая\nTechnisch", key=f"tech_break_{assignment_id}"):
                mark_material_broken(assignment_id, is_worker_fault=False)
        
        with col2:
            if st.button("👤 По вине рабочих\nVerschulden", key=f"worker_break_{assignment_id}"):
                mark_material_broken(assignment_id, is_worker_fault=True, unit_price=unit_price, quantity=quantity, material_name=material_name)
        
        with col3:
            if st.button("❌ Отмена\nAbbrechen", key=f"cancel_break_{assignment_id}"):
                del st.session_state[f"break_dialog_{assignment_id}"]
                st.rerun()

def mark_material_broken(assignment_id, is_worker_fault=True, unit_price=None, quantity=None, material_name=None):
    """Mark material as broken and optionally create penalty"""
    try:
        # Get assignment details if not provided
        if not material_name:
            assignment_data = execute_query("""
                SELECT ma.material_id, ma.team_id, ma.quantity, m.name, m.unit_price, m.type
                FROM material_assignments ma
                JOIN materials m ON ma.material_id = m.id
                WHERE ma.id = :id AND ma.status = 'active'
            """, {'id': assignment_id})
            
            if not assignment_data:
                st.error("Выдача не найдена")
                return
            
            material_id, team_id, quantity, material_name, unit_price, material_type = assignment_data[0]
        else:
            # Get basic info
            assignment_data = execute_query("""
                SELECT ma.material_id, ma.team_id, m.type
                FROM material_assignments ma
                JOIN materials m ON ma.material_id = m.id
                WHERE ma.id = :id
            """, {'id': assignment_id})
            material_id, team_id, material_type = assignment_data[0]
        
        # Update assignment status
        execute_query("""
            UPDATE material_assignments 
            SET status = 'broken', event = 'broken'
            WHERE id = :id
        """, {'id': assignment_id})
        
        # For equipment, reduce assigned quantity
        if material_type == 'equipment':
            execute_query("""
                UPDATE materials 
                SET assigned_quantity = COALESCE(assigned_quantity, 0) - :quantity
                WHERE id = :id
            """, {'id': material_id, 'quantity': quantity})
        
        # Create penalty if worker fault and price is available
        if is_worker_fault and unit_price and float(unit_price) > 0:
            penalty_amount = float(unit_price) * int(quantity)
            penalty_id = str(uuid.uuid4())
            
            execute_query("""
                INSERT INTO penalties (id, team_id, amount, description, status, date, created_at)
                VALUES (:id, :team_id, :amount, :description, 'open', :date, :created_at)
            """, {
                'id': penalty_id,
                'team_id': team_id,
                'amount': penalty_amount,
                'description': f"Поломка материала: {material_name} ({quantity} ед.) / Defektes Material: {material_name} ({quantity} St.)",
                'date': datetime.now().date(),
                'created_at': datetime.now()
            })
            
            st.warning(f"🚧 Создан штраф: {format_currency(penalty_amount)} за поломку материала")
        
        st.success(f"💥 {material_name} отмечен как сломанный")
        
        # Clear dialog and refresh
        if f"break_dialog_{assignment_id}" in st.session_state:
            del st.session_state[f"break_dialog_{assignment_id}"]
        st.rerun()
        
    except Exception as e:
        st.error(f"Ошибка при отметке поломки: {str(e)}")

# Main interface with tabs
with tab4:
    show_material_assignments()