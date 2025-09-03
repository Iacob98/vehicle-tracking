import streamlit as st
import os
from datetime import datetime
from telegram_bot import send_bug_report_sync
from auth import require_auth, show_org_header
from database import execute_query

# Page config
st.set_page_config(
    page_title="Баг репорт",
    page_icon="🐛",
    layout="wide"
)

# Require authentication
require_auth()
show_org_header()

# Get user info
user_email = st.session_state.get('user_email', 'unknown')
user_name = st.session_state.get('user_name', 'Unknown')
user_role = st.session_state.get('user_role', 'unknown')
user_id = st.session_state.get('user_id', 'unknown')
organization_id = st.session_state.get('organization_id', 'unknown')
organization_name = st.session_state.get('organization_name', 'Unknown Organization')

# Main page
st.title("🐛 Баг репорт / Bug Report")

# Check if Telegram bot is configured
bot_configured = os.getenv('TELEGRAM_BOT_TOKEN') is not None

if not bot_configured:
    st.warning("⚠️ Telegram бот не настроен. Обратитесь к администратору для настройки.")
    st.info("💡 Необходимо установить TELEGRAM_BOT_TOKEN в переменных окружения")

# Create two columns
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("📝 Сообщить о проблеме / Report an Issue")
    
    with st.form("bug_report_form"):
        # Bug report fields
        bug_category = st.selectbox(
            "🏷️ Категория проблемы / Problem Category",
            [
                "🔴 Критическая ошибка / Critical Error",
                "🟡 Функционал не работает / Feature Not Working",
                "🟢 Улучшение / Improvement",
                "🔵 Вопрос / Question",
                "⚪ Другое / Other"
            ]
        )
        
        bug_title = st.text_input(
            "📌 Заголовок / Title *",
            placeholder="Кратко опишите проблему / Brief description",
            help="Максимум 100 символов"
        )
        
        bug_description = st.text_area(
            "📄 Подробное описание / Detailed Description *",
            placeholder="Опишите что произошло, какие действия привели к ошибке / Describe what happened",
            height=150,
            help="Чем подробнее описание, тем быстрее мы решим проблему"
        )
        
        # Steps to reproduce
        steps_to_reproduce = st.text_area(
            "🔄 Шаги для воспроизведения / Steps to Reproduce",
            placeholder="1. Открыл страницу...\n2. Нажал кнопку...\n3. Получил ошибку...",
            height=100
        )
        
        # Expected vs Actual behavior
        col_exp, col_act = st.columns(2)
        with col_exp:
            expected_behavior = st.text_area(
                "✅ Ожидаемое поведение / Expected",
                placeholder="Что должно было произойти",
                height=80
            )
        with col_act:
            actual_behavior = st.text_area(
                "❌ Фактическое поведение / Actual",
                placeholder="Что произошло на самом деле",
                height=80
            )
        
        # Page where error occurred
        page_with_error = st.selectbox(
            "📍 Страница с ошибкой / Page with Error",
            [
                "Главная / Home",
                "🚗 Автомобили / Vehicles",
                "👷 Бригады / Teams",
                "👤 Пользователи / Users",
                "🚚 Штрафы / Penalties",
                "📦 Материалы / Materials",
                "💰 Расходы на авто / Vehicle Expenses",
                "💰 Расходы / Expenses",
                "📊 Аналитика расходов / Analytics",
                "🔄 Возврат оборудования / Equipment Return",
                "🏢 Управление аккаунтом / Account Management",
                "Другая / Other"
            ]
        )
        
        # Priority
        priority = st.radio(
            "⚡ Приоритет / Priority",
            ["🔴 Высокий / High", "🟡 Средний / Medium", "🟢 Низкий / Low"],
            horizontal=True
        )
        
        # Screenshot upload
        screenshot = st.file_uploader(
            "📸 Скриншот ошибки / Error Screenshot",
            type=['png', 'jpg', 'jpeg'],
            help="Приложите скриншот для лучшего понимания проблемы"
        )
        
        # Additional info
        additional_info = st.text_area(
            "ℹ️ Дополнительная информация / Additional Info",
            placeholder="Любая другая полезная информация",
            height=80
        )
        
        # Submit button
        submitted = st.form_submit_button(
            "📨 Отправить репорт / Send Report",
            use_container_width=True,
            type="primary"
        )
        
        if submitted:
            if not bug_title:
                st.error("❌ Пожалуйста, укажите заголовок / Please provide a title")
            elif not bug_description:
                st.error("❌ Пожалуйста, опишите проблему / Please describe the issue")
            else:
                # Prepare bug report data
                full_description = f"""
Категория: {bug_category}

Описание:
{bug_description}

Шаги воспроизведения:
{steps_to_reproduce if steps_to_reproduce else "Не указано"}

Ожидаемое поведение: {expected_behavior if expected_behavior else "Не указано"}
Фактическое поведение: {actual_behavior if actual_behavior else "Не указано"}

Страница: {page_with_error}
Приоритет: {priority}

Дополнительная информация:
{additional_info if additional_info else "Не указано"}
                """
                
                # User info for report
                user_info = {
                    'user_name': user_name,
                    'user_email': user_email,
                    'user_role': user_role,
                    'user_id': user_id,
                    'organization_name': organization_name,
                    'organization_id': organization_id,
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
                
                # Handle screenshot if provided
                photo_path = None
                if screenshot:
                    # Save screenshot temporarily
                    photo_path = f"/tmp/bug_screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{screenshot.name.split('.')[-1]}"
                    with open(photo_path, "wb") as f:
                        f.write(screenshot.getbuffer())
                
                # Send to Telegram
                if bot_configured:
                    with st.spinner("📤 Отправка репорта... / Sending report..."):
                        try:
                            # Send bug report via Telegram
                            success = send_bug_report_sync(
                                chat_id="974628307",  # Will be overridden to hardcoded value
                                title=bug_title,
                                description=full_description,
                                user_info=user_info,
                                photo_path=photo_path
                            )
                            
                            if success:
                                st.success("✅ Репорт успешно отправлен! Мы рассмотрим его в ближайшее время.")
                                st.balloons()
                                
                                # Save to database for tracking
                                try:
                                    execute_query("""
                                        INSERT INTO bug_reports (
                                            user_id, organization_id, title, description, 
                                            category, priority, page, status, created_at
                                        ) VALUES (
                                            :user_id, :org_id, :title, :description,
                                            :category, :priority, :page, 'new', :created_at
                                        )
                                    """, {
                                        'user_id': user_id,
                                        'org_id': organization_id,
                                        'title': bug_title,
                                        'description': full_description,
                                        'category': bug_category.split('/')[0].strip(),
                                        'priority': priority.split('/')[0].strip(),
                                        'page': page_with_error,
                                        'created_at': datetime.now()
                                    })
                                except:
                                    pass  # Table might not exist
                                
                                # Clear form
                                st.rerun()
                            else:
                                st.error("❌ Ошибка отправки репорта. Попробуйте позже.")
                        except Exception as e:
                            st.error(f"❌ Ошибка: {str(e)}")
                        finally:
                            # Clean up temporary file
                            if photo_path and os.path.exists(photo_path):
                                os.remove(photo_path)
                else:
                    st.error("❌ Telegram бот не настроен. Обратитесь к администратору.")

with col2:
    st.subheader("ℹ️ Информация / Information")
    
    # Status card
    st.info("""
    **📞 Контакты поддержки:**
    
    Telegram: @support_fleet
    Email: support@fleet.com
    Телефон: +49 xxx xxx xxxx
    """)
    
    # Guidelines
    st.markdown("""
    ### 📋 Рекомендации:
    
    **Хороший баг репорт содержит:**
    - ✅ Понятный заголовок
    - ✅ Подробное описание
    - ✅ Шаги воспроизведения
    - ✅ Скриншот ошибки
    - ✅ Версию браузера
    
    **Приоритеты:**
    - 🔴 **Высокий** - блокирует работу
    - 🟡 **Средний** - мешает работе
    - 🟢 **Низкий** - косметические
    """)
    
    # Recent reports info
    st.markdown("### 📊 Статистика")
    try:
        # Try to get statistics if table exists
        stats = execute_query("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'new' THEN 1 END) as new
            FROM bug_reports
            WHERE organization_id = :org_id
            AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        """, {'org_id': organization_id})
        
        if stats and len(stats) > 0:
            total, resolved, in_progress, new = stats[0]
            
            col_stat1, col_stat2 = st.columns(2)
            with col_stat1:
                st.metric("📝 Всего", total)
                st.metric("✅ Решено", resolved)
            with col_stat2:
                st.metric("🔄 В работе", in_progress)
                st.metric("🆕 Новые", new)
    except:
        st.info("📊 Статистика недоступна")

# Footer
st.markdown("---")
st.markdown("""
<div style='text-align: center; color: gray;'>
    <p>💡 Ваши отзывы помогают нам делать систему лучше!</p>
    <p>Your feedback helps us improve the system!</p>
</div>
""", unsafe_allow_html=True)