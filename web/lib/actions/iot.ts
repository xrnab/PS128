"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireFarmer, assertFarmerOwnsAnimal } from "@/lib/auth/permissions";
import { requireActiveUser } from "@/lib/auth/session";
import {
  ingestIoTData,
  BackendTimeoutError,
  getBackendHealth,
  fetchLatestIoTTelemetry,
} from "@/lib/api/backend-client";
import { createInAppNotification } from "./notifications";
import { IoTDeviceSource, IoTDeviceStatus, UserRole } from "@prisma/client";

import { computeDeviceConnectionState, IoTConnectionState } from "@/lib/iot/utils";

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

  // If animal has no IoTDevice row yet, provision a default offline device
  if (!activeDevice) {
    const defaultIdentifier = animal.iotDeviceId || `ESP32-${animal.tag}`;
    activeDevice = await prisma.ioTDevice.create({
      data: {
        deviceIdentifier: defaultIdentifier,
        animalId: animal.id,
        source: IoTDeviceSource.SIMULATED,
        status: IoTDeviceStatus.OFFLINE,
      },
    });

    if (!animal.iotDeviceId) {
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

  const source: IoTDeviceSource =
    input.source === "REAL" ? IoTDeviceSource.REAL : IoTDeviceSource.SIMULATED;

  // Lightweight pre-warm of idle backend container (non-blocking)
  getBackendHealth().catch(() => {});

  // 1. Authoritative Backend Processing via FastAPI POST /api/iot/data
  let backendResult;
  try {
    backendResult = await ingestIoTData({
      animal_id: animal.tag,
      temperature: input.temperature !== undefined ? input.temperature : null,
      activity: input.activity !== undefined ? input.activity : null,
      use_simulation: source === IoTDeviceSource.SIMULATED,
      simulate_fever: Boolean(input.simulateFever),
    });
  } catch (err) {
    console.error("[FastAPI IoT Ingestion Failure]:", err);
    if (err instanceof BackendTimeoutError) {
      return {
        success: false,
        error:
          "The livestock health backend is waking up from an idle state — please wait about 30 seconds and try again.",
      };
    }
    return {
      success: false,
      error: "Unable to reach the backend IoT ingestion service. Please try again.",
    };
  }

  // 2. Resolve or Update Device Record
  const deviceIdentifier =
    input.deviceId ||
    animal.iotDevices[0]?.deviceIdentifier ||
    animal.iotDeviceId ||
    `ESP32-${animal.tag}`;

  const previousDevice = animal.iotDevices[0];
  const previousAnomalyState = previousDevice?.lastAnomalyState || false;

  const device = await prisma.ioTDevice.upsert({
    where: { deviceIdentifier },
    create: {
      deviceIdentifier,
      animalId: animal.id,
      source,
      status: source === IoTDeviceSource.SIMULATED ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.ONLINE,
      lastSeenAt: new Date(),
      lastTemperature: backendResult.temperature,
      lastActivity: backendResult.activity_index,
      lastAnomalyState: backendResult.has_anomaly,
    },
    update: {
      animalId: animal.id,
      source,
      status: source === IoTDeviceSource.SIMULATED ? IoTDeviceStatus.SIMULATING : IoTDeviceStatus.ONLINE,
      lastSeenAt: new Date(),
      lastTemperature: backendResult.temperature,
      lastActivity: backendResult.activity_index,
      lastAnomalyState: backendResult.has_anomaly,
    },
  });

  // 3. Save IoTReading record
  const reading = await prisma.ioTReading.create({
    data: {
      deviceId: device.id,
      animalId: animal.id,
      source,
      temperature: backendResult.temperature,
      activityIndex: backendResult.activity_index,
      hasAnomaly: backendResult.has_anomaly,
      anomalies: backendResult.anomalies,
      recordedAt: new Date(),
    },
  });

  // 4. Non-Spamming Notification: Send in-app notification ONLY on transition to anomaly state
  if (backendResult.has_anomaly && !previousAnomalyState) {
    const ownerUserId = animal.herd.farm.farmerUserId || user.id;
    await createInAppNotification({
      userId: ownerUserId,
      title: `⚠️ IoT Sensor Risk: #${animal.tag} (${source === IoTDeviceSource.SIMULATED ? "Simulated" : "ESP32"})`,
      message: `Vitals alert: ${backendResult.anomalies.join(" • ")}. Core Temp: ${backendResult.temperature}°C, Activity: ${backendResult.activity_index}.`,
      link: `/farmer/animals/${animal.id}`,
      type: "IOT_HEALTH_RISK",
    });
  }

  revalidatePath("/farmer/iot");
  revalidatePath(`/farmer/animals/${animal.id}`);

  return {
    success: true,
    connectionState: computeDeviceConnectionState(device),
    device: {
      id: device.id,
      deviceIdentifier: device.deviceIdentifier,
      source: device.source,
      status: device.status,
      lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
    },
    reading: {
      id: reading.id,
      deviceId: device.deviceIdentifier,
      animalId: animal.id,
      source: reading.source,
      temperature: reading.temperature,
      activityIndex: reading.activityIndex,
      hasAnomaly: reading.hasAnomaly,
      anomalies: reading.anomalies,
      recordedAt: reading.recordedAt.toISOString(),
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
 * or associated animal device, evaluates status, and persists to DB.
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

  const deviceIdentifier = lookupId;
  const previousDevice = animal.iotDevices[0];
  const previousAnomalyState = previousDevice?.lastAnomalyState || false;

  const device = await prisma.ioTDevice.upsert({
    where: { deviceIdentifier },
    create: {
      deviceIdentifier,
      animalId: animal.id,
      source: IoTDeviceSource.REAL,
      status: IoTDeviceStatus.ONLINE,
      lastSeenAt: new Date(),
      lastTemperature: liveTelemetry.temperature,
      lastActivity: liveTelemetry.activity,
      lastAnomalyState: liveTelemetry.has_anomaly,
    },
    update: {
      animalId: animal.id,
      source: IoTDeviceSource.REAL,
      status: IoTDeviceStatus.ONLINE,
      lastSeenAt: new Date(),
      lastTemperature: liveTelemetry.temperature,
      lastActivity: liveTelemetry.activity,
      lastAnomalyState: liveTelemetry.has_anomaly,
    },
  });

  const reading = await prisma.ioTReading.create({
    data: {
      deviceId: device.id,
      animalId: animal.id,
      source: IoTDeviceSource.REAL,
      temperature: liveTelemetry.temperature,
      activityIndex: liveTelemetry.activity,
      hasAnomaly: liveTelemetry.has_anomaly,
      anomalies: liveTelemetry.anomalies || [],
      recordedAt: new Date(),
    },
  });

  if (liveTelemetry.has_anomaly && !previousAnomalyState) {
    const ownerUserId = animal.herd.farm.farmerUserId || user.id;
    await createInAppNotification({
      userId: ownerUserId,
      title: `⚠️ Live ESP32 Sensor Alert: #${animal.tag} (ESP32-COW-01)`,
      message: `Physiological anomaly detected by MLX90614/MPU6050: Temp ${liveTelemetry.temperature}°C, Activity ${liveTelemetry.activity}/100.`,
      link: `/farmer/animals/${animal.id}`,
      type: "IOT_HEALTH_RISK",
    });
  }

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
      lastTemperature: device.lastTemperature,
      lastActivity: device.lastActivity,
      lastAnomalyState: device.lastAnomalyState,
    },
    reading: {
      id: reading.id,
      source: reading.source,
      temperature: reading.temperature,
      activityIndex: reading.activityIndex,
      hasAnomaly: reading.hasAnomaly,
      anomalies: reading.anomalies,
      recordedAt: reading.recordedAt.toISOString(),
    },
    telemetry: liveTelemetry,
  };
}

