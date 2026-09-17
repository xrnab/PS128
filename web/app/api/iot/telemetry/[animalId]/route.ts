import { NextRequest, NextResponse } from "next/server";
import { fetchLatestIoTTelemetry } from "@/lib/api/backend-client";
import prisma from "@/lib/db/prisma";
import { IoTDeviceSource, IoTDeviceStatus } from "@prisma/client";

/**
 * Live IoT Telemetry Proxy Route
 *
 * GET /api/iot/telemetry/[animalId]
 *
 * Fetches real-time sensor packets transmitted by the physical ESP32 node
 * (ANIMAL_ID="ESP32-COW-01", Adafruit MLX90614 + MPU6050) via the backend
 * and optionally syncs state with the PostgreSQL database.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ animalId: string }> }
) {
  try {
    const { animalId } = await context.params;
    const targetId = animalId ? decodeURIComponent(animalId) : "ESP32-COW-01";

    const telemetry = await fetchLatestIoTTelemetry(targetId);

    if (!telemetry) {
      return NextResponse.json({
        success: true,
        isLive: false,
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
            { iotDeviceId: targetId },
            { iotDeviceId: "ESP32-COW-01" },
          ],
        },
        include: { iotDevices: true },
      });

      if (animal) {
        const deviceIdentifier = animal.iotDeviceId || "ESP32-COW-01";
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
