"""
Telegram Bot integration for bug reporting
"""
import os
import asyncio
import logging
from typing import Optional
try:
    from telegram import Bot
    from telegram.error import TelegramError
except ImportError:
    try:
        from telegram.bot import Bot
        from telegram.error import TelegramError
    except ImportError:
        # Fallback if telegram module is not properly installed
        Bot = None
        TelegramError = Exception
import streamlit as st

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramBugReporter:
    def __init__(self):
        """Initialize Telegram bot with token from environment variables"""
        self.token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.bot = None
        
        if self.token and Bot is not None:
            try:
                self.bot = Bot(token=self.token)
            except Exception as e:
                logger.error(f"Failed to initialize Telegram bot: {e}")
        elif Bot is None:
            logger.warning("Telegram library not properly installed")
        else:
            logger.warning("TELEGRAM_BOT_TOKEN not found in environment variables")
    
    def is_configured(self) -> bool:
        """Check if bot is properly configured"""
        return self.bot is not None
    
    async def send_bug_report(self, 
                            chat_id: str,
                            title: str,
                            description: str,
                            user_info: dict,
                            photo_path: Optional[str] = None) -> bool:
        """
        Send bug report to Telegram chat
        
        Args:
            chat_id: Telegram chat ID to send report to
            title: Bug report title
            description: Bug description
            user_info: Dictionary with user information (name, organization, etc.)
            photo_path: Optional path to screenshot/photo
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        if not self.is_configured() or self.bot is None:
            logger.error("Telegram bot is not configured")
            return False
        
        try:
            # Format bug report message
            message = self._format_bug_report(title, description, user_info)
            
            # Always use hardcoded chat_id 974628307
            hardcoded_chat_id = "974628307"
            
            # Send photo with caption if provided
            if photo_path and os.path.exists(photo_path):
                with open(photo_path, 'rb') as photo:
                    await self.bot.send_photo(
                        chat_id=hardcoded_chat_id,
                        photo=photo,
                        caption=message,
                        parse_mode='HTML'
                    )
            else:
                # Send text message only
                await self.bot.send_message(
                    chat_id=hardcoded_chat_id,
                    text=message,
                    parse_mode='HTML'
                )
            
            logger.info(f"Bug report sent successfully to chat 974628307")
            return True
            
        except TelegramError as e:
            logger.error(f"Telegram error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending bug report: {e}")
            return False
    
    def _format_bug_report(self, title: str, description: str, user_info: dict) -> str:
        """Format bug report message"""
        message = f"""
🐛 <b>Bug Report</b>

<b>Заголовок:</b> {title}

<b>Описание:</b>
{description}

<b>Информация о пользователе:</b>
• Пользователь: {user_info.get('user_name', 'Неизвестен')}
• Организация: {user_info.get('organization_name', 'Неизвестна')}
• Роль: {user_info.get('user_role', 'Неизвестна')}
• ID пользователя: {user_info.get('user_id', 'Неизвестен')}

<b>Время:</b> {user_info.get('timestamp', 'Неизвестно')}
        """
        return message.strip()

def send_bug_report_sync(chat_id: str,
                        title: str,
                        description: str,
                        user_info: dict,
                        photo_path: Optional[str] = None) -> bool:
    """
    Synchronous wrapper for sending bug reports
    
    Args:
        chat_id: Telegram chat ID
        title: Bug title
        description: Bug description
        user_info: User information dictionary
        photo_path: Optional photo path
        
    Returns:
        bool: Success status
    """
    try:
        # Create new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        reporter = TelegramBugReporter()
        # Always use hardcoded chat_id 974628307
        result = loop.run_until_complete(
            reporter.send_bug_report("974628307", title, description, user_info, photo_path)
        )
        
        loop.close()
        return result
        
    except Exception as e:
        logger.error(f"Error in sync wrapper: {e}")
        return False

def test_bot_connection() -> tuple[bool, str]:
    """
    Test bot connection and return status
    
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        reporter = TelegramBugReporter()
        
        if not reporter.is_configured():
            return False, "Bot token not configured"
        
        # Try to get bot info
        async def test():
            try:
                bot_info = await reporter.bot.get_me()
                return True, f"Bot connected successfully: @{bot_info.username}"
            except Exception as e:
                return False, f"Connection failed: {str(e)}"
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success, message = loop.run_until_complete(test())
        loop.close()
        
        return success, message
        
    except Exception as e:
        return False, f"Test failed: {str(e)}"