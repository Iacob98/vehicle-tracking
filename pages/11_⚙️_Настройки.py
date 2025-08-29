"""
Organization Settings Page - Configure organization-wide settings
"""
import streamlit as st
from auth import require_auth, show_org_header
from database import execute_query
from telegram_bot import test_bot_connection

# Page configuration
st.set_page_config(
    page_title="Настройки организации - Fleet Management",
    page_icon="⚙️",
    layout="wide"
)

# Initialize database and require authentication
require_auth()

# Check if user is admin
if st.session_state.get('user_role') not in ['admin']:
    st.error("❌ Доступ запрещен. Только администраторы могут изменять настройки организации.")
    st.stop()

# Set default language
if 'language' not in st.session_state:
    st.session_state.language = 'ru'

# Organization header
show_org_header()

# Title
st.title("⚙️ Настройки организации")

# Get current organization settings
try:
    org_data = execute_query(
        "SELECT name, telegram_chat_id FROM organizations WHERE id = :org_id",
        {'org_id': st.session_state.get('organization_id')}
    )
    
    if org_data:
        current_org_name = org_data[0][0]
        current_chat_id = org_data[0][1] if org_data[0][1] else ""
    else:
        st.error("❌ Ошибка загрузки данных организации")
        st.stop()
        
except Exception as e:
    st.error(f"❌ Ошибка загрузки настроек: {str(e)}")
    st.stop()

# Organization Info
st.subheader("📋 Информация об организации")
with st.container():
    col1, col2 = st.columns([1, 1])
    with col1:
        st.info(f"**Название:** {current_org_name}")
    with col2:
        st.info(f"**ID организации:** {st.session_state.get('organization_id')}")

st.divider()

# Telegram Settings
st.subheader("📱 Настройки Telegram")

# Test bot connection
with st.expander("🔧 Тестирование бота", expanded=False):
    if st.button("Проверить подключение к Telegram боту"):
        with st.spinner("Проверяем подключение..."):
            success, message = test_bot_connection()
            if success:
                st.success(f"✅ {message}")
            else:
                st.error(f"❌ {message}")

# Chat ID Configuration
st.markdown("### 💬 Настройка Chat ID для багрепортов")

with st.form("telegram_settings_form"):
    new_chat_id = st.text_input(
        "Telegram Chat ID",
        value=current_chat_id,
        placeholder="-1001234567890",
        help="ID чата или канала Telegram для отправки багрепортов от всех пользователей организации"
    )
    
    st.info("""
    💡 **Как получить Chat ID:**
    1. Создайте группу или канал в Telegram
    2. Добавьте вашего бота в группу/канал
    3. Отправьте любое сообщение в группу
    4. Используйте @userinfobot или @getidsbot для получения Chat ID
    5. Chat ID групп и каналов начинается с минуса (например: -1001234567890)
    """)
    
    # Submit button
    submitted = st.form_submit_button(
        "💾 Сохранить настройки",
        use_container_width=True,
        type="primary"
    )
    
    if submitted:
        try:
            # Update organization settings
            execute_query(
                "UPDATE organizations SET telegram_chat_id = :chat_id WHERE id = :org_id",
                {
                    'chat_id': new_chat_id if new_chat_id.strip() else None,
                    'org_id': st.session_state.get('organization_id')
                }
            )
            
            st.success("✅ Настройки успешно сохранены!")
            st.balloons()
            
            # Refresh the page to show updated settings
            if new_chat_id.strip() != current_chat_id:
                st.rerun()
                
        except Exception as e:
            st.error(f"❌ Ошибка сохранения настроек: {str(e)}")

# Current settings display
if current_chat_id:
    st.success(f"✅ Текущий Chat ID: `{current_chat_id}`")
    st.info("🔔 Все багрепорты будут автоматически отправляться в настроенный чат")
else:
    st.warning("⚠️ Chat ID не настроен. Пользователям потребуется вводить Chat ID вручную при отправке багрепортов")

st.divider()

# Additional Settings Section (placeholder for future features)
st.subheader("🔧 Дополнительные настройки")
st.info("📋 Здесь будут добавлены дополнительные настройки организации в будущих версиях")

# Help section
with st.expander("❓ Справка по настройкам", expanded=False):
    st.markdown("""
    ### Telegram Chat ID
    - **Что это:** Уникальный идентификатор чата или канала в Telegram
    - **Зачем нужен:** Для автоматической отправки багрепортов от всех сотрудников организации
    - **Как получить:** Используйте специальных ботов (@userinfobot, @getidsbot) после добавления вашего бота в чат
    
    ### Типы Chat ID
    - **Личные чаты:** Положительные числа (например: 123456789)
    - **Группы:** Отрицательные числа (например: -123456789)
    - **Каналы:** Отрицательные числа с префиксом 100 (например: -1001234567890)
    
    ### Безопасность
    - Только администраторы могут изменять настройки организации
    - Chat ID сохраняется в зашифрованном виде
    - Бот может отправлять сообщения только в чаты, где он добавлен
    """)