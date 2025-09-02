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
from utils import ensure_directory_exists, upload_multiple_files

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
        # Screenshots upload
        st.markdown("**📷 Скриншоты (опционально)**")
        uploaded_files = st.file_uploader(
            "Загрузите скриншоты",
            type=['png', 'jpg', 'jpeg'],
            accept_multiple_files=True,
            help="Прикрепите один или несколько скриншотов проблемы"
        )
        
        if uploaded_files:
            st.write(f"Загружено файлов: {len(uploaded_files)}")
            for i, file in enumerate(uploaded_files[:3]):  # Show max 3 previews
                st.image(file, caption=f"Скриншот {i+1}: {file.name}", use_container_width=True)
            if len(uploaded_files) > 3:
                st.info(f"и ещё {len(uploaded_files) - 3} файл(ов)...")
        
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
            # Save screenshots if uploaded
            photo_paths = []
            if uploaded_files:
                try:
                    photo_paths = upload_multiple_files(uploaded_files, 'bug_reports')
                    if photo_paths:
                        st.success(f"✅ Сохранено {len(photo_paths)} файл(ов)")
                except Exception as e:
                    st.error(f"❌ Ошибка сохранения файлов: {str(e)}")
                    photo_paths = []
            
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
                    # Send bug report (with first photo if exists)
                    primary_photo = photo_paths[0] if photo_paths else None
                    success = send_bug_report_sync(
                        chat_id=chat_id,
                        title=bug_title,
                        description=enhanced_description,
                        user_info=user_info,
                        photo_path=primary_photo
                    )
                    
                    # Send additional photos if there are more than one
                    if success and len(photo_paths) > 1:
                        for i, additional_photo in enumerate(photo_paths[1:], 2):
                            send_bug_report_sync(
                                chat_id=chat_id,
                                title=f"{bug_title} - Скриншот {i}",
                                description=f"Дополнительный скриншот к багрепорту",
                                user_info=user_info,
                                photo_path=additional_photo
                            )
                    
                    if success:
                        st.success("✅ Багрепорт успешно отправлен в Telegram!")
                        st.balloons()
                        
                        # Clean up uploaded files
                        for photo_path in photo_paths:
                            if photo_path and os.path.exists(photo_path):
                                try:
                                    os.remove(photo_path)
                                except:
                                    pass  # Ignore cleanup errors
                    else:
                        st.error("❌ Ошибка отправки багрепорта. Проверьте настройки бота и Chat ID.")
                        
                except Exception as e:
                    st.error(f"❌ Произошла ошибка: {str(e)}")
                    
                    # Clean up uploaded files in case of error
                    for photo_path in photo_paths:
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