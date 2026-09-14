import asyncio
import hashlib
import json
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch, MagicMock

import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.routes.telegram import (
    MSG_ALREADY_CONNECTED,
    MSG_EXPIRED_TOKEN,
    MSG_INVALID_TOKEN,
    MSG_SUCCESS_CONNECTED,
    MSG_USED_TOKEN,
    MSG_WELCOME_PROMPT,
    verify_secret_header,
)
from app.services.telegram_client import TelegramClient


class TestTelegramWebhook(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        settings.TELEGRAM_WEBHOOK_SECRET = "test_webhook_secret_123"
        settings.TELEGRAM_BOT_TOKEN = "test_bot_token_12345"
        settings.FRONTEND_URL = "http://localhost:3000"

    def test_01_webhook_secret_validation(self):
        """1. Valid webhook secret accepted, 2. Invalid rejected, 3. Missing rejected."""
        # 1. Valid
        self.assertTrue(verify_secret_header("test_webhook_secret_123"))
        # 2. Invalid
        self.assertFalse(verify_secret_header("wrong_secret_token"))
        # 3. Missing / None
        self.assertFalse(verify_secret_header(None))
        self.assertFalse(verify_secret_header(""))

    @patch("app.routes.telegram.telegram_client.send_message", new_callable=AsyncMock)
    @patch("app.routes.telegram.telegram_db.link_account_atomically", new_callable=AsyncMock)
    @patch("app.routes.telegram.telegram_db.get_connection_by_chat_id", new_callable=AsyncMock)
    @patch("app.routes.telegram.telegram_db.get_link_token_by_hash", new_callable=AsyncMock)
    async def test_04_valid_start_token_links_account(
        self,
        mock_get_token,
        mock_get_conn,
        mock_link_account,
        mock_send_message,
    ):
        """4. /start with valid token successfully hashes token, links account, and sends confirmation."""
        raw_token = "valid_random_token_abcdef1234567890"
        expected_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

        mock_get_token.return_value = {
            "id": "token_123",
            "userId": "user_farmer_1",
            "tokenHash": expected_hash,
            "expiresAt": datetime.now(timezone.utc) + timedelta(minutes=10),
            "usedAt": None,
        }
        mock_get_conn.return_value = None
        mock_link_account.return_value = True
        mock_send_message.return_value = {"ok": True}

        from app.routes.telegram import telegram_webhook

        # Mock FastAPI Request
        request = MagicMock()
        request.json = AsyncMock(
            return_value={
                "update_id": 1001,
                "message": {
                    "message_id": 1,
                    "chat": {"id": 123456789},
                    "from": {"id": 123456789, "username": "farmer_patil"},
                    "text": f"/start {raw_token}",
                },
            }
        )

        res = await telegram_webhook(
            request=request,
            x_telegram_bot_api_secret_token="test_webhook_secret_123",
        )

        self.assertTrue(res["ok"])
        self.assertEqual(res["status"], "account_linked")
        self.assertEqual(res["userId"], "user_farmer_1")

        # Verify token lookup used SHA-256 hash
        mock_get_token.assert_awaited_once_with(expected_hash)

        # Verify atomic account linking parameters
        mock_link_account.assert_awaited_once_with(
            token_id="token_123",
            user_id="user_farmer_1",
            telegram_chat_id="123456789",
            telegram_username="farmer_patil",
        )

        # Verify confirmation message was sent
        mock_send_message.assert_awaited_once_with(
            chat_id="123456789",
            text=MSG_SUCCESS_CONNECTED,
            reply_markup={"inline_keyboard": [[{"text": "Open Maitri", "url": "http://localhost:3000"}]]},
        )

    @patch("app.routes.telegram.telegram_client.send_message", new_callable=AsyncMock)
    @patch("app.routes.telegram.telegram_db.get_link_token_by_hash", new_callable=AsyncMock)
    async def test_05_invalid_token_returns_error(self, mock_get_token, mock_send_message):
        """5. /start with invalid token sends MSG_INVALID_TOKEN."""
        mock_get_token.return_value = None
        mock_send_message.return_value = {"ok": True}

        from app.routes.telegram import telegram_webhook

        request = MagicMock()
        request.json = AsyncMock(
            return_value={
                "message": {
                    "chat": {"id": 123456789},
                    "text": "/start invalid_token_xyz",
                }
            }
        )

        res = await telegram_webhook(
            request=request,
            x_telegram_bot_api_secret_token="test_webhook_secret_123",
        )

        self.assertEqual(res["status"], "token_not_found")
        mock_send_message.assert_awaited_once_with(
            chat_id="123456789",
            text=MSG_INVALID_TOKEN,
        )

    @patch("app.routes.telegram.telegram_client.send_message", new_callable=AsyncMock)
    @patch("app.routes.telegram.telegram_db.get_link_token_by_hash", new_callable=AsyncMock)
    async def test_06_expired_token_returns_error(self, mock_get_token, mock_send_message):
        """6. /start with expired token sends MSG_EXPIRED_TOKEN."""
        raw_token = "expired_token_123"
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

        # Expired 5 minutes ago
        mock_get_token.return_value = {
            "id": "token_exp",
            "userId": "user_1",
            "tokenHash": token_hash,
            "expiresAt": datetime.now(timezone.utc) - timedelta(minutes=5),
            "usedAt": None,
        }
        mock_send_message.return_value = {"ok": True}

        from app.routes.telegram import telegram_webhook

        request = MagicMock()
        request.json = AsyncMock(
            return_value={
                "message": {
                    "chat": {"id": 123456789},
                    "text": f"/start {raw_token}",
                }
            }
        )

        res = await telegram_webhook(
            request=request,
            x_telegram_bot_api_secret_token="test_webhook_secret_123",
        )

        self.assertEqual(res["status"], "token_expired")
        mock_send_message.assert_awaited_once_with(
            chat_id="123456789",
            text=MSG_EXPIRED_TOKEN,
        )

    @patch("app.routes.telegram.telegram_client.send_message", new_callable=AsyncMock)
    @patch("app.routes.telegram.telegram_db.get_link_token_by_hash", new_callable=AsyncMock)
    async def test_07_already_used_token_returns_error(self, mock_get_token, mock_send_message):
        """7. /start with already used token sends MSG_USED_TOKEN."""
        raw_token = "used_token_123"
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

        mock_get_token.return_value = {
            "id": "token_used",
            "userId": "user_1",
            "tokenHash": token_hash,
            "expiresAt": datetime.now(timezone.utc) + timedelta(minutes=5),
            "usedAt": datetime.now(timezone.utc) - timedelta(minutes=1),
        }
        mock_send_message.return_value = {"ok": True}

        from app.routes.telegram import telegram_webhook

        request = MagicMock()
        request.json = AsyncMock(
            return_value={
                "message": {
                    "chat": {"id": 123456789},
                    "text": f"/start {raw_token}",
                }
            }
        )

        res = await telegram_webhook(
            request=request,
            x_telegram_bot_api_secret_token="test_webhook_secret_123",
        )

        self.assertEqual(res["status"], "token_already_used")
        mock_send_message.assert_awaited_once_with(
            chat_id="123456789",
            text=MSG_USED_TOKEN,
        )

    @patch("app.routes.telegram.telegram_client.send_message", new_callable=AsyncMock)
    @patch("app.routes.telegram.telegram_db.get_connection_by_chat_id", new_callable=AsyncMock)
    @patch("app.routes.telegram.telegram_db.get_link_token_by_hash", new_callable=AsyncMock)
    async def test_08_anti_hijacking_prevent_chat_stealing(
        self,
        mock_get_token,
        mock_get_conn,
        mock_send_message,
    ):
        """8. Telegram chat cannot steal another user's connection."""
        raw_token = "hijack_token_123"
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

        mock_get_token.return_value = {
            "id": "token_hijack",
            "userId": "user_attacker",
            "tokenHash": token_hash,
            "expiresAt": datetime.now(timezone.utc) + timedelta(minutes=5),
            "usedAt": None,
        }

        # Chat ID 999999 is already linked to user_victim
        mock_get_conn.return_value = {
            "id": "conn_victim",
            "userId": "user_victim",
            "telegramChatId": "999999",
            "isActive": True,
        }
        mock_send_message.return_value = {"ok": True}

        from app.routes.telegram import telegram_webhook

        request = MagicMock()
        request.json = AsyncMock(
            return_value={
                "message": {
                    "chat": {"id": 999999},
                    "text": f"/start {raw_token}",
                }
            }
        )

        res = await telegram_webhook(
            request=request,
            x_telegram_bot_api_secret_token="test_webhook_secret_123",
        )

        self.assertEqual(res["status"], "chat_already_claimed_by_other_user")
        mock_send_message.assert_awaited_once_with(
            chat_id="999999",
            text=MSG_ALREADY_CONNECTED,
        )

    @patch("app.routes.telegram.telegram_client.send_message", new_callable=AsyncMock)
    async def test_09_plain_start_command_sends_welcome(self, mock_send_message):
        """Plain /start without token sends welcome guidance."""
        mock_send_message.return_value = {"ok": True}
        from app.routes.telegram import telegram_webhook

        request = MagicMock()
        request.json = AsyncMock(
            return_value={
                "message": {
                    "chat": {"id": 888888},
                    "text": "/start",
                }
            }
        )

        res = await telegram_webhook(
            request=request,
            x_telegram_bot_api_secret_token="test_webhook_secret_123",
        )

        self.assertEqual(res["status"], "welcome_prompt_sent")
        mock_send_message.assert_awaited_once_with(
            chat_id="888888",
            text=MSG_WELCOME_PROMPT,
        )

    async def test_13_telegram_client_handles_network_failure(self):
        """13. Telegram API failure handled safely."""
        with patch("app.services.telegram_client.HAS_HTTPX", True), \
             patch("httpx.AsyncClient.post", side_effect=Exception("Telegram API network timeout")):
            client = TelegramClient(bot_token="test_token_123")
            res = await client.send_message(chat_id="12345", text="test")

            self.assertFalse(res["ok"])
            self.assertIn("network timeout", res["description"].lower())


if __name__ == "__main__":
    unittest.main()
