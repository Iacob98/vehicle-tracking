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
                            edit_key = f"edit_mat_{material[0][:8]}"  # Use shorter unique key
                            if st.button("✏️", key=edit_key, help="Редактировать"):
                                st.session_state.edit_material_id = material[0]
                                st.rerun()
                        with col_delete:
                            delete_key = f"del_mat_{material[0][:8]}"  # Use shorter unique key
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

    # Add material form within the first tab
    st.divider()
    if st.button("➕ Добавить материал / Material hinzufügen"):
        st.session_state.show_add_material_form = True
    
    if st.session_state.get('show_add_material_form', False):
        show_add_material_form()

with tab2:
    show_material_assignments()

# Show material history for completed assignments
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
        }[x]
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
                ma.id,
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
    
with tab2:
    show_material_assignments()

with tab3:
    show_material_history()