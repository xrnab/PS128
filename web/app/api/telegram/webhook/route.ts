import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { hashLinkToken, verifyWebhookSecret } from "@/lib/telegram/security";
import {
  MSG_ALREADY_CONNECTED,
  MSG_EXPIRED_TOKEN,
  MSG_INTERNAL_FAILURE,
  MSG_INVALID_TOKEN,
  MSG_SUCCESS_CONNECTED,
  MSG_USED_TOKEN,
  MSG_WELCOME_PROMPT,
  getAppBaseUrl,
} from "@/lib/telegram/messages";

export async function POST(request: Request) {
  // 1. Webhook Secret Security Validation
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (!verifyWebhookSecret(secretHeader)) {
    console.warn("[Telegram Webhook] Unauthorized request: secret token mismatch.");
    return NextResponse.json(
      { error: "Unauthorized webhook request" },
      { status: 401 }
    );
  }

  let update: any;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true, status: "invalid_json" });
  }

  // 2. Extract Message & Chat Info
  const message = update?.message || update?.edited_message;
  if (!message || !message.chat) {
    return NextResponse.json({ ok: true, status: "ignored_non_message" });
  }

  const chatId = String(message.chat.id);
  const text = (message.text || "").trim();
  const username = message.from?.username ? String(message.from.username) : null;

  // 3. Handle plain "/start" command (no token argument)
  if (text === "/start" || text === "/start@pashu_raksha_bot") {
    await sendTelegramMessage(chatId, MSG_WELCOME_PROMPT);
    return NextResponse.json({ ok: true, status: "welcome_prompt_sent" });
  }

  // 4. Handle "/start <token>" command
  if (text.startsWith("/start ") || text.startsWith("/start@pashu_raksha_bot ")) {
    const rawToken = text
      .replace(/^\/start(?:@pashu_raksha_bot)?\s+/, "")
      .trim();

    if (!rawToken) {
      await sendTelegramMessage(chatId, MSG_WELCOME_PROMPT);
      return NextResponse.json({ ok: true, status: "welcome_prompt_sent" });
    }

    const tokenHash = hashLinkToken(rawToken);

    try {
      // Lookup token in PostgreSQL via Prisma
      const linkRecord = await prisma.telegramLinkToken.findUnique({
        where: { tokenHash },
      });

      // Token not found
      if (!linkRecord) {
        console.warn(`[Telegram Webhook] Unknown link token attempted: hash=${tokenHash}`);
        await sendTelegramMessage(chatId, MSG_INVALID_TOKEN);
        return NextResponse.json({ ok: true, status: "token_not_found" });
      }

      // Check if already used
      if (linkRecord.usedAt) {
        console.warn(`[Telegram Webhook] Already used token attempted: id=${linkRecord.id}`);
        await sendTelegramMessage(chatId, MSG_USED_TOKEN);
        return NextResponse.json({ ok: true, status: "token_already_used" });
      }

      // Check if expired
      const now = new Date();
      if (new Date(linkRecord.expiresAt) < now) {
        console.warn(`[Telegram Webhook] Expired token attempted: id=${linkRecord.id}`);
        await sendTelegramMessage(chatId, MSG_EXPIRED_TOKEN);
        return NextResponse.json({ ok: true, status: "token_expired" });
      }

      // Anti-Hijacking Check: verify chatId is not actively claimed by another user
      const existingConn = await prisma.telegramConnection.findFirst({
        where: {
          telegramChatId: chatId,
          isActive: true,
        },
      });

      if (existingConn && existingConn.userId !== linkRecord.userId) {
        console.warn(
          `[Telegram Webhook] Anti-hijacking blocked: Chat ID ${chatId} already belongs to user ${existingConn.userId}`
        );
        await sendTelegramMessage(chatId, MSG_ALREADY_CONNECTED);
        return NextResponse.json({
          ok: true,
          status: "chat_already_claimed_by_other_user",
        });
      }

      // Atomic Account Linking via Prisma Transaction
      // Pre-clear: Deactivate any stale TelegramConnection that holds this chatId
      // (from this or any other user) to prevent @unique constraint violations
      // on telegramChatId during the upsert below.
      await prisma.telegramConnection.updateMany({
        where: {
          telegramChatId: chatId,
          userId: { not: linkRecord.userId },
        },
        data: {
          isActive: false,
          telegramChatId: `__revoked_${chatId}_${Date.now()}`,
        },
      });

      await prisma.$transaction([
        // 1. Mark token as used
        prisma.telegramLinkToken.update({
          where: { id: linkRecord.id },
          data: { usedAt: now },
        }),
        // 2. Upsert TelegramConnection
        prisma.telegramConnection.upsert({
          where: { userId: linkRecord.userId },
          create: {
            userId: linkRecord.userId,
            telegramChatId: chatId,
            telegramUsername: username,
            connectedAt: now,
            lastVerifiedAt: now,
            isActive: true,
          },
          update: {
            telegramChatId: chatId,
            telegramUsername: username,
            lastVerifiedAt: now,
            isActive: true,
          },
        }),
        // 3. Update User compatibility fields
        prisma.user.update({
          where: { id: linkRecord.userId },
          data: {
            telegramChatId: chatId,
            telegramLinkToken: null,
            telegramLinkTokenCreatedAt: null,
          },
        }),
      ]);

      // Send Confirmation Message
      const appUrl = getAppBaseUrl();
      const replyMarkup = appUrl
        ? {
            inline_keyboard: [
              [{ text: "Open Maitri", url: appUrl }],
            ],
          }
        : undefined;

      await sendTelegramMessage(chatId, MSG_SUCCESS_CONNECTED, {
        replyMarkup,
      });

      return NextResponse.json({
        ok: true,
        status: "account_linked",
        userId: linkRecord.userId,
        telegramChatId: chatId,
      });
    } catch (err: unknown) {
      console.error(
        `[Telegram Webhook Error] Failed to process link token: ${err}`
      );
      try {
        await sendTelegramMessage(chatId, MSG_INTERNAL_FAILURE);
      } catch {
        // Suppress secondary failures
      }
      return NextResponse.json({ ok: true, status: "internal_error" });
    }
  }

  // Handle /help or other non-start commands
  if (text === "/help" || text === "/help@pashu_raksha_bot") {
    await sendTelegramMessage(
      chatId,
      "<b>Maitri Livestock Bot Help</b>\n\n" +
        "This bot delivers real-time livestock health notifications, IoT abnormal temperature alerts, and outbreak warnings.\n\n" +
        "To connect your account, visit your Maitri profile page and click <b>'Connect Telegram'</b>."
    );
    return NextResponse.json({ ok: true, status: "help_sent" });
  }

  return NextResponse.json({ ok: true, status: "ignored" });
}
