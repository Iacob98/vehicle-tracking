import streamlit as st
import uuid
from datetime import datetime
from database import execute_query
from translations import get_text
from auth import require_auth, show_org_header, is_admin, can_delete_account, hash_password

# Page config
st.set_page_config(
    page_title="Управление аккаунтом",
    page_icon="🏢", 
    layout="wide"
)

# Require authentication
require_auth()
show_org_header()

# Language from session state
language = st.session_state.get('language', 'ru')

def show_account_management():
    """Account management interface - only for account owners"""
    st.title("🏢 Управление аккаунтом / Account Management")
    
    # Check if current user is owner
    if not is_admin():
        st.error("❌ Доступ запрещен / Access Denied")
        st.info("💡 Только владелец аккаунта и менеджеры могут управлять настройками аккаунта")
        return
    
    # Display organization info
    org_info = execute_query("""
        SELECT name, created_at, subscription_status 
        FROM organizations 
        WHERE id = :org_id
    """, {'org_id': st.session_state.get('organization_id')})
    
    if org_info:
        org = org_info[0]
        st.success(f"🏢 **Организация:** {org[0]}")
        st.info(f"📅 **Дата создания:** {org[1].strftime('%d.%m.%Y')}")
        st.info(f"📊 **Статус подписки:** {org[2]}")
    
    st.divider()
    
    # Tabs for different management functions
    tab1, tab2, tab3 = st.tabs([
        "👥 Управление пользователями / User Management",
        "🔐 Безопасность / Security", 
        "⚙️ Настройки / Settings"
    ])
    
    with tab1:
        show_user_management_panel()
    
    with tab2:
        show_security_panel()
        
    with tab3:
        show_account_settings()

def show_user_management_panel():
    """Panel for managing users within the account"""
    st.subheader("👥 Пользователи аккаунта / Account Users")
    
    # Get all users in organization
    users = execute_query("""
        SELECT 
            u.id, u.email, u.first_name, u.last_name, u.role, u.created_at,
            t.name as team_name
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        WHERE u.organization_id = :org_id
        ORDER BY u.created_at DESC
    """, {'org_id': st.session_state.get('organization_id')})
    
    if users:
        st.write(f"**Всего пользователей в аккаунте:** {len(users)}")
        
        # Display users table
        for user in users:
            with st.container():
                col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
                
                with col1:
                    role_icons = {
                        'owner': '👑',
                        'admin': '🔧', 
                        'manager': '💼',
                        'team_lead': '👨‍💼',
                        'worker': '👷'
                    }
                    icon = role_icons.get(user[4], '👤')
                    st.write(f"{icon} **{user[2]} {user[3]}**")
                    st.write(f"📧 {user[1]}")
                
                with col2:
                    st.write(f"**Роль:** {get_text(user[4], language)}")
                    if user[6]:  # team_name
                        st.write(f"**Бригада:** {user[6]}")
                
                with col3:
                    st.write(f"**Добавлен:** {user[5].strftime('%d.%m.%Y')}")
                
                with col4:
                    if user[4] != 'owner' and user[0] != st.session_state.get('user_id'):
                        if st.button("🗑️", key=f"remove_user_{user[0]}", help="Удалить из аккаунта"):
                            remove_user_from_account(user[0], f"{user[2]} {user[3]}")
                
                st.divider()
    else:
        st.info("В аккаунте пока нет других пользователей")
    
    # Add new user section
    st.subheader("➕ Добавить пользователя в аккаунт")
    show_add_user_to_account_form()

def show_add_user_to_account_form():
    """Form to add new user to account"""
    st.info("🔐 **Важно:** Добавленные пользователи получат полный доступ ко всем данным и функциям системы (кроме удаления аккаунта)")
    
    with st.form("add_user_to_account"):
        col1, col2 = st.columns(2)
        
        with col1:
            email = st.text_input(
                "📧 Email пользователя",
                placeholder="user@example.com",
                help="Этот email будет использоваться для входа"
            )
            password = st.text_input(
                "🔒 Пароль",
                type="password",
                placeholder="Минимум 6 символов"
            )
            password_confirm = st.text_input(
                "🔒 Подтвердите пароль",
                type="password"
            )
        
        with col2:
            first_name = st.text_input(
                "Имя",
                placeholder="Иван"
            )
            last_name = st.text_input(
                "Фамилия", 
                placeholder="Иванов"
            )
            phone = st.text_input(
                "📞 Телефон (опционально)",
                placeholder="+7 900 123-45-67"
            )
        
        role = st.selectbox(
            "Роль в системе",
            options=['admin', 'manager', 'team_lead', 'worker'],
            format_func=lambda x: get_text(x, language),
            help="Все роли имеют одинаковые права, различаются только названием"
        )
        
        # Team selection
        teams = execute_query("""
            SELECT id, name FROM teams 
            WHERE organization_id = :org_id 
            ORDER BY name
        """, {'org_id': st.session_state.get('organization_id')})
        
        team_id = None
        if teams:
            team_id = st.selectbox(
                "Бригада (опционально)",
                options=[None] + [t[0] for t in teams],
                format_func=lambda x: "Не назначена" if x is None else next((t[1] for t in teams if t[0] == x), x)
            )
        
        if st.form_submit_button("👥 Добавить в аккаунт", type="primary"):
            if not all([email, password, first_name, last_name]):
                st.error("❌ Заполните все обязательные поля")
            elif len(password) < 6:
                st.error("❌ Пароль должен содержать минимум 6 символов")
            elif password != password_confirm:
                st.error("❌ Пароли не совпадают")
            else:
                add_user_to_account(email, password, first_name, last_name, phone, role, team_id)

def add_user_to_account(email, password, first_name, last_name, phone, role, team_id):
    """Add new user to the account"""
    try:
        # Check if email already exists
        existing = execute_query("SELECT id FROM users WHERE email = :email", {'email': email})
        if existing:
            st.error("❌ Пользователь с таким email уже существует")
            return
        
        user_id = str(uuid.uuid4())
        password_hash = hash_password(password)
        
        execute_query("""
            INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, phone, role, team_id, created_at)
            VALUES (:id, :organization_id, :email, :password_hash, :first_name, :last_name, :phone, :role, :team_id, :created_at)
        """, {
            'id': user_id,
            'organization_id': st.session_state.get('organization_id'),
            'email': email,
            'password_hash': password_hash,
            'first_name': first_name,
            'last_name': last_name,
            'phone': phone,
            'role': role,
            'team_id': team_id,
            'created_at': datetime.now()
        })
        
        st.success(f"✅ Пользователь {first_name} {last_name} успешно добавлен в аккаунт!")
        st.info(f"📧 Email для входа: {email}")
        st.balloons()
        st.rerun()
        
    except Exception as e:
        st.error(f"❌ Ошибка добавления пользователя: {str(e)}")

def remove_user_from_account(user_id, user_name):
    """Remove user from account"""
    try:
        execute_query("""
            DELETE FROM users 
            WHERE id = :id AND organization_id = :org_id AND role != 'owner'
        """, {
            'id': user_id,
            'org_id': st.session_state.get('organization_id')
        })
        
        st.success(f"✅ Пользователь {user_name} удален из аккаунта")
        st.rerun()
        
    except Exception as e:
        st.error(f"❌ Ошибка удаления пользователя: {str(e)}")

def show_security_panel():
    """Security settings panel"""
    st.subheader("🔐 Безопасность аккаунта / Account Security")
    
    # Change password
    st.write("**Изменить пароль владельца аккаунта**")
    with st.form("change_password"):
        current_password = st.text_input("Текущий пароль", type="password")
        new_password = st.text_input("Новый пароль", type="password", help="Минимум 6 символов")
        confirm_password = st.text_input("Подтвердите новый пароль", type="password")
        
        if st.form_submit_button("🔄 Изменить пароль"):
            if not all([current_password, new_password, confirm_password]):
                st.error("❌ Заполните все поля")
            elif len(new_password) < 6:
                st.error("❌ Новый пароль должен содержать минимум 6 символов")
            elif new_password != confirm_password:
                st.error("❌ Новые пароли не совпадают")
            else:
                change_owner_password(current_password, new_password)

def change_owner_password(current_password, new_password):
    """Change owner password"""
    try:
        # Verify current password
        current_hash = hash_password(current_password)
        user_check = execute_query("""
            SELECT id FROM users 
            WHERE id = :user_id AND password_hash = :current_hash
        """, {
            'user_id': st.session_state.get('user_id'),
            'current_hash': current_hash
        })
        
        if not user_check:
            st.error("❌ Неверный текущий пароль")
            return
        
        # Update password
        new_hash = hash_password(new_password)
        execute_query("""
            UPDATE users 
            SET password_hash = :new_hash 
            WHERE id = :user_id
        """, {
            'new_hash': new_hash,
            'user_id': st.session_state.get('user_id')
        })
        
        st.success("✅ Пароль успешно изменен")
        
    except Exception as e:
        st.error(f"❌ Ошибка изменения пароля: {str(e)}")

def show_account_settings():
    """Account settings panel"""
    st.subheader("⚙️ Настройки аккаунта / Account Settings")
    
    # Get current organization data
    org_data = execute_query("""
        SELECT name, telegram_chat_id 
        FROM organizations 
        WHERE id = :org_id
    """, {'org_id': st.session_state.get('organization_id')})
    
    if org_data:
        org = org_data[0]
        
        # Organization name
        st.write("**Название организации**")
        with st.form("update_org_name"):
            new_name = st.text_input("Название", value=org[0])
            if st.form_submit_button("💾 Сохранить название"):
                if new_name and new_name != org[0]:
                    try:
                        execute_query("""
                            UPDATE organizations 
                            SET name = :name 
                            WHERE id = :id
                        """, {
                            'name': new_name,
                            'id': st.session_state.get('organization_id')
                        })
                        st.session_state.organization_name = new_name
                        st.success("✅ Название организации обновлено")
                        st.rerun()
                    except Exception as e:
                        st.error(f"❌ Ошибка обновления: {str(e)}")
        
        st.divider()
        
        # Danger zone - only for owners
        if can_delete_account():
            st.subheader("⚠️ Опасная зона / Danger Zone")
            st.warning("**ВНИМАНИЕ:** Действия в этом разделе необратимы!")
            
            with st.expander("🗑️ Удалить аккаунт навсегда", expanded=False):
            st.error("**ВНИМАНИЕ:** Удаление аккаунта приведет к:")
            st.write("• Удалению всех данных организации")
            st.write("• Удалению всех пользователей") 
            st.write("• Удалению всех автомобилей, бригад, штрафов, расходов")
            st.write("• Невозможности восстановления данных")
            
            confirm_text = st.text_input(
                'Введите "УДАЛИТЬ" для подтверждения',
                help="Это действие необратимо!"
            )
            
                if st.button("🗑️ УДАЛИТЬ АККАУНТ НАВСЕГДА", type="secondary"):
                    if confirm_text == "УДАЛИТЬ":
                        delete_account_permanently()
                    else:
                        st.error('❌ Для подтверждения введите "УДАЛИТЬ"')
        else:
            st.info("💡 Только владелец аккаунта может удалить организацию")

def delete_account_permanently():
    """Permanently delete the entire account"""
    try:
        org_id = st.session_state.get('organization_id')
        
        # Delete all organization data in correct order (respecting foreign keys)
        tables = [
            'user_documents', 'vehicle_documents', 'rental_contracts',
            'material_assignments', 'material_history', 
            'penalties', 'maintenances', 'car_expenses', 
            'vehicle_assignments', 'users', 'materials',
            'vehicles', 'teams', 'organizations'
        ]
        
        for table in tables:
            execute_query(f"DELETE FROM {table} WHERE organization_id = :org_id", {'org_id': org_id})
        
        # Clear session
        for key in ['authenticated', 'user_id', 'organization_id', 'user_role', 'organization_name']:
            if key in st.session_state:
                del st.session_state[key]
        
        st.success("✅ Аккаунт полностью удален")
        st.info("🔄 Перенаправление на страницу входа...")
        st.rerun()
        
    except Exception as e:
        st.error(f"❌ Ошибка удаления аккаунта: {str(e)}")

# Main execution
if __name__ == "__main__":
    show_account_management()