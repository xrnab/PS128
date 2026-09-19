import { TelegramInlineKeyboardMarkup } from "./client";

export const MSG_WELCOME_PROMPT =
  "<b>Welcome to Maitri!</b>\n\n" +
  "To receive real-time livestock health notifications, please click " +
  "<b>'Connect Telegram'</b> on your Maitri Profile page to link this chat.";
export const MSG_INVALID_TOKEN = "Sorry, this Telegram connection link is invalid.";
export const MSG_EXPIRED_TOKEN =
  "This Telegram connection link has expired. Please generate a new link from your Maitri profile.";
export const MSG_USED_TOKEN = "This Telegram connection link has already been used.";
export const MSG_ALREADY_CONNECTED =
  "This Telegram account is already connected to a Maitri account.";
export const MSG_INTERNAL_FAILURE =
  "Something went wrong while connecting your Telegram account. Please try again from Maitri.";
export const MSG_SUCCESS_CONNECTED =
  "<b>Maitri Telegram Connected</b>\n\n" +
  "Your Telegram account has been successfully connected to your Maitri account.\n\n" +
  "You will now receive important Maitri notifications here.";

/**
 * Escapes characters for Telegram HTML mode:
 * & -> &amp;
 * < -> &lt;
 * > -> &gt;
 * " -> &quot;
 */
export function escapeHtml(unsafeText: string): string {
  if (!unsafeText) return "";
  return unsafeText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Resolves the application base URL for Telegram deep-linking.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://maitri.gov.in";
}

/**
 * Determines an appropriate, concise button label based on notification type.
 */
export function getActionButtonLabel(type: string): string {
  switch (type) {
    case "CASE_ASSIGNED":
      return "📋 Open Case";
    case "ASSISTANCE_ASSIGNED":
      return "🧑‍🌾 Open Request";
    case "ASSISTANCE_ACCEPTED":
      return "🔍 View Request";
    case "VISIT_IN_PROGRESS":
      return "🔍 View Status";
    case "VISIT_COMPLETED":
      return "📄 View Report";
    case "VET_REPORT_SUBMITTED":
      return "📄 View Vet Report";
    case "DIAGNOSIS_CONFIRMED":
      return "🩺 View Diagnosis";
    case "LAB_REFERRAL":
      return "🔬 View Lab Referral";
    case "CASE_CLOSED":
      return "📋 View Case Details";
    case "FOLLOW_UP_COMPLETED":
      return "🩺 View Follow-Up";
    case "CRITICAL_ALERT":
    case "OUTBREAK_ALERT":
      return "⚠️ View Outbreak Alert";
    case "IOT_FEVER_ALERT":
    case "IOT_HYPOTHERMIA_ALERT":
    case "IOT_HEALTH_RISK":
      return "🩺 View Animal Vitals";
    case "IOT_LETHARGY_ALERT":
      return "⚠️ View Activity Data";
    case "IOT_RECOVERY_ALERT":
      return "📋 View Status";
    default:
      return "🔗 Open in Maitri";
  }
}

export interface FormattedTelegramNotification {
  text: string;
  replyMarkup?: TelegramInlineKeyboardMarkup;
}

/**
 * Formats an InAppNotification for delivery via Telegram Bot API with HTML escaping
 * and an inline keyboard button if an authorized route is present.
 */
export function formatTelegramNotification(notification: {
  title: string;
  message: string;
  type: string;
  link?: string | null;
}): FormattedTelegramNotification {
  const safeTitle = escapeHtml(notification.title);
  const safeMessage = escapeHtml(notification.message);

  const text = `<b>${safeTitle}</b>\n\n${safeMessage}`;

  let replyMarkup: TelegramInlineKeyboardMarkup | undefined;

  if (notification.link && notification.link.trim().length > 0) {
    let targetUrl = notification.link.trim();
    if (targetUrl.startsWith("/")) {
      const baseUrl = getAppBaseUrl();
      targetUrl = `${baseUrl}${targetUrl}`;
    }

    // Telegram Bot API requires full HTTP/HTTPS public URLs for inline keyboard buttons (no localhost)
    if (
      (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) &&
      !targetUrl.includes("localhost") &&
      !targetUrl.includes("127.0.0.1")
    ) {
      const buttonLabel = getActionButtonLabel(notification.type);
      replyMarkup = {
        inline_keyboard: [
          [
            {
              text: buttonLabel,
              url: targetUrl,
            },
          ],
        ],
      };
    }
  }

  return {
    text,
    replyMarkup,
  };
}
