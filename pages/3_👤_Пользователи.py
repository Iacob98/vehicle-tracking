import streamlit as st
from database import execute_query
from auth import require_auth, show_org_header, is_admin

# Page config
st.set_page_config(
    page_title="Пользователи",
    page_icon="👤",
    layout="wide"
)

# Require authentication
user = require_auth()
if not user:
    st.stop()

# Show header
show_org_header()

# Admin check
if not is_admin():
    st.error("❌ Доступ запрещен. Только администраторы могут управлять пользователями.")
    st.stop()

st.title("👤 Пользователи платформы")

# Simple users list
try:
    users = execute_query("""
        SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.role,
            u.email
        FROM users u
        WHERE u.organization_id = :org_id
        ORDER BY u.first_name, u.last_name
    """, {'org_id': str(user.organization_id)})
    
    if users:
        st.write(f"Найдено пользователей: {len(users)}")
        for usr in users:
            st.write(f"- {usr[1]} {usr[2]} ({usr[3]}) - {usr[4]}")
    else:
        st.write("Пользователи не найдены")
        
except Exception as e:
    st.error(f"Ошибка: {str(e)}")
    import traceback
    st.code(traceback.format_exc())