import streamlit as st
import uuid
from datetime import datetime, date
from database import execute_query
from translations import get_text
from utils import format_currency
import pandas as pd

# Page config
st.set_page_config(
    page_title="Возврат оборудования",
    page_icon="🔄",
    layout="wide"
)

# Language from session state
language = st.session_state.get('language', 'ru')

@st.cache_data(ttl=300)
def get_active_assignments():
    """Get active material assignments (equipment only)"""
    return execute_query("""
        SELECT 
            ma.id::text,
            m.name as material_name,
            m.type,
            m.unit,
            t.name as team_name,
            ma.quantity,
            ma.date as assigned_date,
            ma.status
        FROM material_assignments ma
        JOIN materials m ON ma.material_id = m.id
        JOIN teams t ON ma.team_id = t.id
        WHERE ma.status = 'active' AND m.type = 'equipment'
        ORDER BY ma.date DESC
    """)

@st.cache_data(ttl=300)
def get_return_history():
    """Get equipment return history"""
    return execute_query("""
        SELECT 
            ma.id::text,
            m.name as material_name,
            m.type,
            m.unit,
            t.name as team_name,
            ma.quantity,
            ma.date as assigned_date,
            ma.status,
            ma.end_date as return_date
        FROM material_assignments ma
        JOIN materials m ON ma.material_id = m.id
        JOIN teams t ON ma.team_id = t.id
        WHERE ma.status IN ('returned', 'broken') AND m.type = 'equipment'
        ORDER BY ma.end_date DESC
        LIMIT 100
    """)

def return_equipment(assignment_id, return_status, notes=None):
    """Return equipment and update inventory"""
    try:
        # Get assignment details
        assignment_data = execute_query("""
            SELECT 
                ma.material_id::text,
                ma.team_id::text,
                ma.quantity,
                m.name,
                m.unit_price,
                t.name as team_name
            FROM material_assignments ma
            JOIN materials m ON ma.material_id = m.id
            JOIN teams t ON ma.team_id = t.id
            WHERE ma.id = :assignment_id AND ma.status = 'active'
        """, {'assignment_id': assignment_id})
        
        if not assignment_data:
            st.error("Назначение оборудования не найдено или уже обработано")
            return False
            
        material_id, team_id, quantity, material_name, unit_price, team_name = assignment_data[0]
        
        # Update assignment status
        execute_query("""
            UPDATE material_assignments 
            SET status = :status, event = :event, end_date = :return_date
            WHERE id = :assignment_id
        """, {
            'assignment_id': assignment_id,
            'status': return_status,
            'event': return_status,
            'return_date': datetime.now()
        })
        
        if return_status == 'returned':
            # Equipment returned in good condition - decrease assigned quantity
            execute_query("""
                UPDATE materials 
                SET assigned_quantity = COALESCE(assigned_quantity, 0) - :quantity 
                WHERE id = :material_id
            """, {'material_id': material_id, 'quantity': quantity})
            
            st.success(f"✅ Оборудование '{material_name}' ({quantity} ед.) успешно возвращено от бригады '{team_name}'")
            
        elif return_status == 'broken':
            # Equipment returned broken - decrease assigned quantity and create penalty
            execute_query("""
                UPDATE materials 
                SET assigned_quantity = COALESCE(assigned_quantity, 0) - :quantity 
                WHERE id = :material_id
            """, {'material_id': material_id, 'quantity': quantity})
            
            # Create penalty for broken equipment
            penalty_id = str(uuid.uuid4())
            penalty_amount = float(unit_price or 0) * quantity
            penalty_description = f"Поломка оборудования: {material_name} ({quantity} ед.)"
            
            execute_query("""
                INSERT INTO penalties 
                (id, team_id, date, amount, status, description)
                VALUES (:id, :team_id, :date, :amount, 'open', :description)
            """, {
                'id': penalty_id,
                'team_id': team_id,
                'date': date.today(),
                'amount': penalty_amount,
                'description': penalty_description
            })
            
            st.warning(f"⚠️ Оборудование '{material_name}' ({quantity} ед.) возвращено сломанным")
            st.info(f"💰 Создан штраф на сумму {format_currency(penalty_amount)} для бригады '{team_name}'")
            
        # Clear caches
        get_active_assignments.clear()
        get_return_history.clear()
        
        return True
        
    except Exception as e:
        st.error(f"Ошибка при возврате оборудования: {str(e)}")
        return False

def show_active_assignments():
    """Show active equipment assignments"""
    st.subheader("📋 Оборудование в использовании / Equipment in Use")
    
    assignments = get_active_assignments()
    
    if not assignments:
        st.info("Нет оборудования в использовании / No equipment currently in use")
        return
    
    # Display assignments
    for assignment in assignments:
        assignment_id, material_name, material_type, unit, team_name, quantity, assigned_date, status = assignment
        
        with st.container():
            col1, col2, col3, col4 = st.columns([3, 2, 2, 2])
            
            with col1:
                st.write(f"**🔧 {material_name}**")
                st.write(f"👥 {team_name}")
            
            with col2:
                st.write(f"**{quantity} {unit}**")
                assigned_date_str = assigned_date.strftime('%d.%m.%Y') if assigned_date else ''
                st.write(f"📅 {assigned_date_str}")
            
            with col3:
                if st.button(f"✅ Вернуть", key=f"return_{assignment_id}", use_container_width=True):
                    if return_equipment(assignment_id, 'returned'):
                        st.rerun()
            
            with col4:
                if st.button(f"❌ Сломано", key=f"broken_{assignment_id}", use_container_width=True):
                    if return_equipment(assignment_id, 'broken'):
                        st.rerun()
            
            st.divider()

def show_return_history():
    """Show equipment return history"""
    st.subheader("📜 История возвратов / Return History")
    
    history = get_return_history()
    
    if not history:
        st.info("История возвратов пуста / No return history")
        return
    
    # Create DataFrame for better display
    df_data = []
    for record in history:
        assignment_id, material_name, material_type, unit, team_name, quantity, assigned_date, status, return_date = record
        
        status_emoji = "✅" if status == "returned" else "❌"
        status_text = "Возвращено" if status == "returned" else "Сломано"
        
        df_data.append({
            "Статус": f"{status_emoji} {status_text}",
            "Оборудование": material_name,
            "Бригада": team_name,
            "Количество": f"{quantity} {unit}",
            "Дата выдачи": assigned_date.strftime('%d.%m.%Y') if assigned_date else '',
            "Дата возврата": return_date.strftime('%d.%m.%Y %H:%M') if return_date else ''
        })
    
    if df_data:
        df = pd.DataFrame(df_data)
        st.dataframe(df, use_container_width=True, hide_index=True)
    
    # Summary statistics
    st.divider()
    col1, col2, col3 = st.columns(3)
    
    total_returns = len(history)
    good_returns = len([h for h in history if h[7] == 'returned'])
    broken_returns = len([h for h in history if h[7] == 'broken'])
    
    with col1:
        st.metric("Всего возвратов", total_returns)
    with col2:
        st.metric("Исправное оборудование", good_returns, delta=f"{good_returns/total_returns*100:.1f}%" if total_returns > 0 else "0%")
    with col3:
        st.metric("Сломанное оборудование", broken_returns, delta=f"-{broken_returns/total_returns*100:.1f}%" if total_returns > 0 else "0%")

# Main page
st.title("🔄 Возврат оборудования / Equipment Return")

st.info("""
**🎯 Система возврата оборудования**

На этой странице вы можете:
- **📋 Просмотреть** все оборудование, находящееся в использовании у бригад
- **✅ Зарегистрировать возврат** оборудования в исправном состоянии
- **❌ Отметить поломку** и автоматически создать штраф за поломку
- **📜 Просмотреть историю** всех возвратов оборудования

**Важно:** Только возвратное оборудование (не расходники) отображается на этой странице.
""")

# Tabs for different views
tab1, tab2 = st.tabs([
    "📋 В использовании",
    "📜 История возвратов"
])

with tab1:
    show_active_assignments()

with tab2:
    show_return_history()