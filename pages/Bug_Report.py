"""
Bug Report Page - Send bug reports with screenshots to Telegram
"""
import streamlit as st
import os
import uuid
from datetime import datetime
from auth import require_auth, show_org_header
from translations import get_text
from telegram_bot import send_bug_report_sync, test_bot_connection
from utils import ensure_directory_exists

# Page configuration
st.set_page_config(
    page_title="Bug Report - Fleet Management",
    page_icon="🐛",
    layout="wide"
)

# Initialize database and require authentication
require_auth()

# Set default language
if 'language' not in st.session_state:
    st.session_state.language = 'ru'

# Organization header
show_org_header()

# Title
st.title("🐛 Bug Report / Сообщить о проблеме")

# Test bot connection first
with st.expander("🔧 Статус Telegram бота", expanded=False):
    if st.button("Проверить подключение к боту"):
        with st.spinner("Проверяем подключение..."):
            success, message = test_bot_connection()
            if success:
                st.success(f"✅ {message}")
            else:
                st.error(f"❌ {message}")

st.divider()

# Bug report form
st.subheader("📝 Сообщить о проблеме")

with st.form("bug_report_form", clear_on_submit=True):
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Bug title
        bug_title = st.text_input(
            "Заголовок проблемы *",
            placeholder="Кратко опишите проблему",
            help="Краткое описание проблемы (обязательно)"
        )
        
        # Bug description
        bug_description = st.text_area(
            "Подробное описание *",
            placeholder="Подробно опишите проблему, шаги для воспроизведения, ожидаемое поведение...",
            height=150,
            help="Детальное описание проблемы (обязательно)"
        )
        
    
    with col2:
        # Screenshot upload
        st.markdown("**📷 Скриншот (опционально)**")
        uploaded_file = st.file_uploader(
            "Загрузите скриншот",
            type=['png', 'jpg', 'jpeg'],
            help="Прикрепите скриншот проблемы для лучшего понимания"
        )
        
        if uploaded_file:
            st.image(uploaded_file, caption="Загруженный скриншот", use_container_width=True)
        
        # Hardcoded Chat ID - always use 974628307
        chat_id = "974628307"
        st.success(f"✅ Chat ID настроен: {chat_id}")
        st.text_input(
            "Chat ID для отправки",
            value=chat_id,
            disabled=True,
            help="Chat ID захардкожен для отправки всех уведомлений"
        )
    
    # Submit button
    submitted = st.form_submit_button(
        "🚀 Отправить багрепорт",
        use_container_width=True,
        type="primary"
    )
    
    if submitted:
        # Validation
        if not bug_title or not bug_description:
            st.error("❌ Пожалуйста, заполните заголовок и описание проблемы")
        # chat_id always set to hardcoded value, no validation needed
        else:
            # Save screenshot if uploaded
            photo_path = None
            if uploaded_file:
                try:
                    # Ensure upload directory exists
                    upload_dir = "uploads/bug_reports"
                    ensure_directory_exists(upload_dir)
                    
                    # Generate unique filename
                    file_extension = uploaded_file.name.split('.')[-1]
                    filename = f"{uuid.uuid4()}.{file_extension}"
                    photo_path = os.path.join(upload_dir, filename)
                    
                    # Save file
                    with open(photo_path, "wb") as f:
                        f.write(uploaded_file.getbuffer())
                    
                except Exception as e:
                    st.error(f"❌ Ошибка сохранения файла: {str(e)}")
                    photo_path = None
            
            # Prepare user info
            user_info = {
                'user_name': st.session_state.get('user_name', 'Неизвестен'),
                'organization_name': st.session_state.get('organization_name', 'Неизвестна'), 
                'user_role': st.session_state.get('user_role', 'Неизвестна'),
                'user_id': str(st.session_state.get('user_id', 'Неизвестен')),
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            # Enhanced bug description with metadata
            enhanced_description = bug_description
            
            # Send bug report
            with st.spinner("Отправляем багрепорт..."):
                try:
                    success = send_bug_report_sync(
                        chat_id=chat_id,
                        title=bug_title,
                        description=enhanced_description,
                        user_info=user_info,
                        photo_path=photo_path
                    )
                    
                    if success:
                        st.success("✅ Багрепорт успешно отправлен в Telegram!")
                        st.balloons()
                        
                        # Clean up uploaded file
                        if photo_path and os.path.exists(photo_path):
                            try:
                                os.remove(photo_path)
                            except:
                                pass  # Ignore cleanup errors
                    else:
                        st.error("❌ Ошибка отправки багрепорта. Проверьте настройки бота и Chat ID.")
                        
                except Exception as e:
                    st.error(f"❌ Произошла ошибка: {str(e)}")
                    
                    # Clean up uploaded file in case of error
                    if photo_path and os.path.exists(photo_path):
                        try:
                            os.remove(photo_path)
                        except:
                            pass

# Instructions section
with st.expander("📚 Инструкция по использованию", expanded=False):
    st.markdown("""
    ### Как отправить багрепорт:
    
    1. **Заполните форму:**
       - Укажите краткий заголовок проблемы
       - Подробно опишите проблему
       - Выберите приоритет и категорию
    
    2. **Приложите скриншот (опционально):**
       - Загрузите изображение в формате PNG, JPG или JPEG
       - Скриншот поможет разработчикам лучше понять проблему
    
    3. **Отправьте:**
       - Нажмите кнопку "Отправить багрепорт"
       - Сообщение будет отправлено в указанный чат
    
    ### Автоматическая отправка:
    - Все уведомления автоматически отправляются администратору
    - Chat ID уже настроен и не требует изменения
    """)

# Tips section
st.info("""
💡 **Советы для эффективного багрепорта:**
- Опишите шаги для воспроизведения проблемы
- Укажите ожидаемое и фактическое поведение  
- Приложите скриншот если возможно
- Все уведомления автоматически отправляются администратору
""")