import streamlit as st
import os
from datetime import datetime
from telegram_bot import send_bug_report_sync
from auth import require_auth, show_org_header

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

st.subheader("📝 Сообщить о проблеме / Report an Issue")

with st.form("bug_report_form"):
    # Title
    bug_title = st.text_input(
        "📌 Заголовок / Title *",
        placeholder="Кратко опишите проблему / Brief description"
    )
    
    # Description
    bug_description = st.text_area(
        "📄 Описание проблемы / Problem Description *",
        placeholder="Опишите что произошло / Describe what happened",
        height=200
    )
    
    # Screenshot upload
    screenshot = st.file_uploader(
        "📸 Скриншот / Screenshot",
        type=['png', 'jpg', 'jpeg'],
        help="Приложите скриншот если нужно / Attach screenshot if needed"
    )
    
    # Submit button
    submitted = st.form_submit_button(
        "📨 Отправить / Send",
        use_container_width=True,
        type="primary"
    )
    
    if submitted:
        if not bug_title:
            st.error("❌ Укажите заголовок / Please provide a title")
        elif not bug_description:
            st.error("❌ Опишите проблему / Please describe the issue")
        else:
            # User info for report
            user_info = {
                'user_name': user_name,
                'user_email': user_email,
                'user_role': user_role,
                'user_id': str(user_id),
                'organization_name': organization_name,
                'organization_id': str(organization_id),
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
                with st.spinner("📤 Отправка... / Sending..."):
                    try:
                        # Send bug report via Telegram
                        success = send_bug_report_sync(
                            chat_id="974628307",
                            title=bug_title,
                            description=bug_description,
                            user_info=user_info,
                            photo_path=photo_path
                        )
                        
                        if success:
                            st.success("✅ Репорт отправлен! / Report sent!")
                            st.balloons()
                            # Clear form
                            st.rerun()
                        else:
                            st.error("❌ Ошибка отправки / Send error")
                    except Exception as e:
                        st.error(f"❌ Ошибка: {str(e)}")
                    finally:
                        # Clean up temporary file
                        if photo_path and os.path.exists(photo_path):
                            os.remove(photo_path)
            else:
                st.warning("⚠️ Telegram бот не настроен / Telegram bot not configured")