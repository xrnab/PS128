"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireFarmer, assertFarmerOwnsAnimal } from "@/lib/auth/permissions";
import { requireActiveUser } from "@/lib/auth/session";
import {
  getBackendHealth,
  fetchLatestIoTTelemetry,
} from "@/lib/api/backend-client";
import { IoTDeviceSource, IoTDeviceStatus, UserRole } from "@prisma/client";

import { computeDeviceConnectionState, IoTConnectionState, normalizeDeviceId } from "@/lib/iot/utils";
import { processTelemetryIngestion } from "@/lib/iot/telemetry-service";

export type { IoTConnectionState };

export interface IoTTelemetryInput {
  animalId: string;
  deviceId?: string;
  temperature?: number | null;
  activity?: number | null;
  useSimulation?: boolean;
  simulateFever?: boolean;
  source?: "REAL" | "SIMULATED";
}

/**
 * Retrieves all animals owned by the authenticated farmer along with linked IoT device status
 */
export async function getFarmerAnimalsWithIoTAction() {
  const farmer = await requireFarmer();

  const animals = await prisma.animal.findMany({
    where: {
      herd: {
        farm: {
          farmerUserId: farmer.id,
        },
      },
    },
    include: {
      herd: {
        include: {
          farm: true,
        },
      },
      iotDevices: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      iotReadings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return animals.map((animal) => {
    const activeDevice = animal.iotDevices[0] || null;
    const latestReading = animal.iotReadings[0] || null;
    const connectionState = computeDeviceConnectionState(activeDevice);

    return {
      id: animal.id,
      tag: animal.tag,
      species: animal.species,
      breed: animal.breed,
      farmName: animal.herd.farm.name,
      iotDeviceId: activeDevice?.deviceIdentifier || animal.iotDeviceId || null,
      deviceSource: activeDevice?.source || null,
      connectionState,
      latestReading: latestReading
        ? {
            id: latestReading.id,
            temperature: latestReading.temperature,
            activityIndex: latestReading.activityIndex,
            hasAnomaly: latestReading.hasAnomaly,
            anomalies: latestReading.anomalies,
            source: latestReading.source,
            recordedAt: latestReading.recordedAt.toISOString(),
          }
        : null,
    };
  });
}

/**
 * Retrieves detailed IoT monitoring data for a specific animal with strict authorization
 */
export async function getAnimalIoTMonitoringDataAction(animalId: string) {
  const user = await requireActiveUser();

  // Strict Server-Side Role Guard
  if (user.role === UserRole.FARMER) {
    await assertFarmerOwnsAnimal(animalId);
  } else if (user.role === UserRole.VETERINARIAN || user.role === UserRole.FIELD_AGENT) {
    // Check district authorization
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      include: {
        herd: {
          include: {
            farm: {
              include: {
                village: {
                  include: {
                    block: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!animal) {
      throw new Error("Animal not found");
    }

    if (user.districtId && animal.herd.farm.village.block.districtId !== user.districtId) {
      throw new Error("Unauthorized: Animal is outside your assigned district");
    }
  }

  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    include: {
      herd: {
        include: {
          farm: {
            include: {
              village: {
                include: {
                  block: {
                    include: {
                      district: true,
                    },
                  },
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
      iotReadings: {
        orderBy: { recordedAt: "desc" },
        take: 50, // Up to 50 recent time-series points
      },
    },
  });

  if (!animal) {
    throw new Error("Animal not found");
  }

  let activeDevice = animal.iotDevices[0] || null;

  // If animal has no IoTDevice row yet, provision or link a default device safely without collisions
  if (!activeDevice) {
    const rawTag = animal.tag || animal.species || animal.id.slice(-6);
    let defaultIdentifier = normalizeDeviceId(animal.iotDeviceId || rawTag);

    // If deviceIdentifier is already taken by a different animal, use a unique identifier scoped to this animal
    const existingDevice = await prisma.ioTDevice.findUnique({
      where: { deviceIdentifier: defaultIdentifier },
      select: { id: true, animalId: true },
    });

    if (existingDevice && existingDevice.animalId && existingDevice.animalId !== animal.id) {
      defaultIdentifier = normalizeDeviceId(`ESP32-${rawTag}-${animal.id.slice(-6)}`);
    }

    activeDevice = await prisma.ioTDevice.upsert({
      where: { deviceIdentifier: defaultIdentifier },
      create: {
        deviceIdentifier: defaultIdentifier,
        animalId: animal.id,
        source: IoTDeviceSource.SIMULATED,
        status: IoTDeviceStatus.OFFLINE,
      },
      update: {
        animalId: animal.id,
      },
    });

    if (!animal.iotDeviceId || animal.iotDeviceId !== defaultIdentifier) {
      await prisma.animal.update({
        where: { id: animal.id },
        data: { iotDeviceId: defaultIdentifier },
      });
    }
  }

  const connectionState = computeDeviceConnectionState(activeDevice);
  const latestReading = animal.iotReadings[0] || null;

  const totalReadings = animal.iotReadings.length;
  const simulatedReadings = animal.iotReadings.filter((r) => r.source === IoTDeviceSource.SIMULATED).length;
  const realReadings = animal.iotReadings.filter((r) => r.source === IoTDeviceSource.REAL).length;
  const anomaliesCount = animal.iotReadings.filter((r) => r.hasAnomaly).length;

  return {
    animal: {
      id: animal.id,
      tag: animal.tag,
      species: animal.species,
      breed: animal.breed,
      ageMonths: animal.ageMonths,
      farmName: animal.herd.farm.name,
      villageName: animal.herd.farm.village.name,
      districtName: animal.herd.farm.village.block.district.name,
    },
    device: {
      id: activeDevice.id,
      deviceIdentifier: activeDevice.deviceIdentifier,
      source: activeDevice.source,
      status: activeDevice.status,
      connectionState,
      lastSeenAt: activeDevice.lastSeenAt ? activeDevice.lastSeenAt.toISOString() : null,
      lastTemperature: activeDevice.lastTemperature,
      lastActivity: activeDevice.lastActivity,
      lastAnomalyState: activeDevice.lastAnomalyState,
    },
    connectionState,
    summary: {
      totalReadings,
      simulatedReadings,
      realReadings,
      anomaliesCount,
    },
    latestReading: latestReading
      ? {
          id: latestReading.id,
          temperature: latestReading.temperature,
          activityIndex: latestReading.activityIndex,
          hasAnomaly: latestReading.hasAnomaly,
          anomalies: latestReading.anomalies,
          source: latestReading.source,
          recordedAt: latestReading.recordedAt.toISOString(),
        }
      : null,
    readings: animal.iotReadings.map((r) => ({
      id: r.id,
      temperature: r.temperature,
      activityIndex: r.activityIndex,
      hasAnomaly: r.hasAnomaly,
      anomalies: r.anomalies,
      source: r.source,
      recordedAt: r.recordedAt.toISOString(),
    })),
  };
}

/**
 * Ingests a new IoT reading via FastAPI backend and saves to database
 */
export async function ingestIoTTelemetryAction(input: IoTTelemetryInput) {
  const user = await requireActiveUser();

  // Validate ownership if farmer
  if (user.role === UserRole.FARMER) {
    await assertFarmerOwnsAnimal(input.animalId);
  }

  const animal = await prisma.animal.findUnique({
    where: { id: input.animalId },
    include: {
      herd: {
        include: {
          farm: true,
        },
      },
      iotDevices: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!animal) {
    return { success: false, error: "Animal not found" };
  }

  // Lightweight pre-warm of idle backend container (non-blocking)
  getBackendHealth().catch(() => {});

  const result = await processTelemetryIngestion({
    animalIdOrTag: animal.id,
    deviceId: input.deviceId,
    temperature: input.temperature !== undefined ? input.temperature : null,
    activity: input.activity !== undefined ? input.activity : null,
    useSimulation: input.source !== "REAL" && Boolean(input.useSimulation),
    simulateFever: Boolean(input.simulateFever),
    source: input.source,
  });

  const device = await prisma.ioTDevice.findUnique({
    where: { deviceIdentifier: result.deviceId },
  });

  revalidatePath("/farmer/iot");
  revalidatePath(`/farmer/animals/${animal.id}`);

  return {
    success: true,
    connectionState: computeDeviceConnectionState(device),
    device: {
      id: device?.id || result.deviceId,
      deviceIdentifier: result.deviceId,
      source: result.source,
      status: device?.status || IoTDeviceStatus.ONLINE,
      lastSeenAt: device?.lastSeenAt ? device.lastSeenAt.toISOString() : null,
    },
    reading: {
      id: result.readingId || "latest",
      deviceId: result.deviceId,
      animalId: animal.id,
      source: result.source,
      temperature: result.temperature,
      activityIndex: result.activityIndex,
      hasAnomaly: result.hasAnomaly,
      anomalies: result.anomalies,
      recordedAt: result.receivedAt,
    },
  };
}

/**
 * Activates or deactivates simulation mode for an animal's IoT device
 */
export async function toggleDeviceSimulationModeAction(
  animalId: string,
  simulateActive: boolean
) {
  const user = await requireActiveUser();
  if (user.role === UserRole.FARMER) {
    await assertFarmerOwnsAnimal(animalId);
  }

  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    include: {
      iotDevices: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!animal) {
    return { success: false, error: "Animal not found" };
  }

  const deviceIdentifier =
    animal.iotDevices[0]?.deviceIdentifier || animal.iotDeviceId || `ESP32-${animal.tag}`;

  const device = await prisma.ioTDevice.upsert({
    where: { deviceIdentifier },
    create: {
      deviceIdentifier,
      animalId: animal.id,
      source: simulateActive ? IoTDeviceSource.SIMULATED : IoTDeviceSource.REAL,
      status: simulateActive ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.OFFLINE,
      lastSeenAt: simulateActive ? new Date() : null,
    },
    update: {
      animalId: animal.id,
      source: simulateActive ? IoTDeviceSource.SIMULATED : IoTDeviceSource.REAL,
      status: simulateActive ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.OFFLINE,
      ...(simulateActive ? { lastSeenAt: new Date() } : {}),
    },
  });

  revalidatePath("/farmer/iot");
  revalidatePath(`/farmer/animals/${animal.id}`);

  return {
    success: true,
    connectionState: computeDeviceConnectionState(device),
    device: {
      id: device.id,
      deviceIdentifier: device.deviceIdentifier,
      animalId: device.animalId,
      source: device.source,
      status: device.status,
      lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
    },
  };
}

/**
 * Fetches the latest live telemetry from the physical ESP32 node (ESP32-COW-01)
 * or associated animal device, evaluates status via the unified alert pipeline,
 * and persists to DB with species-aware threshold notifications.
 */
export async function fetchLiveESP32TelemetryAction(
  animalId: string,
  deviceId?: string
) {
  const user = await requireActiveUser();
  if (user.role === UserRole.FARMER) {
    await assertFarmerOwnsAnimal(animalId);
  }

  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    include: {
      herd: { include: { farm: true } },
      iotDevices: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });

  if (!animal) {
    return { success: false, error: "Animal not found" };
  }

  const lookupId = deviceId || animal.iotDevices[0]?.deviceIdentifier || animal.iotDeviceId || "ESP32-COW-01";
  const liveTelemetry = await fetchLatestIoTTelemetry(lookupId);

  if (!liveTelemetry) {
    return {
      success: false,
      error: "Unable to reach the live ESP32 telemetry feed. Ensure the device is powered and connected to Wi-Fi.",
    };
  }

  // Delegate to the unified telemetry pipeline for:
  // - Species-aware threshold evaluation
  // - State transition detection & cooldown-throttled alerts
  // - Localized (English/Marathi) notifications
  // - Telegram push dispatch
  // - Audit trail logging
  const result = await processTelemetryIngestion({
    animalIdOrTag: animal.id,
    deviceId: lookupId,
    temperature: liveTelemetry.temperature,
    activity: liveTelemetry.activity,
    source: "REAL",
  });

  const device = await prisma.ioTDevice.findUnique({
    where: { deviceIdentifier: result.deviceId },
  });

  revalidatePath("/farmer/iot");
  revalidatePath(`/farmer/animals/${animal.id}`);

  return {
    success: true,
    connectionState: computeDeviceConnectionState(device),
    device: {
      id: device?.id || result.deviceId,
      deviceIdentifier: result.deviceId,
      animalId: animal.id,
      source: result.source,
      status: device?.status || IoTDeviceStatus.ONLINE,
      lastSeenAt: device?.lastSeenAt ? device.lastSeenAt.toISOString() : null,
      lastTemperature: result.temperature,
      lastActivity: result.activityIndex,
      lastAnomalyState: result.hasAnomaly,
    },
    reading: {
      id: result.readingId || "latest",
      source: result.source,
      temperature: result.temperature,
      activityIndex: result.activityIndex,
      hasAnomaly: result.hasAnomaly,
      anomalies: result.anomalies,
      recordedAt: result.receivedAt,
    },
    telemetry: liveTelemetry,
  };
}

