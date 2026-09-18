import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/telegram/webhook/route";
import prisma from "@/lib/db/prisma";
import { hashLinkToken } from "@/lib/telegram/security";
import * as telegramClient from "@/lib/telegram/client";
import {
  MSG_ALREADY_CONNECTED,
  MSG_EXPIRED_TOKEN,
  MSG_INVALID_TOKEN,
  MSG_SUCCESS_CONNECTED,
  MSG_USED_TOKEN,
  MSG_WELCOME_PROMPT,
} from "@/lib/telegram/messages";

// Mock sendTelegramMessage
vi.mock("@/lib/telegram/client", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue({ success: true, messageId: 999 }),
}));

describe("Next.js Telegram Webhook Route (/api/telegram/webhook)", () => {
  const secret = "test_webhook_secret_key_123";
  let testUserId1: string;
  let testUserId2: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.TELEGRAM_WEBHOOK_SECRET = secret;

    // Clean DB
    await prisma.telegramNotificationDelivery.deleteMany();
    await prisma.telegramLinkToken.deleteMany();
    await prisma.telegramConnection.deleteMany();
    await prisma.inAppNotification.deleteMany();
    await prisma.user.deleteMany({
      where: {
        clerkId: { in: ["clerk_wh_user_1", "clerk_wh_user_2"] },
      },
    });

    const u1 = await prisma.user.create({
      data: {
        clerkId: "clerk_wh_user_1",
        role: "FARMER",
        status: "ACTIVE",
        name: "Webhook Farmer",
        phone: "+919988776655",
      },
    });
    testUserId1 = u1.id;

    const u2 = await prisma.user.create({
      data: {
        clerkId: "clerk_wh_user_2",
        role: "VETERINARIAN",
        status: "ACTIVE",
        name: "Webhook Vet",
        phone: "+919988776656",
      },
    });
    testUserId2 = u2.id;
  });

  function createRequest(body: any, customSecret?: string | null): Request {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (customSecret !== undefined) {
      if (customSecret !== null) {
        headers["x-telegram-bot-api-secret-token"] = customSecret;
      }
    } else {
      headers["x-telegram-bot-api-secret-token"] = secret;
    }

    return new Request("http://localhost:3000/api/telegram/webhook", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  it("1. Rejects request when secret token is invalid or missing", async () => {
    // Missing secret
    const req1 = createRequest({ message: { chat: { id: 123 }, text: "/start" } }, null);
    const res1 = await POST(req1);
    expect(res1.status).toBe(401);

    // Wrong secret
    const req2 = createRequest({ message: { chat: { id: 123 }, text: "/start" } }, "wrong_secret");
    const res2 = await POST(req2);
    expect(res2.status).toBe(401);
  });

  it("2. Responds to plain /start with MSG_WELCOME_PROMPT", async () => {
    const req = createRequest({
      update_id: 1001,
      message: {
        message_id: 1,
        chat: { id: 888777 },
        text: "/start",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("welcome_prompt_sent");

    expect(telegramClient.sendTelegramMessage).toHaveBeenCalledWith(
      "888777",
      MSG_WELCOME_PROMPT
    );
  });

  it("3. Successfully links account with valid /start <token>", async () => {
    const rawToken = "my_super_secret_test_token_12345678";
    const tokenHash = hashLinkToken(rawToken);

    await prisma.telegramLinkToken.create({
      data: {
        userId: testUserId1,
        tokenHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const req = createRequest({
      update_id: 1002,
      message: {
        message_id: 2,
        chat: { id: 999888 },
        from: { id: 999888, username: "farmer_john" },
        text: `/start ${rawToken}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("account_linked");
    expect(data.userId).toBe(testUserId1);

    // Verify token was marked as used in DB
    const linkRecord = await prisma.telegramLinkToken.findUnique({
      where: { tokenHash },
    });
    expect(linkRecord?.usedAt).not.toBeNull();

    // Verify TelegramConnection was created
    const conn = await prisma.telegramConnection.findUnique({
      where: { userId: testUserId1 },
    });
    expect(conn?.telegramChatId).toBe("999888");
    expect(conn?.telegramUsername).toBe("farmer_john");
    expect(conn?.isActive).toBe(true);

    // Verify confirmation message was sent
    expect(telegramClient.sendTelegramMessage).toHaveBeenCalledWith(
      "999888",
      MSG_SUCCESS_CONNECTED,
      expect.objectContaining({
        replyMarkup: expect.any(Object),
      })
    );
  });

  it("4. Rejects /start with unknown token and replies MSG_INVALID_TOKEN", async () => {
    const req = createRequest({
      update_id: 1003,
      message: {
        message_id: 3,
        chat: { id: 555444 },
        text: "/start non_existent_token",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("token_not_found");

    expect(telegramClient.sendTelegramMessage).toHaveBeenCalledWith(
      "555444",
      MSG_INVALID_TOKEN
    );
  });

  it("5. Rejects /start with expired token and replies MSG_EXPIRED_TOKEN", async () => {
    const rawToken = "expired_token_test_12345";
    const tokenHash = hashLinkToken(rawToken);

    await prisma.telegramLinkToken.create({
      data: {
        userId: testUserId1,
        tokenHash,
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 mins ago
      },
    });

    const req = createRequest({
      update_id: 1004,
      message: {
        message_id: 4,
        chat: { id: 555444 },
        text: `/start ${rawToken}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("token_expired");

    expect(telegramClient.sendTelegramMessage).toHaveBeenCalledWith(
      "555444",
      MSG_EXPIRED_TOKEN
    );
  });

  it("6. Rejects /start with already used token and replies MSG_USED_TOKEN", async () => {
    const rawToken = "used_token_test_12345";
    const tokenHash = hashLinkToken(rawToken);

    await prisma.telegramLinkToken.create({
      data: {
        userId: testUserId1,
        tokenHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: new Date(Date.now() - 1 * 60 * 1000),
      },
    });

    const req = createRequest({
      update_id: 1005,
      message: {
        message_id: 5,
        chat: { id: 555444 },
        text: `/start ${rawToken}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("token_already_used");

    expect(telegramClient.sendTelegramMessage).toHaveBeenCalledWith(
      "555444",
      MSG_USED_TOKEN
    );
  });

  it("7. Blocks anti-hijacking when chat ID belongs to another active user", async () => {
    // User 1 owns chat ID 777666
    await prisma.telegramConnection.create({
      data: {
        userId: testUserId1,
        telegramChatId: "777666",
        isActive: true,
      },
    });

    // User 2 generated a link token
    const rawToken = "user2_token_attempt";
    const tokenHash = hashLinkToken(rawToken);

    await prisma.telegramLinkToken.create({
      data: {
        userId: testUserId2,
        tokenHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Someone from chat ID 777666 tries to link user 2's token
    const req = createRequest({
      update_id: 1006,
      message: {
        message_id: 6,
        chat: { id: 777666 },
        text: `/start ${rawToken}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("chat_already_claimed_by_other_user");

    expect(telegramClient.sendTelegramMessage).toHaveBeenCalledWith(
      "777666",
      MSG_ALREADY_CONNECTED
    );

    // Verify User 2 was NOT linked
    const user2Conn = await prisma.telegramConnection.findUnique({
      where: { userId: testUserId2 },
    });
    expect(user2Conn).toBeNull();
  });
});
