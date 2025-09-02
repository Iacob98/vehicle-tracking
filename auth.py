"""
Authentication and organization management system
"""
import hashlib
import uuid
import streamlit as st
from database import execute_query
from datetime import datetime, timedelta
import os

# Session management
def init_session():
    """Initialize session state variables"""
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    if 'user_id' not in st.session_state:
        st.session_state.user_id = None
    if 'organization_id' not in st.session_state:
        st.session_state.organization_id = None
    if 'user_role' not in st.session_state:
        st.session_state.user_role = None
    if 'organization_name' not in st.session_state:
        st.session_state.organization_name = None

def hash_password(password):
    """Hash password with salt"""
    salt = "fleet_management_salt_2025"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def create_organization(org_name, admin_email, admin_password, admin_first_name, admin_last_name):
    """Create new organization with admin user"""
    try:
        org_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        hashed_password = hash_password(admin_password)
        
        # Create organization
        execute_query("""
            INSERT INTO organizations (id, name, created_at, subscription_status)
            VALUES (:id, :name, :created_at, 'active')
        """, {
            'id': org_id,
            'name': org_name,
            'created_at': datetime.now()
        })
        
        # Create owner user (not admin, but owner)
        execute_query("""
            INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role, created_at)
            VALUES (:id, :org_id, :email, :password_hash, :first_name, :last_name, 'owner', :created_at)
        """, {
            'id': user_id,
            'org_id': org_id,
            'email': admin_email,
            'password_hash': hashed_password,
            'first_name': admin_first_name,
            'last_name': admin_last_name,
            'created_at': datetime.now()
        })
        
        return True, "Organization created successfully"
    except Exception as e:
        return False, f"Error creating organization: {str(e)}"

def authenticate_user(email, password):
    """Authenticate user and set session"""
    try:
        hashed_password = hash_password(password)
        
        result = execute_query("""
            SELECT u.id, u.organization_id, u.first_name, u.last_name, u.role, o.name as org_name
            FROM users u
            JOIN organizations o ON u.organization_id = o.id
            WHERE u.email = :email AND u.password_hash = :password_hash AND o.subscription_status = 'active'
        """, {
            'email': email,
            'password_hash': hashed_password
        })
        
        if result and isinstance(result, list) and len(result) > 0:
            user = result[0]
            st.session_state.authenticated = True
            st.session_state.user_id = user[0]
            st.session_state.organization_id = user[1]
            st.session_state.user_role = user[4]
            st.session_state.organization_name = user[5]
            return True, f"Welcome, {user[2]} {user[3]}!"
        else:
            return False, "Invalid email or password"
    except Exception as e:
        return False, f"Authentication error: {str(e)}"

def logout():
    """Logout user and clear session"""
    st.session_state.authenticated = False
    st.session_state.user_id = None
    st.session_state.organization_id = None
    st.session_state.user_role = None
    st.session_state.organization_name = None
    st.rerun()

def require_auth():
    """Decorator to require authentication"""
    init_session()
    if not st.session_state.authenticated:
        show_login_page()
        st.stop()

def get_org_filter():
    """Get organization filter for SQL queries"""
    if st.session_state.organization_id:
        return f"AND organization_id = '{st.session_state.organization_id}'"
    return ""

def show_login_page():
    """Show login/registration page"""
    st.title("🚗 Fleet Management System")
    
    tab1, tab2 = st.tabs(["Вход / Login", "Регистрация / Register"])
    
    with tab1:
        st.subheader("Вход в систему / System Login")
        
        with st.form("login_form"):
            email = st.text_input("Email")
            password = st.text_input("Пароль / Password", type="password")
            
            if st.form_submit_button("Войти / Login", type="primary"):
                if email and password:
                    success, message = authenticate_user(email, password)
                    if success:
                        st.success(message)
                        st.rerun()
                    else:
                        st.error(message)
                else:
                    st.error("Введите email и пароль / Enter email and password")
    
    with tab2:
        st.subheader("Регистрация организации / Organization Registration")
        st.info("Создайте новую организацию и получите доступ к системе управления автопарком")
        
        with st.form("register_form"):
            org_name = st.text_input("Название организации / Organization Name")
            admin_first_name = st.text_input("Имя администратора / Admin First Name")
            admin_last_name = st.text_input("Фамилия администратора / Admin Last Name") 
            admin_email = st.text_input("Email администратора / Admin Email")
            admin_password = st.text_input("Пароль / Password", type="password")
            admin_password_confirm = st.text_input("Подтвердите пароль / Confirm Password", type="password")
            
            agree_terms = st.checkbox("Согласен с условиями использования / I agree to terms of service")
            
            if st.form_submit_button("Создать организацию / Create Organization", type="primary"):
                if not all([org_name, admin_first_name, admin_last_name, admin_email, admin_password]):
                    st.error("Заполните все поля / Fill all fields")
                elif admin_password != admin_password_confirm:
                    st.error("Пароли не совпадают / Passwords don't match")
                elif len(admin_password) < 6:
                    st.error("Пароль должен содержать минимум 6 символов / Password must be at least 6 characters")
                elif not agree_terms:
                    st.error("Необходимо согласие с условиями / Terms agreement required")
                else:
                    success, message = create_organization(org_name, admin_email, admin_password, admin_first_name, admin_last_name)
                    if success:
                        st.success(message)
                        st.info("Теперь войдите в систему с вашими данными / Now login with your credentials")
                    else:
                        st.error(message)

def show_org_header():
    """Show organization header with logout"""
    if st.session_state.authenticated:
        col1, col2, col3 = st.columns([3, 1, 1])
        with col1:
            st.markdown(f"**🏢 {st.session_state.organization_name}**")
        with col2:
            st.markdown(f"👤 {st.session_state.user_role}")
        with col3:
            if st.button("Выход / Logout"):
                logout()
        st.divider()

def is_admin():
    """Check if current user has admin rights (owner or admin)"""
    user_role = st.session_state.get('user_role')
    return user_role in ['owner', 'admin']

def is_manager():
    """Check if current user is manager or higher"""
    user_role = st.session_state.get('user_role')
    return user_role in ['owner', 'admin', 'manager']

def is_owner():
    """Check if current user is owner"""
    return st.session_state.get('user_role') == 'owner'

def can_manage_users():
    """Check if user can add/edit/delete platform users (only admins)"""
    return is_admin()

def can_manage_team_members():
    """Check if user can manage team members (managers and admins)"""
    return is_manager()

def can_delete_account():
    """Check if user can delete account - only owner"""
    return is_owner()