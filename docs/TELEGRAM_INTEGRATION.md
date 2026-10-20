# Maitri Livestock Surveillance — Official Telegram Bot API Integration

This document outlines the complete architecture, security model, notification dispatch mechanism, and deployment procedures for the official Telegram Bot API integration across Phases 1, 2, and 3.

---

## 1. Overview & Architecture
  
Maitri integrates Telegram as a high-reliability, real-time alert delivery channel. Telegram notifications complement the internal `InAppNotification` system without replacing or interfering with core business workflows.

### Notification Flow:
```
Maitri Business Event (Case / Visit / Report)
               ↓
    InAppNotification Created (Database Source of Truth)
               ↓
   dispatchTelegramNotification() (Async, Non-blocking Hook)
               ↓
  Check Active TelegramConnection (isActive = true)
               ↓
  Telegram Notification Delivery Worker (Idempotency Claim)
               ↓
    Telegram Bot API (sendMessage with HTML & Inline Keyboard)
               ↓
       Recipient's Telegram Chat
```

---

## 2. Supported Role-Specific Events

| Role | Notification Type | Trigger Event | Inline Action Button |
| :--- | :--- | :--- | :--- |
| **Veterinarian** | `CASE_ASSIGNED` | Health Case is routed to Veterinarian based on geographic jurisdiction | 📋 Open Case (`/vet/cases/:id`) |
| **Field Agent** | `ASSISTANCE_ASSIGNED` | Assistance Request is routed to Field Agent | 🧑‍🌾 Open Request (`/agent?requestId=:id`) |
| **Farmer** | `ASSISTANCE_ACCEPTED` | Field Agent accepts assistance request | 🔍 View Request (`/farmer`) |
| **Farmer** | `VISIT_IN_PROGRESS` | Field Agent begins physical inspection | 🔍 View Status (`/farmer`) |
| **Farmer** | `VISIT_COMPLETED` | Field Agent submits physical report & Case is created | 📄 View Report (`/farmer/animals/:id`) |
| **Farmer** | `VET_REPORT_SUBMITTED` | Veterinarian submits clinical report & assessment | 📄 View Vet Report (`/farmer/cases/:id`) |
| **Farmer** | `DIAGNOSIS_CONFIRMED` | Veterinarian confirms formal disease diagnosis | 🩺 View Diagnosis (`/farmer/cases/:id`) |
| **Farmer** | `LAB_REFERRAL` | Veterinarian refers sample to laboratory | 🔬 View Lab Referral (`/farmer/cases/:id`) |
| **Farmer** | `CASE_CLOSED` | Veterinarian closes / resolves health case | 📋 View Case Details (`/farmer/cases/:id`) |
| **Farmer** | `FOLLOW_UP_COMPLETED` | Veterinarian marks follow-up check complete | 🩺 View Follow-Up (`/farmer/cases/:id`) |
| **District Authority** | `OUTBREAK_ALERT` / `CRITICAL_ALERT` | Epidemiological threshold exceeded in village | ⚠️ View Alert (`/authority`) |

---

## 3. Resilience, Failure Isolation & Idempotency

1. **Failure Isolation (Best-Effort Delivery)**:
   - External Telegram API HTTP requests are strictly executed **outside** of Prisma transactions.
   - Any network timeout, provider outage, or blocked-bot error from Telegram **never** affects core database transactions (Cases, Assistance Requests, and Reports always succeed).
   - Failures are recorded safely in `TelegramNotificationDelivery` (`status = FAILED`, sanitized `errorMessage`).

2. **Database Source of Truth & Idempotency**:
   - Deliveries are tracked with the database unique constraint:
     `@@unique([notificationId, telegramConnectionId])`
   - If a notification has already been delivered (`status = SENT`), repeated delivery attempts are automatically skipped (`skipped: true`).
   - Concurrent delivery attempts are claimed atomically with status transitions (`SENDING` -> `SENT` / `FAILED`).

3. **Security & Token Redaction**:
   - `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` remain strictly server-side and are never exposed to the client.
   - Error messages, logs, and database records pass through `sanitizeTelegramError()` to redact all bot token signatures.
   - All dynamic text in messages is sanitized using `escapeHtml()` to prevent Telegram HTML injection.
   - Inline keyboard action buttons link only to authorized routes without exposing auth credentials or tokens.

---

## 4. Account Linking (FastAPI Webhook)

- **Authoritative Receiver**: The FastAPI backend endpoint `POST /api/telegram/webhook` is the sole receiver for Telegram webhook updates.
- **Link Token Flow**:
  1. Authenticated user requests link token via Next.js Server Action (`generateTelegramLinkTokenAction`).
  2. A 32-byte cryptographically secure random token is generated; only its SHA-256 hash is persisted in `TelegramLinkToken` (10-minute expiry).
  3. User is directed to Telegram bot with `/start <TOKEN>`.
  4. FastAPI hashes the incoming token, verifies validity & single-use status, links `TelegramConnection`, and sends a confirmation message.

---

## 5. Deployment & Production Verification

1. **Prerequisites**:
   - Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in environment variables.
   - Set `NEXT_PUBLIC_APP_URL` / `APP_URL` for Telegram deep-linking.
2. **Webhook Registration**:
   - Run the registration utility after FastAPI deployment:
     ```bash
     python backend/scripts/register_webhook.py --url https://<API_DOMAIN>/api/telegram/webhook --secret <TELEGRAM_WEBHOOK_SECRET>
     ```
3. **End-to-End Verification**:
   - Live Telegram account linking and interactive message delivery will be tested directly in staging/production after final deployment.
