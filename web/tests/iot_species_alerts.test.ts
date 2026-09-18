import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/db/prisma";
import { classifyTemperature, getSpeciesThreshold } from "@/lib/iot/thresholds";
import { processTelemetryIngestion } from "@/lib/iot/telemetry-service";
import * as telegramDelivery from "@/lib/telegram/delivery";
import * as auditModule from "@/lib/audit/log";

describe("Species-Aware IoT Temperature Alerts & Telegram Dispatch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("STEP 1: Species-Aware Physiological Thresholds", () => {
    it("differentiates Goat thresholds from Cow thresholds correctly", () => {
      const goatCfg = getSpeciesThreshold("GOAT");
      const cowCfg = getSpeciesThreshold("COW");

      // Goat baseline is higher (38.5 - 39.7°C, fever at 40.0°C)
      expect(goatCfg.feverAt).toBe(40.0);
      expect(goatCfg.normalHigh).toBe(39.7);

      // Cow baseline is lower (38.0 - 39.3°C, fever at 39.5°C)
      expect(cowCfg.feverAt).toBe(39.5);
      expect(cowCfg.normalHigh).toBe(39.3);
    });

    it("evaluates a 39.8°C reading as NORMAL/ELEVATED for Goat but FEVER for Cow", () => {
      const goatClassification = classifyTemperature("GOAT", 39.8, "GOAT-01");
      expect(goatClassification.state).toBe("ELEVATED");
      expect(goatClassification.isAbnormal).toBe(false); // 39.8°C is within Goat safe monitoring, NOT fever (>40.0°C)

      const cowClassification = classifyTemperature("COW", 39.8, "COW-01");
      expect(cowClassification.state).toBe("FEVER");
      expect(cowClassification.isAbnormal).toBe(true); // 39.8°C is high fever for Cow (>39.5°C)
      expect(cowClassification.alertMessageEn).toContain("normal <39.5°C");
    });

    it("evaluates a 40.2°C reading as FEVER for Goat and cites the >40.0°C threshold", () => {
      const goatFever = classifyTemperature("GOAT", 40.2, "GOAT-01");
      expect(goatFever.state).toBe("FEVER");
      expect(goatFever.isAbnormal).toBe(true);
      expect(goatFever.alertMessageEn).toContain("normal <40°C");
      expect(goatFever.alertMessageMr).toContain("शेळी");
    });

    it("evaluates a 36.8°C reading as HYPOTHERMIA for all species", () => {
      const hypo = classifyTemperature("COW", 36.8, "COW-01");
      expect(hypo.state).toBe("HYPOTHERMIA");
      expect(hypo.isAbnormal).toBe(true);
      expect(hypo.alertTitleEn).toContain("Hypothermia");
    });
  });

  describe("STEP 2 & 3: Single Source of Truth, State Transitions, Throttling & Telegram Dispatch", () => {
    const mockFarmerUser = {
      id: "farmer_user_1",
      preferredLanguage: "en",
      name: "Ramesh Patil",
      telegramConnection: {
        id: "tg_conn_1",
        telegramChatId: "123456789",
        isActive: true,
      },
    };

    const mockGoatAnimal = {
      id: "animal_goat_99",
      tag: "GOAT-99",
      species: "GOAT",
      iotDeviceId: "ESP32-GOAT-99",
      herd: {
        farm: {
          farmerUser: mockFarmerUser,
        },
      },
      iotDevices: [
        {
          id: "device_goat_99",
          deviceIdentifier: "ESP32-GOAT-99",
          lastTemperature: 39.0,
          lastActivity: 55,
          lastAnomalyState: false,
        },
      ],
    };

    it("simulates a Goat crossing 39.0°C -> 40.2°C and fires exactly ONE Telegram alert citing Goat threshold", async () => {
      // Mock animal lookup
      vi.spyOn(prisma.animal, "findFirst").mockResolvedValue(mockGoatAnimal as any);

      // Previous reading was normal 39.0°C
      vi.spyOn(prisma.ioTReading, "findFirst").mockResolvedValue({
        id: "prev_reading_1",
        temperature: 39.0,
        activityIndex: 55,
        hasAnomaly: false,
        recordedAt: new Date(Date.now() - 60000),
      } as any);

      // No recent notification within 30 min cooldown
      vi.spyOn(prisma.inAppNotification, "findFirst").mockResolvedValue(null);

      // Mock device upsert & reading create
      vi.spyOn(prisma.ioTDevice, "upsert").mockResolvedValue({
        id: "device_goat_99",
        deviceIdentifier: "ESP32-GOAT-99",
      } as any);

      vi.spyOn(prisma.ioTReading, "create").mockResolvedValue({
        id: "new_reading_1",
        temperature: 40.2,
        activityIndex: 45,
        hasAnomaly: true,
        recordedAt: new Date(),
        source: "REAL",
      } as any);

      // Mock inAppNotification create
      const createNotifSpy = vi.spyOn(prisma.inAppNotification, "create").mockResolvedValue({
        id: "notif_fever_1",
        userId: mockFarmerUser.id,
        title: "🚨 High Fever Alert: [GOAT-99] Goat",
        message: "🚨 [GOAT-99] Goat shows fever: 40.2°C recorded (normal <40°C). Check your Maitri app for guidance.",
        type: "IOT_FEVER_ALERT",
      } as any);

      // Spy on dispatchTelegramNotification
      const dispatchTelegramSpy = vi
        .spyOn(telegramDelivery, "dispatchTelegramNotification")
        .mockResolvedValue({ success: true, messageId: 998877 });

      // Spy on AuditLog
      const auditSpy = vi.spyOn(auditModule, "logAuditEvent").mockResolvedValue({} as any);

      const result = await processTelemetryIngestion({
        animalIdOrTag: "GOAT-99",
        temperature: 40.2,
        activity: 45,
        source: "REAL",
      });

      expect(result.success).toBe(true);
      expect(result.vitalState).toBe("FEVER");
      expect(result.alertTriggered).toBe(true);
      expect(result.alertType).toBe("IOT_FEVER_ALERT");

      // Verify exactly ONE InAppNotification was created
      expect(createNotifSpy).toHaveBeenCalledTimes(1);
      const notifArg = createNotifSpy.mock.calls[0][0].data;
      expect(notifArg.title).toContain("Goat");
      expect(notifArg.message).toContain("40.2°C");
      expect(notifArg.message).toContain("normal <40°C"); // Must cite Goat threshold (>40°C), NOT Cow (>39.5°C)

      // Verify exactly ONE Telegram dispatch was triggered
      expect(dispatchTelegramSpy).toHaveBeenCalledTimes(1);
      expect(dispatchTelegramSpy).toHaveBeenCalledWith("notif_fever_1");

      // Verify AuditLog recorded
      expect(auditSpy).toHaveBeenCalledTimes(1);
      expect(auditSpy.mock.calls[0][1]).toBe("IOT_VITAL_ALERT");
    });

    it("suppresses duplicate alert when repeated abnormal readings occur within the 30-min cooldown window", async () => {
      vi.spyOn(prisma.animal, "findFirst").mockResolvedValue(mockGoatAnimal as any);

      // Previous reading was ALSO abnormal (40.2°C)
      vi.spyOn(prisma.ioTReading, "findFirst").mockResolvedValue({
        id: "prev_reading_1",
        temperature: 40.2,
        activityIndex: 45,
        hasAnomaly: true,
        recordedAt: new Date(Date.now() - 30000), // 30 seconds ago
      } as any);

      // Device upsert & reading create
      vi.spyOn(prisma.ioTDevice, "upsert").mockResolvedValue({
        id: "device_goat_99",
        deviceIdentifier: "ESP32-GOAT-99",
      } as any);

      vi.spyOn(prisma.ioTReading, "create").mockResolvedValue({
        id: "new_reading_2",
        temperature: 40.3,
        activityIndex: 40,
        hasAnomaly: true,
        recordedAt: new Date(),
        source: "REAL",
      } as any);

      const createNotifSpy = vi.spyOn(prisma.inAppNotification, "create");
      const dispatchTelegramSpy = vi.spyOn(telegramDelivery, "dispatchTelegramNotification");

      const result = await processTelemetryIngestion({
        animalIdOrTag: "GOAT-99",
        temperature: 40.3,
        activity: 40,
        source: "REAL",
      });

      expect(result.success).toBe(true);
      expect(result.vitalState).toBe("FEVER");
      // Because state stayed FEVER -> FEVER, no state transition occurs
      expect(result.alertTriggered).toBe(false);
      expect(createNotifSpy).not.toHaveBeenCalled();
      expect(dispatchTelegramSpy).not.toHaveBeenCalled();
    });

    it("triggers lower-priority recovery notification on abnormal -> normal transition", async () => {
      vi.spyOn(prisma.animal, "findFirst").mockResolvedValue(mockGoatAnimal as any);

      // Previous reading was fever (40.2°C)
      vi.spyOn(prisma.ioTReading, "findFirst").mockResolvedValue({
        id: "prev_fever_reading",
        temperature: 40.2,
        activityIndex: 35,
        hasAnomaly: true,
        recordedAt: new Date(Date.now() - 600000), // 10 minutes ago
      } as any);

      vi.spyOn(prisma.inAppNotification, "findFirst").mockResolvedValue(null);

      vi.spyOn(prisma.ioTDevice, "upsert").mockResolvedValue({
        id: "device_goat_99",
        deviceIdentifier: "ESP32-GOAT-99",
      } as any);

      vi.spyOn(prisma.ioTReading, "create").mockResolvedValue({
        id: "recovered_reading",
        temperature: 39.0,
        activityIndex: 60,
        hasAnomaly: false,
        recordedAt: new Date(),
        source: "REAL",
      } as any);

      const createNotifSpy = vi.spyOn(prisma.inAppNotification, "create").mockResolvedValue({
        id: "notif_recovery_1",
        userId: mockFarmerUser.id,
        title: "ℹ️ Vitals Restored: [GOAT-99] Goat",
        message: "✅ [GOAT-99] Goat temperature normalized: 39°C recorded (normal range 38.5°C–39.7°C). Vitals stable.",
        type: "IOT_RECOVERY_ALERT",
      } as any);

      const dispatchTelegramSpy = vi
        .spyOn(telegramDelivery, "dispatchTelegramNotification")
        .mockResolvedValue({ success: true });

      const result = await processTelemetryIngestion({
        animalIdOrTag: "GOAT-99",
        temperature: 39.0,
        activity: 60,
        source: "REAL",
      });

      expect(result.success).toBe(true);
      expect(result.vitalState).toBe("NORMAL");
      expect(result.alertTriggered).toBe(true);
      expect(result.alertType).toBe("IOT_RECOVERY_ALERT");

      expect(createNotifSpy).toHaveBeenCalledTimes(1);
      const callArgs = createNotifSpy.mock.calls[0][0].data;
      expect(callArgs.type).toBe("IOT_RECOVERY_ALERT");
      expect(callArgs.message).toContain("normalized");
      expect(callArgs.message).toContain("38.5°C–39.7°C");

      expect(dispatchTelegramSpy).toHaveBeenCalledTimes(1);
    });

    it("safely creates InAppNotification without error when farmer has no Telegram connection", async () => {
      // Farmer without TelegramConnection
      const farmerNoTg = {
        ...mockFarmerUser,
        telegramConnection: null,
      };

      const animalNoTg = {
        ...mockGoatAnimal,
        herd: {
          farm: {
            farmerUser: farmerNoTg,
          },
        },
      };

      vi.spyOn(prisma.animal, "findFirst").mockResolvedValue(animalNoTg as any);

      // Previous reading normal
      vi.spyOn(prisma.ioTReading, "findFirst").mockResolvedValue({
        id: "prev_normal",
        temperature: 39.0,
        activityIndex: 50,
        hasAnomaly: false,
        recordedAt: new Date(Date.now() - 60000),
      } as any);

      vi.spyOn(prisma.inAppNotification, "findFirst").mockResolvedValue(null);

      vi.spyOn(prisma.ioTDevice, "upsert").mockResolvedValue({
        id: "device_goat_99",
        deviceIdentifier: "ESP32-GOAT-99",
      } as any);

      vi.spyOn(prisma.ioTReading, "create").mockResolvedValue({
        id: "reading_fever",
        temperature: 40.5,
        activityIndex: 40,
        hasAnomaly: true,
        recordedAt: new Date(),
        source: "REAL",
      } as any);

      const createNotifSpy = vi.spyOn(prisma.inAppNotification, "create").mockResolvedValue({
        id: "notif_fever_no_tg",
        userId: farmerNoTg.id,
        title: "🚨 High Fever Alert: [GOAT-99] Goat",
        message: "🚨 [GOAT-99] Goat shows fever: 40.5°C recorded (normal <40°C).",
        type: "IOT_FEVER_ALERT",
      } as any);

      // dispatchTelegramNotification returns NO_ACTIVE_CONNECTION but does not throw
      const dispatchTelegramSpy = vi
        .spyOn(telegramDelivery, "dispatchTelegramNotification")
        .mockResolvedValue({ success: false, reason: "NO_ACTIVE_CONNECTION" });

      const result = await processTelemetryIngestion({
        animalIdOrTag: "GOAT-99",
        temperature: 40.5,
        activity: 40,
        source: "REAL",
      });

      expect(result.success).toBe(true);
      expect(result.alertTriggered).toBe(true);
      expect(createNotifSpy).toHaveBeenCalledTimes(1);
      expect(dispatchTelegramSpy).toHaveBeenCalledTimes(1);
    });
  });
});
