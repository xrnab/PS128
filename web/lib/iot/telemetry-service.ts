import prisma from "@/lib/db/prisma";
import { IoTDeviceSource, IoTDeviceStatus } from "@prisma/client";
import { normalizeDeviceId } from "./utils";
import { classifyTemperature, TemperatureVitalState } from "./thresholds";
import { ingestIoTData, LiveESP32Telemetry } from "@/lib/api/backend-client";
import { dispatchTelegramNotification } from "@/lib/telegram/delivery";
import { logAuditEvent } from "@/lib/audit/log";

export interface TelemetryIngestionInput {
  animalIdOrTag?: string | null;
  deviceId?: string | null;
  temperature?: number | null;
  activity?: number | null;
  ambientTemp?: number | null;
  useSimulation?: boolean;
  simulateFever?: boolean;
  source?: IoTDeviceSource | "REAL" | "SIMULATED" | "REAL_ESP32";
}

export interface TelemetryIngestionResult {
  success: boolean;
  readingId?: string;
  deviceId: string;
  animalId: string | null;
  animalTag: string | null;
  species: string;
  source: IoTDeviceSource;
  temperature: number;
  activityIndex: number;
  vitalState: TemperatureVitalState;
  hasAnomaly: boolean;
  anomalies: string[];
  alertTriggered: boolean;
  alertType?: string;
  notificationId?: string;
  receivedAt: string;
  data: LiveESP32Telemetry;
  error?: string;
}

// 30-minute cooldown window against rapid oscillations
const ANOMALY_COOLDOWN_MS = 30 * 60 * 1000;
// 5-minute cooldown for recovery alerts
const RECOVERY_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Authoritative Unified IoT Telemetry Ingestion & Species-Aware Alert Service.
 *
 * Serves as the single source of truth for:
 * 1. Postgres persistence (IoTDevice & IoTReading).
 * 2. Species-aware physiological threshold evaluation (Cow, Buffalo, Goat, Sheep, Dog, Cat).
 * 3. State transition detection (NORMAL -> ABNORMAL, ABNORMAL -> NORMAL).
 * 4. 30-minute cooldown throttling against repetitive alerts.
 * 5. Multi-lingual InAppNotification creation (English & Marathi).
 * 6. Non-blocking, idempotent Telegram Push Notification dispatch.
 * 7. Immutable AuditLog tracking.
 */
export async function processTelemetryIngestion(
  input: TelemetryIngestionInput
): Promise<TelemetryIngestionResult> {
  const rawId = input.animalIdOrTag || input.deviceId || "ESP32-COW-01";
  const cleanId = normalizeDeviceId(rawId);

  const useSimulation = Boolean(input.useSimulation);
  const simulateFever = Boolean(input.simulateFever);
  const source: IoTDeviceSource =
    input.source === "REAL" ||
    input.source === "REAL_ESP32" ||
    (!useSimulation && typeof input.temperature === "number")
      ? IoTDeviceSource.REAL
      : IoTDeviceSource.SIMULATED;

  // 1. Resolve Animal & Farm Owner in PostgreSQL
  let animal = null;
  if (cleanId && cleanId !== "ESP32-GENERIC") {
    animal = await prisma.animal.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { tag: cleanId },
          { tag: cleanId.replace(/^ESP32-/, "") },
          { iotDeviceId: cleanId },
          { iotDeviceId: `ESP32-${cleanId.replace(/^ESP32-/, "")}` },
        ],
      },
      include: {
        herd: {
          include: {
            farm: {
              include: {
                farmerUser: {
                  include: {
                    telegramConnection: true,
                  },
                },
              },
            },
          },
        },
        iotDevices: {
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
  }

  // 2. Obtain Telemetry (from physical payload or simulation)
  let temp: number;
  let act: number;

  if (source === IoTDeviceSource.SIMULATED || input.temperature === null || input.temperature === undefined) {
    try {
      const backendRes = await ingestIoTData({
        animal_id: animal?.tag || cleanId,
        temperature: input.temperature ?? null,
        activity: input.activity ?? null,
        use_simulation: true,
        simulate_fever: simulateFever,
      });
      temp = backendRes.temperature;
      act = backendRes.activity_index;
    } catch {
      // Fallback local simulation if backend call times out
      temp = simulateFever ? 40.4 : 38.6;
      act = simulateFever ? 18 : 62;
    }
  } else {
    temp = Number(input.temperature);
    act = typeof input.activity === "number" ? input.activity : 50;
  }

  // 3. Species-Aware Temperature Classification
  const classification = classifyTemperature(
    animal?.species || "COW",
    temp,
    animal?.tag || cleanId
  );

  const isLethargic = act < 30;
  const anomalies: string[] = [];

  if (classification.state === "FEVER") {
    anomalies.push(
      `Hyperthermia: ${temp.toFixed(1)}°C (Threshold for ${classification.species} > ${classification.thresholdConfig.feverAt}°C)`
    );
  } else if (classification.state === "HYPOTHERMIA") {
    anomalies.push(
      `Hypothermia: ${temp.toFixed(1)}°C (Threshold for ${classification.species} < ${classification.thresholdConfig.hypothermiaAt}°C)`
    );
  } else if (classification.state === "ELEVATED") {
    anomalies.push(
      `Elevated core temp: ${temp.toFixed(1)}°C (Monitoring band for ${classification.species})`
    );
  }

  if (isLethargic) {
    anomalies.push(`Lethargy detected: Activity index ${act}/100 (<30)`);
  }

  const hasAnomaly = classification.isAbnormal || isLethargic;

  // 4. Resolve Device Identifier
  const deviceIdentifier = normalizeDeviceId(
    input.deviceId ||
      animal?.iotDevices[0]?.deviceIdentifier ||
      animal?.iotDeviceId ||
      `ESP32-${animal?.tag || cleanId}`
  );

  // 5. Query Previous Reading to evaluate State Transition
  const previousReading = await prisma.ioTReading.findFirst({
    where: animal?.id ? { animalId: animal.id } : { device: { deviceIdentifier } },
    orderBy: { recordedAt: "desc" },
  });

  const previousClassification =
    previousReading && typeof previousReading.temperature === "number"
      ? classifyTemperature(animal?.species || "COW", previousReading.temperature, animal?.tag || cleanId)
      : null;

  const previousState: TemperatureVitalState = previousClassification?.state || "NORMAL";
  const currentState: TemperatureVitalState = classification.state;

  // State transitions:
  const isAbnormalTransition =
    (currentState === "FEVER" || currentState === "HYPOTHERMIA") &&
    previousState !== currentState;

  const isRecoveryTransition =
    currentState === "NORMAL" &&
    (previousState === "FEVER" || previousState === "HYPOTHERMIA");

  // 6. Persist IoTDevice and IoTReading in Postgres
  const device = await prisma.ioTDevice.upsert({
    where: { deviceIdentifier },
    create: {
      deviceIdentifier,
      animalId: animal?.id || null,
      source,
      status: source === IoTDeviceSource.SIMULATED ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.ONLINE,
      lastSeenAt: new Date(),
      lastTemperature: temp,
      lastActivity: act,
      lastAnomalyState: hasAnomaly,
    },
    update: {
      ...(animal ? { animalId: animal.id } : {}),
      source,
      status: source === IoTDeviceSource.SIMULATED ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.ONLINE,
      lastSeenAt: new Date(),
      lastTemperature: temp,
      lastActivity: act,
      lastAnomalyState: hasAnomaly,
    },
  });

  if (animal && !animal.iotDeviceId) {
    await prisma.animal.update({
      where: { id: animal.id },
      data: { iotDeviceId: deviceIdentifier },
    });
  }

  const reading = await prisma.ioTReading.create({
    data: {
      deviceId: device.id,
      animalId: animal?.id || null,
      source,
      temperature: temp,
      activityIndex: act,
      hasAnomaly,
      anomalies,
      recordedAt: new Date(),
    },
  });

  // 7. Evaluate Notification Trigger & Cooldown Throttling
  let alertTriggered = false;
  let notificationId: string | undefined = undefined;
  let alertType: string | undefined = undefined;

  const farmerUser = animal?.herd?.farm?.farmerUser;

  if (farmerUser && (isAbnormalTransition || isRecoveryTransition)) {
    const isMarathi = farmerUser.preferredLanguage === "mr";

    if (isAbnormalTransition) {
      alertType = currentState === "FEVER" ? "IOT_FEVER_ALERT" : "IOT_HYPOTHERMIA_ALERT";

      // 30-Minute Cooldown Check for this animal and alert type
      const recentAlert = await prisma.inAppNotification.findFirst({
        where: {
          userId: farmerUser.id,
          type: alertType,
          link: animal ? { contains: animal.id } : undefined,
          createdAt: {
            gte: new Date(Date.now() - ANOMALY_COOLDOWN_MS),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!recentAlert) {
        alertTriggered = true;
        const title = isMarathi ? classification.alertTitleMr : classification.alertTitleEn;
        const message = isMarathi ? classification.alertMessageMr : classification.alertMessageEn;

        const notif = await prisma.inAppNotification.create({
          data: {
            userId: farmerUser.id,
            title,
            message,
            link: animal ? `/farmer/animals/${animal.id}` : "/farmer/iot",
            type: alertType,
          },
        });

        notificationId = notif.id;

        // Dispatches to Telegram outside transaction (safe, non-blocking, idempotent)
        dispatchTelegramNotification(notif.id).catch((err) => {
          console.error("[IoT Telegram Dispatch Failure]:", err);
        });

        // Audit Trail
        logAuditEvent(
          null,
          "IOT_VITAL_ALERT",
          farmerUser.id,
          previousState,
          currentState,
          `${classification.species} #${animal.tag} temperature alert: ${temp}°C (${alertType})`
        ).catch(() => {});
      } else {
        console.log(
          `[IoT Alert Throttled]: Notification for ${animal.tag} (${alertType}) suppressed by 30-min cooldown.`
        );
      }
    } else if (isRecoveryTransition) {
      alertType = "IOT_RECOVERY_ALERT";

      // 5-Minute Cooldown Check for recovery
      const recentRecovery = await prisma.inAppNotification.findFirst({
        where: {
          userId: farmerUser.id,
          type: "IOT_RECOVERY_ALERT",
          link: animal ? { contains: animal.id } : undefined,
          createdAt: {
            gte: new Date(Date.now() - RECOVERY_COOLDOWN_MS),
          },
        },
      });

      if (!recentRecovery) {
        alertTriggered = true;
        const title = isMarathi
          ? `ℹ️ प्रकृतीत सुधारणा: [${animal.tag}] ${classification.thresholdConfig.marathiName}`
          : `ℹ️ Vitals Restored: [${animal.tag}] ${classification.species}`;

        const message = isMarathi ? classification.recoveryMessageMr : classification.recoveryMessageEn;

        const notif = await prisma.inAppNotification.create({
          data: {
            userId: farmerUser.id,
            title,
            message,
            link: animal ? `/farmer/animals/${animal.id}` : "/farmer/iot",
            type: alertType,
          },
        });

        notificationId = notif.id;

        dispatchTelegramNotification(notif.id).catch((err) => {
          console.error("[IoT Telegram Recovery Dispatch Failure]:", err);
        });

        logAuditEvent(
          null,
          "IOT_VITAL_RECOVERY",
          farmerUser.id,
          previousState,
          currentState,
          `${classification.species} #${animal.tag} vitals restored: ${temp}°C`
        ).catch(() => {});
      }
    }
  }

  // 8. Update In-Memory Hot Cache for immediate UI reflection
  const cacheRecord: LiveESP32Telemetry = {
    animal_id: cleanId,
    temperature: temp,
    activity: act,
    activity_index: act,
    fever_flag: classification.state === "FEVER",
    hypothermia_flag: classification.state === "HYPOTHERMIA",
    lethargy_flag: isLethargic,
    has_anomaly: hasAnomaly,
    anomalies,
    hardware: source === IoTDeviceSource.REAL ? "ESP32 + MLX90614 + MPU6050" : "Virtual ESP32 Simulator",
    received_at: reading.recordedAt.toISOString(),
  };

  const gCache = ((globalThis as unknown as { __iotTelemetryCache?: Record<string, unknown> }).__iotTelemetryCache =
    (globalThis as unknown as { __iotTelemetryCache?: Record<string, unknown> }).__iotTelemetryCache || {});
  gCache[cleanId] = cacheRecord;
  gCache[device.deviceIdentifier] = cacheRecord;
  if (animal?.tag) {
    gCache[animal.tag] = cacheRecord;
    gCache[`ESP32-${animal.tag}`] = cacheRecord;
  }

  return {
    success: true,
    readingId: reading.id,
    deviceId: device.deviceIdentifier,
    animalId: animal?.id || null,
    animalTag: animal?.tag || null,
    species: classification.species,
    source: reading.source,
    temperature: temp,
    activityIndex: act,
    vitalState: classification.state,
    hasAnomaly,
    anomalies,
    alertTriggered,
    alertType,
    notificationId,
    receivedAt: reading.recordedAt.toISOString(),
    data: cacheRecord,
  };
}
