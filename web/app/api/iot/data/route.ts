import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { ingestIoTData, fetchLatestIoTTelemetry } from "@/lib/api/backend-client";
import { IoTDeviceSource, IoTDeviceStatus } from "@prisma/client";
import { normalizeDeviceId } from "@/lib/iot/utils";

/**
 * Unified IoT Ingestion Endpoint
 *
 * Accepts telemetry from both:
 * 1. Physical ESP32 microcontrollers (e.g. POST /api/iot/data with animal_id, temperature, activity)
 * 2. Virtual ESP32 Simulator
 *
 * Forwards to FastAPI POST /api/iot/data for authoritative anomaly & threshold processing,
 * updates in-memory hot cache, and persists the reading in PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawAnimalId = body.animal_id || body.animalId || "ESP32-COW-01";
    const cleanAnimalId = normalizeDeviceId(rawAnimalId);
    const temperature = typeof body.temperature === "number" ? body.temperature : null;
    const activity = typeof body.activity === "number" ? body.activity : null;
    const useSimulation = Boolean(body.use_simulation || body.useSimulation);
    const simulateFever = Boolean(body.simulate_fever || body.simulateFever);
    const source: IoTDeviceSource =
      body.source === "REAL" || body.source === "REAL_ESP32" || (!useSimulation && temperature !== null)
        ? IoTDeviceSource.REAL
        : IoTDeviceSource.SIMULATED;

    // 1. Authoritative Backend Processing via FastAPI
    const backendResult = await ingestIoTData({
      animal_id: cleanAnimalId,
      temperature,
      activity,
      use_simulation: useSimulation,
      simulate_fever: simulateFever,
    });

    // 2. Resolve Animal in database if matching ID or Tag
    let animal = null;
    if (cleanAnimalId && cleanAnimalId !== "ESP32-GENERIC") {
      animal = await prisma.animal.findFirst({
        where: {
          OR: [
            { id: cleanAnimalId },
            { tag: cleanAnimalId },
            { tag: cleanAnimalId.replace(/^ESP32-/, "") },
            { iotDeviceId: cleanAnimalId },
          ],
        },
      });
    }

    // 3. Resolve or Create IoTDevice record
    const deviceIdentifier = normalizeDeviceId(
      body.deviceId || animal?.iotDeviceId || `ESP32-${animal?.tag || cleanAnimalId}`
    );

    const device = await prisma.ioTDevice.upsert({
      where: { deviceIdentifier },
      create: {
        deviceIdentifier,
        animalId: animal?.id || null,
        source,
        status: source === IoTDeviceSource.SIMULATED ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.ONLINE,
        lastSeenAt: new Date(),
        lastTemperature: backendResult.temperature,
        lastActivity: backendResult.activity_index,
        lastAnomalyState: backendResult.has_anomaly,
      },
      update: {
        ...(animal ? { animalId: animal.id } : {}),
        source,
        status: source === IoTDeviceSource.SIMULATED ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.ONLINE,
        lastSeenAt: new Date(),
        lastTemperature: backendResult.temperature,
        lastActivity: backendResult.activity_index,
        lastAnomalyState: backendResult.has_anomaly,
      },
    });

    // Also update animal's iotDeviceId if not set
    if (animal && !animal.iotDeviceId) {
      await prisma.animal.update({
        where: { id: animal.id },
        data: { iotDeviceId: deviceIdentifier },
      });
    }

    // 4. Persist IoTReading record
    const reading = await prisma.ioTReading.create({
      data: {
        deviceId: device.id,
        animalId: animal?.id || null,
        source,
        temperature: backendResult.temperature,
        activityIndex: backendResult.activity_index,
        hasAnomaly: backendResult.has_anomaly,
        anomalies: backendResult.anomalies,
        recordedAt: new Date(),
      },
    });

    // 5. Update global in-memory hot cache for instant frontend reflection
    const cacheRecord = {
      animal_id: cleanAnimalId,
      raw_id: rawAnimalId,
      temperature: backendResult.temperature,
      activity: backendResult.activity_index,
      activity_index: backendResult.activity_index,
      fever_flag: backendResult.temperature > 39.5,
      lethargy_flag: backendResult.activity_index < 30,
      has_anomaly: backendResult.has_anomaly,
      anomalies: backendResult.anomalies,
      hardware: source === IoTDeviceSource.REAL ? "ESP32 + MLX90614 + MPU6050" : "Virtual ESP32 Simulator",
      received_at: reading.recordedAt.toISOString(),
    };

    const gCache = ((globalThis as unknown as { __iotTelemetryCache?: Record<string, unknown> }).__iotTelemetryCache =
      (globalThis as unknown as { __iotTelemetryCache?: Record<string, unknown> }).__iotTelemetryCache || {});
    gCache[cleanAnimalId] = cacheRecord;
    gCache[device.deviceIdentifier] = cacheRecord;
    if (cleanAnimalId.includes("COW-01") || (rawAnimalId && rawAnimalId.includes("COW-01"))) {
      gCache["ESP32-COW-01"] = cacheRecord;
      gCache["COW-01"] = cacheRecord;
      gCache["ESP32-ESP32-COW-01"] = cacheRecord;
    }

    return NextResponse.json({
      success: true,
      readingId: reading.id,
      deviceId: device.deviceIdentifier,
      animalId: animal?.id || null,
      animalTag: animal?.tag || null,
      source: reading.source,
      temperature: backendResult.temperature,
      activity_index: backendResult.activity_index,
      has_anomaly: backendResult.has_anomaly,
      anomalies: backendResult.anomalies,
      received_at: reading.recordedAt.toISOString(),
      data: cacheRecord,
    });
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

