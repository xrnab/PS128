import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { ingestIoTData, fetchLatestIoTTelemetry } from "@/lib/api/backend-client";
import { IoTDeviceSource, IoTDeviceStatus } from "@prisma/client";
import { normalizeDeviceId } from "@/lib/iot/utils";

import { processTelemetryIngestion } from "@/lib/iot/telemetry-service";

/**
 * Unified Authoritative IoT Ingestion Endpoint
 *
 * Accepts telemetry from both:
 * 1. Physical ESP32 microcontrollers (e.g. POST /api/iot/data with animal_id, temperature, activity)
 * 2. Virtual ESP32 Simulator
 *
 * Evaluates species-aware physiological thresholds, tracks state transitions,
 * throttles alerts, persists to PostgreSQL, and dispatches Telegram push alerts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await processTelemetryIngestion({
      animalIdOrTag: body.animal_id || body.animalId || "ESP32-COW-01",
      deviceId: body.deviceId || body.device_id,
      temperature: typeof body.temperature === "number" ? body.temperature : null,
      activity: typeof body.activity === "number" ? body.activity : null,
      ambientTemp: typeof body.ambient_temp === "number" ? body.ambient_temp : null,
      useSimulation: Boolean(body.use_simulation || body.useSimulation),
      simulateFever: Boolean(body.simulate_fever || body.simulateFever),
      source: body.source,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[IoT Ingestion Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process IoT telemetry.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/iot/data?animal_id=ESP32-COW-01
 *
 * Retrieves the latest IoT telemetry reading from hot memory cache, Neon PostgreSQL, or backend.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawId =
      searchParams.get("animal_id") ||
      searchParams.get("animalId") ||
      searchParams.get("deviceId") ||
      "ESP32-COW-01";
    const cleanId = normalizeDeviceId(rawId);

    const gCache = ((globalThis as unknown as { __iotTelemetryCache?: Record<string, unknown> }).__iotTelemetryCache =
      (globalThis as unknown as { __iotTelemetryCache?: Record<string, unknown> }).__iotTelemetryCache || {});

    if (gCache[cleanId] || gCache[rawId]) {
      const cached = (gCache[cleanId] || gCache[rawId]) as Record<string, unknown>;
      return NextResponse.json({
        success: true,
        isLive: true,
        telemetry: cached,
        ...cached,
      });
    }

    // Try finding latest reading from Neon DB
    const reading = await prisma.ioTReading.findFirst({
      where: {
        OR: [
          { device: { deviceIdentifier: cleanId } },
          { device: { deviceIdentifier: `ESP32-${cleanId.replace(/^ESP32-/, "")}` } },
          { animal: { tag: cleanId } },
          { animal: { tag: cleanId.replace(/^ESP32-/, "") } },
          { animal: { iotDeviceId: cleanId } },
        ],
      },
      orderBy: { recordedAt: "desc" },
      include: { device: true },
    });

    if (reading) {
      const record = {
        animal_id: cleanId,
        temperature: reading.temperature,
        activity: reading.activityIndex,
        activity_index: reading.activityIndex,
        fever_flag: reading.temperature > 39.5,
        lethargy_flag: reading.activityIndex < 30,
        has_anomaly: reading.hasAnomaly,
        anomalies: reading.anomalies,
        hardware: reading.source === IoTDeviceSource.REAL ? "ESP32 + MLX90614 + MPU6050" : "Virtual ESP32 Simulator",
        received_at: reading.recordedAt.toISOString(),
      };
      return NextResponse.json({
        success: true,
        isLive: reading.source === IoTDeviceSource.REAL,
        telemetry: record,
        ...record,
      });
    }

    // Try fetching from backend client
    const remote = await fetchLatestIoTTelemetry(cleanId);
    if (remote) {
      return NextResponse.json({
        success: true,
        isLive: true,
        telemetry: remote,
        ...remote,
      });
    }

    return NextResponse.json({
      success: true,
      isLive: false,
      message: "No live reading recorded yet. Ready to ingest from ESP32.",
      telemetry: {
        animal_id: cleanId,
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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to retrieve IoT telemetry" },
      { status: 500 }
    );
  }
}

