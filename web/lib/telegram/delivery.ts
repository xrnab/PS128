import prisma from "@/lib/db/prisma";
import { NotificationStatus } from "@prisma/client";
import { sendTelegramMessage } from "./client";
import { formatTelegramNotification } from "./messages";

export interface TelegramDeliveryResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  deliveryId?: string;
  messageId?: number;
  error?: string;
}

/**
 * Sanitizes error messages by redacting bot tokens or sensitive credentials.
 */
export function sanitizeTelegramError(error?: string | null): string {
  if (!error) return "Unknown Telegram delivery failure";
  return error
    .replace(/[0-9]{8,10}:[a-zA-Z0-9_-]{35}/g, "[REDACTED_BOT_TOKEN]")
    .replace(/bot[0-9]+:[a-zA-Z0-9_-]+/g, "bot[REDACTED_BOT_TOKEN]")
    .substring(0, 500);
}

/**
 * Server-side Telegram Notification Delivery Service.
 *
 * Implements idempotent, best-effort dispatch of Maitri InAppNotifications
 * to users with active Telegram connections.
 *
 * - Database remains the source of truth.
 * - Idempotency guaranteed via @@unique([notificationId, telegramConnectionId]).
 * - Isolated from core business transactions (non-blocking, never throws).
 */
export async function dispatchTelegramNotification(
  notificationId: string
): Promise<TelegramDeliveryResult> {
  try {
    if (!notificationId) {
      return { success: false, reason: "INVALID_NOTIFICATION_ID" };
    }

    // 1. Fetch notification and recipient with active TelegramConnection
    const notification = await prisma.inAppNotification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          include: {
            telegramConnection: true,
          },
        },
      },
    });

    if (!notification) {
      return { success: false, reason: "NOTIFICATION_NOT_FOUND" };
    }

    const connection = notification.user?.telegramConnection;

    // 2. Check if user has an active TelegramConnection
    if (!connection || !connection.isActive || !connection.telegramChatId) {
      return { success: false, reason: "NO_ACTIVE_CONNECTION" };
    }

    // 3. Idempotency check: Look for existing delivery record
    const existingDelivery = await prisma.telegramNotificationDelivery.findUnique({
      where: {
        notificationId_telegramConnectionId: {
          notificationId: notification.id,
          telegramConnectionId: connection.id,
        },
      },
    });

    if (existingDelivery && existingDelivery.status === NotificationStatus.SENT) {
      return {
        success: true,
        skipped: true,
        deliveryId: existingDelivery.id,
        messageId: existingDelivery.telegramMessageId ?? undefined,
      };
    }

    // 4. Atomically claim/create delivery record in SENDING status
    const delivery = await prisma.telegramNotificationDelivery.upsert({
      where: {
        notificationId_telegramConnectionId: {
          notificationId: notification.id,
          telegramConnectionId: connection.id,
        },
      },
      create: {
        notificationId: notification.id,
        telegramConnectionId: connection.id,
        status: NotificationStatus.SENDING,
      },
      update: {
        status: NotificationStatus.SENDING,
        errorMessage: null,
      },
    });

    // 5. Format notification message safely with HTML escaping
    const { text, replyMarkup } = formatTelegramNotification(notification);

    // 6. Dispatch via Telegram Client (5s timeout built-in)
    const sendResult = await sendTelegramMessage(connection.telegramChatId, text, {
      parseMode: "HTML",
      replyMarkup,
      disableWebPagePreview: true,
    });

    // 7. Update delivery record based on Telegram response
    if (sendResult.success) {
      await prisma.telegramNotificationDelivery.updateMany({
        where: { id: delivery.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          telegramMessageId: sendResult.messageId ?? null,
          errorMessage: null,
        },
      });

      return {
        success: true,
        deliveryId: delivery.id,
        messageId: sendResult.messageId,
      };
    } else {
      const safeError = sanitizeTelegramError(sendResult.error);

      await prisma.telegramNotificationDelivery.updateMany({
        where: { id: delivery.id },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: safeError,
        },
      });

      console.warn(
        `[Telegram Delivery Failed]: notification=${notification.id} delivery=${delivery.id} error=${safeError}`
      );

      return {
        success: false,
        deliveryId: delivery.id,
        error: safeError,
      };
    }
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err);
    const safeError = sanitizeTelegramError(rawError);
    console.error("[Telegram Delivery Unhandled Error]:", safeError);
    return {
      success: false,
      error: safeError,
    };
  }
}
