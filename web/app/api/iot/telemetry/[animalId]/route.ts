import { NextRequest, NextResponse } from "next/server";
import { fetchLatestIoTTelemetry, LiveESP32Telemetry } from "@/lib/api/backend-client";
import prisma from "@/lib/db/prisma";
import { IoTDeviceSource, IoTDeviceStatus } from "@prisma/client";
import { normalizeDeviceId } from "@/lib/iot/utils";

/**
 * Live IoT Telemetry Proxy Route
 *
 * GET /api/iot/telemetry/[animalId]
 *
 * Resolves real-time sensor packets transmitted by the physical ESP32 node
 * (ANIMAL_ID="ESP32-COW-01", Adafruit MLX90614 + MPU6050) across:
 * 1. Live FastAPI backend (GET /api/iot/telemetry/{id} or /api/iot/data)
 * 2. Shared in-memory hot cache (globalThis.__iotTelemetryCache)
 * 3. Neon PostgreSQL database (IoTReading)
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ animalId: string }> }
) {
  try {
    const { animalId } = await context.params;
    const rawTarget = animalId ? decodeURIComponent(animalId) : "ESP32-COW-01";
    const targetId = normalizeDeviceId(rawTarget);

    // 1. Try fetching directly from FastAPI backend
    let telemetry: LiveESP32Telemetry | null = await fetchLatestIoTTelemetry(targetId);

    // 2. Fallback to in-memory hot cache if backend returned null
    if (!telemetry) {
      const gCache = ((globalThis as unknown as { __iotTelemetryCache?: Record<string, unknown> }).__iotTelemetryCache =
        (globalThis as unknown as { __iotTelemetryCache?: Record<string, unknown> }).__iotTelemetryCache || {});
      const candidateKeys = [
        targetId,
        targetId.replace(/^ESP32-/, ""),
        "ESP32-COW-01",
        "COW-01",
      ];
      for (const k of candidateKeys) {
        if (gCache[k]) {
          telemetry = gCache[k] as LiveESP32Telemetry;
          break;
        }
      }
    }

    // 3. Fallback to Neon PostgreSQL latest reading
    if (!telemetry) {
      try {
        const latestReading = await prisma.ioTReading.findFirst({
          where: {
            OR: [
              { device: { deviceIdentifier: targetId } },
              { device: { deviceIdentifier: `ESP32-${targetId.replace(/^ESP32-/, "")}` } },
              { animal: { tag: targetId } },
              { animal: { tag: targetId.replace(/^ESP32-/, "") } },
              { animal: { iotDeviceId: targetId } },
            ],
          },
          orderBy: { recordedAt: "desc" },
          include: { device: true },
        });

        if (latestReading) {
          telemetry = {
            animal_id: targetId,
            temperature: latestReading.temperature,
            activity: latestReading.activityIndex,
            activity_index: latestReading.activityIndex,
            fever_flag: latestReading.temperature > 39.5,
            lethargy_flag: latestReading.activityIndex < 30,
            has_anomaly: latestReading.hasAnomaly,
            anomalies: latestReading.anomalies,
            hardware:
              latestReading.source === IoTDeviceSource.REAL
                ? "ESP32 + MLX90614 + MPU6050"
                : "Virtual ESP32 Simulator",
            received_at: latestReading.recordedAt.toISOString(),
          };
        }
      } catch (dbReadErr) {
        console.warn("[Live Telemetry DB Lookup Warning]:", dbReadErr);
      }
    }

    // 4. Default fallback when no reading is found anywhere
    if (!telemetry) {
      return NextResponse.json({
        success: true,
        isLive: false,
        hasRealData: false,
        telemetry: {
          animal_id: targetId,
          temperature: 38.5,
          activity: 45,
          activity_index: 45,
          fever_flag: false,
          lethargy_flag: false,
          has_anomaly: false,
          anomalies: [],
          hardware: "ESP32 + MLX90614 + MPU6050 (Awaiting Data)",
          received_at: new Date().toISOString(),
        },
      });
    }

    // Optional background sync with Prisma if matching animal is in DB
    try {
      const animal = await prisma.animal.findFirst({
        where: {
          OR: [
            { id: targetId },
            { tag: targetId },
            { tag: targetId.replace(/^ESP32-/, "") },
            { iotDeviceId: targetId },
            { iotDeviceId: "ESP32-COW-01" },
          ],
        },
        include: { iotDevices: true },
      });

      if (animal) {
        const deviceIdentifier = normalizeDeviceId(animal.iotDeviceId || "ESP32-COW-01");
        await prisma.ioTDevice.upsert({
          where: { deviceIdentifier },
          create: {
            deviceIdentifier,
            animalId: animal.id,
            source: IoTDeviceSource.REAL,
            status: IoTDeviceStatus.ONLINE,
            lastSeenAt: new Date(),
            lastTemperature: telemetry.temperature,
            lastActivity: telemetry.activity,
            lastAnomalyState: telemetry.has_anomaly,
          },
          update: {
            animalId: animal.id,
            source: IoTDeviceSource.REAL,
            status: IoTDeviceStatus.ONLINE,
            lastSeenAt: new Date(),
            lastTemperature: telemetry.temperature,
            lastActivity: telemetry.activity,
            lastAnomalyState: telemetry.has_anomaly,
          },
        });
      }
    } catch (dbErr) {
      // Non-blocking: DB sync failure should not prevent telemetry delivery
      console.warn("[Live Telemetry DB Sync Notice]:", dbErr);
    }

    return NextResponse.json({
      success: true,
      isLive: true,
      hasRealData: true,
      telemetry,
    });
  } catch (err: unknown) {
    console.error("[Live IoT Proxy Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to fetch live IoT telemetry",
      },
      { status: 500 }
    );
  }
}

