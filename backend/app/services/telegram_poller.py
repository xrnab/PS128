import asyncio
import json
import logging
import urllib.request
from typing import Optional
from app.config import settings
from app.routes.telegram import process_telegram_update

logger = logging.getLogger(__name__)


class TelegramPoller:
    """
    Background Long-Polling Service for Telegram Bot API.
    Provides instant message receiving for local development and standalone deployments.
    """

    def __init__(self):
        self._running = False
        self._offset: Optional[int] = None
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            logger.info("[Telegram Poller] TELEGRAM_BOT_TOKEN is not configured, skipping background polling.")
            return

        self._running = True
        logger.info("[Telegram Poller] Starting Telegram background polling loop...")

        # Ensure webhook is cleared so getUpdates receives messages
        try:
            del_url = f"https://api.telegram.org/bot{token}/deleteWebhook"
            urllib.request.urlopen(del_url, timeout=5.0)
            logger.info("[Telegram Poller] Webhook cleared for polling mode.")
        except Exception as e:
            logger.warning(f"[Telegram Poller] Failed to clear webhook on startup: {e}")

        while self._running:
            try:
                url = f"https://api.telegram.org/bot{token}/getUpdates?timeout=5"
                if self._offset is not None:
                    url += f"&offset={self._offset}"

                req = urllib.request.Request(url, method="GET")
                # Run blocking urllib in executor to avoid blocking asyncio event loop
                loop = asyncio.get_running_loop()
                raw_response = await loop.run_in_executor(
                    None,
                    lambda: urllib.request.urlopen(req, timeout=10.0).read()
                )
                data = json.loads(raw_response.decode("utf-8"))

                if data.get("ok"):
                    for update in data.get("result", []):
                        update_id = update.get("update_id")
                        if update_id is not None:
                            self._offset = update_id + 1
                        try:
                            await process_telegram_update(update)
                        except Exception as update_err:
                            logger.error(f"[Telegram Poller] Error processing update {update_id}: {update_err}")

            except asyncio.CancelledError:
                break
            except Exception as loop_err:
                logger.debug(f"[Telegram Poller] Polling cycle info: {loop_err}")
                await asyncio.sleep(2)

    def stop(self):
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()


telegram_poller = TelegramPoller()
