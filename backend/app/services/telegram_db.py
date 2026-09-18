import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from urllib.parse import urlparse
from app.config import settings

logger = logging.getLogger(__name__)


class TelegramDBService:
    """
    Database interface for Telegram account linking operations in FastAPI.
    Interacts with PostgreSQL database tables: TelegramLinkToken and TelegramConnection.
    """

    def __init__(self, database_url: Optional[str] = None):
        self._database_url = database_url

    @property
    def database_url(self) -> str:
        return (
            self._database_url
            or settings.DATABASE_URL
            or os.environ.get("DATABASE_URL", "")
        )

    def _get_connection(self):
        """
        Creates a database connection using psycopg (v3) or psycopg2.
        """
        db_url = self.database_url
        if not db_url:
            raise RuntimeError("DATABASE_URL is not configured in backend.")

        # Clean URL if contains pooler or ssl params
        try:
            # pyrefly: ignore [missing-import]
            import psycopg
            return psycopg.connect(db_url)
        except ImportError:
            try:
                import psycopg2
                return psycopg2.connect(db_url)
            except ImportError:
                raise RuntimeError("No PostgreSQL driver available (install psycopg or psycopg2).")

    async def get_link_token_by_hash(self, token_hash: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a TelegramLinkToken record by its SHA-256 token hash.
        """
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, "userId", "tokenHash", "expiresAt", "usedAt"
                        FROM "TelegramLinkToken"
                        WHERE "tokenHash" = %s
                        LIMIT 1;
                        """,
                        (token_hash,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return None
                    return {
                        "id": row[0],
                        "userId": row[1],
                        "tokenHash": row[2],
                        "expiresAt": row[3],
                        "usedAt": row[4],
                    }
        except Exception as err:
            logger.error(f"[Telegram DB] Error fetching link token: {err}")
            raise

    async def get_connection_by_chat_id(self, telegram_chat_id: str) -> Optional[Dict[str, Any]]:
        """
        Checks if a Telegram chat ID is already actively connected to a user.
        """
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, "userId", "telegramChatId", "telegramUsername", "isActive"
                        FROM "TelegramConnection"
                        WHERE "telegramChatId" = %s AND "isActive" = true
                        LIMIT 1;
                        """,
                        (telegram_chat_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return None
                    return {
                        "id": row[0],
                        "userId": row[1],
                        "telegramChatId": row[2],
                        "telegramUsername": row[3],
                        "isActive": row[4],
                    }
        except Exception as err:
            logger.error(f"[Telegram DB] Error checking existing chat connection: {err}")
            raise

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves basic user info (name, role, phone) by user ID.
        """
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, name, role, phone
                        FROM "User"
                        WHERE id = %s
                        LIMIT 1;
                        """,
                        (user_id,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return None
                    return {
                        "id": row[0],
                        "name": row[1],
                        "role": row[2],
                        "phone": row[3],
                    }
        except Exception as err:
            logger.error(f"[Telegram DB] Error fetching user by ID: {err}")
            return None

    async def link_account_atomically(
        self,
        token_id: str,
        user_id: str,
        telegram_chat_id: str,
        telegram_username: Optional[str] = None,
    ) -> bool:
        """
        Atomically marks the token as used and creates/activates the TelegramConnection.
        """
        now = datetime.now(timezone.utc)
        new_connection_id = f"tc_{uuid.uuid4().hex[:24]}"

        try:
            with self._get_connection() as conn:
                with conn.cursor() as cur:
                    # 1. Mark token as used
                    cur.execute(
                        """
                        UPDATE "TelegramLinkToken"
                        SET "usedAt" = %s
                        WHERE id = %s AND "usedAt" IS NULL;
                        """,
                        (now, token_id),
                    )

                    # 2. Upsert TelegramConnection for the user
                    cur.execute(
                        """
                        INSERT INTO "TelegramConnection" (
                            "id", "userId", "telegramChatId", "telegramUsername",
                            "connectedAt", "lastVerifiedAt", "isActive"
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, true)
                        ON CONFLICT ("userId") DO UPDATE SET
                            "telegramChatId" = EXCLUDED."telegramChatId",
                            "telegramUsername" = EXCLUDED."telegramUsername",
                            "lastVerifiedAt" = EXCLUDED."lastVerifiedAt",
                            "isActive" = true;
                        """,
                        (
                            new_connection_id,
                            user_id,
                            telegram_chat_id,
                            telegram_username,
                            now,
                            now,
                        ),
                    )

                    # 3. Also update User model backwards-compatibility fields if present
                    cur.execute(
                        """
                        UPDATE "User"
                        SET "telegramChatId" = %s,
                            "telegramLinkToken" = NULL,
                            "telegramLinkTokenCreatedAt" = NULL
                        WHERE id = %s;
                        """,
                        (telegram_chat_id, user_id),
                    )

                conn.commit()
                return True
        except Exception as err:
            logger.error(f"[Telegram DB] Transaction error during account linking: {err}")
            raise


# Default singleton instance
telegram_db = TelegramDBService()
