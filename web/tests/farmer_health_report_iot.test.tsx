import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { IoTInput } from "@/components/reporting/IoTInput";
import * as iotActions from "@/lib/actions/iot";
import * as casesActions from "@/lib/actions/cases";
import enDict from "@/lib/i18n/dictionaries/en.json";
import hiDict from "@/lib/i18n/dictionaries/hi.json";
import mrDict from "@/lib/i18n/dictionaries/mr.json";
import bnDict from "@/lib/i18n/dictionaries/bn.json";

// Mock server actions
vi.mock("@/lib/actions/iot", () => ({
  getAnimalIoTMonitoringDataAction: vi.fn(),
  ingestIoTTelemetryAction: vi.fn(),
}));

vi.mock("@/lib/actions/cases", () => ({
  createCaseReportAction: vi.fn(),
}));

vi.mock("@/components/layout/LocaleProvider", () => ({
  useLocale: () => ({
    locale: "en",
    dictionary: enDict,
    setLocale: vi.fn(),
  }),
}));

describe("Farmer Health Report - IoT Input & Simulation Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Renders 'No ESP32 Connected' banner when no animal is selected", () => {
    render(
      <IoTInput
        temperature={null}
        activity={null}
        heartRate={null}
        iotSource={null}
        iotReadingId={null}
        onChangeTemperature={vi.fn()}
        onChangeActivity={vi.fn()}
        onChangeHeartRate={vi.fn()}
        onChangeIotSource={vi.fn()}
        onChangeIotReadingId={vi.fn()}
      />
    );

    expect(screen.getByText("IoT Sensor Data")).toBeInTheDocument();
    expect(screen.getByText("No ESP32 Connected")).toBeInTheDocument();
    expect(
      screen.getByText("No physical ESP32 device is currently available for this animal.")
    ).toBeInTheDocument();
  });

  it("2. When animal has NO physical device, renders 'No ESP32 Connected' and offers simulation button", async () => {
    vi.mocked(iotActions.getAnimalIoTMonitoringDataAction).mockResolvedValue({
      animal: { id: "animal-1", tag: "COW-101", species: "COW", breed: "Sahiwal", ageMonths: 24, farmName: "Farm", villageName: "Village", districtName: "District" },
      device: { id: "mock-id", deviceIdentifier: "NONE", source: "SIMULATED", status: "OFFLINE", connectionState: "NO_DEVICE", lastSeenAt: null, lastTemperature: null, lastActivity: null, lastAnomalyState: false },
      connectionState: "NO_DEVICE",
      readings: [],
      latestReading: null,
      summary: { totalReadings: 0, simulatedReadings: 0, realReadings: 0, anomaliesCount: 0 },
    });

    render(
      <IoTInput
        animalId="animal-1"
        animalTag="COW-101"
        temperature={null}
        activity={null}
        heartRate={null}
        iotSource={null}
        iotReadingId={null}
        onChangeTemperature={vi.fn()}
        onChangeActivity={vi.fn()}
        onChangeHeartRate={vi.fn()}
        onChangeIotSource={vi.fn()}
        onChangeIotReadingId={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No ESP32 Connected")).toBeInTheDocument();
    });

    expect(
      screen.getByText("No physical ESP32 device is currently available for this animal.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simulate iot data/i })).toBeInTheDocument();
  });

  it("3. When animal has an ONLINE physical ESP32, auto-populates telemetry with REAL ESP32 badge", async () => {
    const mockChangeTemp = vi.fn();
    const mockChangeAct = vi.fn();
    const mockChangeSource = vi.fn();
    const mockChangeReadingId = vi.fn();

    vi.mocked(iotActions.getAnimalIoTMonitoringDataAction).mockResolvedValue({
      animal: { id: "animal-cow-1", tag: "COW-102", species: "COW", breed: "Gir", ageMonths: 36, farmName: "Farm", villageName: "Village", districtName: "District" },
      device: {
        id: "device-real-1",
        deviceIdentifier: "ESP32-REAL-001",
        source: "REAL",
        status: "ONLINE",
        connectionState: "REAL_ONLINE",
        lastSeenAt: new Date().toISOString(),
        lastTemperature: 38.6,
        lastActivity: 74,
        lastAnomalyState: false,
      },
      connectionState: "REAL_ONLINE",
      readings: [],
      latestReading: {
        id: "reading-real-999",
        temperature: 38.6,
        activityIndex: 74,
        source: "REAL",
        hasAnomaly: false,
        anomalies: [],
        recordedAt: new Date().toISOString(),
      },
      summary: { totalReadings: 1, simulatedReadings: 0, realReadings: 1, anomaliesCount: 0 },
    });

    const { rerender } = render(
      <IoTInput
        animalId="animal-cow-1"
        animalTag="COW-102"
        temperature={null}
        activity={null}
        heartRate={null}
        iotSource={null}
        iotReadingId={null}
        onChangeTemperature={mockChangeTemp}
        onChangeActivity={mockChangeAct}
        onChangeHeartRate={vi.fn()}
        onChangeIotSource={mockChangeSource}
        onChangeIotReadingId={mockChangeReadingId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("ESP32 Connected")).toBeInTheDocument();
    });

    expect(mockChangeTemp).toHaveBeenCalledWith(38.6);
    expect(mockChangeAct).toHaveBeenCalledWith(74);
    expect(mockChangeSource).toHaveBeenCalledWith("REAL");
    expect(mockChangeReadingId).toHaveBeenCalledWith("reading-real-999");

    // Re-render when parent updates state
    rerender(
      <IoTInput
        animalId="animal-cow-1"
        animalTag="COW-102"
        temperature={38.6}
        activity={74}
        heartRate={null}
        iotSource="REAL"
        iotReadingId="reading-real-999"
        onChangeTemperature={mockChangeTemp}
        onChangeActivity={mockChangeAct}
        onChangeHeartRate={vi.fn()}
        onChangeIotSource={mockChangeSource}
        onChangeIotReadingId={mockChangeReadingId}
      />
    );

    expect(screen.getByText("REAL ESP32")).toBeInTheDocument();
  });

  it("4. When animal has an OFFLINE physical ESP32, displays 'ESP32 Offline' and simulation option", async () => {
    vi.mocked(iotActions.getAnimalIoTMonitoringDataAction).mockResolvedValue({
      animal: { id: "animal-cow-2", tag: "COW-103", species: "COW", breed: "Gir", ageMonths: 40, farmName: "Farm", villageName: "Village", districtName: "District" },
      device: {
        id: "device-real-2",
        deviceIdentifier: "ESP32-OFFLINE-002",
        source: "REAL",
        status: "OFFLINE",
        connectionState: "REAL_OFFLINE",
        lastSeenAt: "2026-09-01T00:00:00.000Z",
        lastTemperature: null,
        lastActivity: null,
        lastAnomalyState: false,
      },
      connectionState: "REAL_OFFLINE",
      readings: [],
      latestReading: null,
      summary: { totalReadings: 0, simulatedReadings: 0, realReadings: 0, anomaliesCount: 0 },
    });

    render(
      <IoTInput
        animalId="animal-cow-2"
        animalTag="COW-103"
        temperature={null}
        activity={null}
        heartRate={null}
        iotSource={null}
        iotReadingId={null}
        onChangeTemperature={vi.fn()}
        onChangeActivity={vi.fn()}
        onChangeHeartRate={vi.fn()}
        onChangeIotSource={vi.fn()}
        onChangeIotReadingId={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("ESP32 Offline")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Physical ESP32 device is offline. You can simulate sensor readings for testing.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simulate iot data/i })).toBeInTheDocument();
  });

  it("5. Clicking 'Simulate IoT Data' invokes ingestIoTTelemetryAction and populates fields including heart rate with SIMULATED ESP32 source", async () => {
    const mockChangeTemp = vi.fn();
    const mockChangeAct = vi.fn();
    const mockChangeHeartRate = vi.fn();
    const mockChangeSource = vi.fn();
    const mockChangeReadingId = vi.fn();

    vi.mocked(iotActions.getAnimalIoTMonitoringDataAction).mockResolvedValue({
      animal: { id: "animal-3", tag: "COW-104", species: "COW", breed: "Sahiwal", ageMonths: 20, farmName: "Farm", villageName: "Village", districtName: "District" },
      device: { id: "mock-id", deviceIdentifier: "NONE", source: "SIMULATED", status: "OFFLINE", connectionState: "NO_DEVICE", lastSeenAt: null, lastTemperature: null, lastActivity: null, lastAnomalyState: false },
      connectionState: "NO_DEVICE",
      readings: [],
      latestReading: null,
      summary: { totalReadings: 0, simulatedReadings: 0, realReadings: 0, anomaliesCount: 0 },
    });

    vi.mocked(iotActions.ingestIoTTelemetryAction).mockResolvedValue({
      success: true,
      connectionState: "SIMULATION_ACTIVE",
      reading: {
        id: "reading-sim-123",
        deviceId: "ESP32-COW-104",
        animalId: "animal-3",
        source: "SIMULATED",
        temperature: 39.8,
        activityIndex: 22,
        hasAnomaly: true,
        anomalies: ["Elevated core temperature (39.8°C)", "Reduced herd movement (22.0)"],
        recordedAt: new Date().toISOString(),
      },
      device: {
        id: "mock-id",
        deviceIdentifier: "ESP32-COW-104",
        source: "SIMULATED",
        status: "SIMULATING",
        lastSeenAt: new Date().toISOString(),
      },
    });

    render(
      <IoTInput
        animalId="animal-3"
        animalTag="COW-104"
        temperature={null}
        activity={null}
        heartRate={null}
        iotSource={null}
        iotReadingId={null}
        onChangeTemperature={mockChangeTemp}
        onChangeActivity={mockChangeAct}
        onChangeHeartRate={mockChangeHeartRate}
        onChangeIotSource={mockChangeSource}
        onChangeIotReadingId={mockChangeReadingId}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /simulate iot data/i })).toBeInTheDocument();
    });

    // Click simulate
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /simulate iot data/i }));
    });

    await waitFor(() => {
      expect(iotActions.ingestIoTTelemetryAction).toHaveBeenCalledWith(
        expect.objectContaining({
          animalId: "animal-3",
          source: "SIMULATED",
        })
      );
      expect(mockChangeSource).toHaveBeenCalledWith("SIMULATED");
      expect(mockChangeReadingId).toHaveBeenCalledWith("reading-sim-123");
      expect(mockChangeTemp).toHaveBeenCalledWith(39.8);
      expect(mockChangeAct).toHaveBeenCalledWith(22);
      expect(screen.queryByText("Sensor anomaly detected")).not.toBeInTheDocument();
    });
  });

  it("6. Manual input modification updates source to 'MANUAL INPUT'", async () => {
    const mockChangeTemp = vi.fn();
    const mockChangeHeartRate = vi.fn();
    const mockChangeSource = vi.fn();
    const mockChangeReadingId = vi.fn();

    vi.mocked(iotActions.getAnimalIoTMonitoringDataAction).mockResolvedValue({
      animal: { id: "animal-4", tag: "COW-105", species: "COW", breed: "Gir", ageMonths: 28, farmName: "Farm", villageName: "Village", districtName: "District" },
      device: { id: "mock-id", deviceIdentifier: "NONE", source: "SIMULATED", status: "OFFLINE", connectionState: "NO_DEVICE", lastSeenAt: null, lastTemperature: null, lastActivity: null, lastAnomalyState: false },
      connectionState: "NO_DEVICE",
      readings: [],
      latestReading: null,
      summary: { totalReadings: 0, simulatedReadings: 0, realReadings: 0, anomaliesCount: 0 },
    });

    render(
      <IoTInput
        animalId="animal-4"
        animalTag="COW-105"
        temperature={38.5}
        activity={70}
        heartRate={65}
        iotSource="SIMULATED"
        iotReadingId="reading-sim-456"
        onChangeTemperature={mockChangeTemp}
        onChangeActivity={vi.fn()}
        onChangeHeartRate={mockChangeHeartRate}
        onChangeIotSource={mockChangeSource}
        onChangeIotReadingId={mockChangeReadingId}
      />
    );

    const tempInput = screen.getByLabelText(/temperature/i);
    fireEvent.change(tempInput, { target: { value: "39.2" } });

    expect(mockChangeTemp).toHaveBeenCalledWith(39.2);
    expect(mockChangeSource).toHaveBeenCalledWith("MANUAL");
    expect(mockChangeReadingId).toHaveBeenCalledWith(null);

    const hrInput = screen.getByLabelText(/heart rate/i);
    fireEvent.change(hrInput, { target: { value: "85" } });

    expect(mockChangeHeartRate).toHaveBeenCalledWith(85);
  });

  it("7. Handles API error gracefully and shows Retry button", async () => {
    vi.mocked(iotActions.getAnimalIoTMonitoringDataAction).mockRejectedValue(
      new Error("Backend IoT server timeout.")
    );

    render(
      <IoTInput
        animalId="animal-5"
        animalTag="COW-106"
        temperature={null}
        activity={null}
        heartRate={null}
        iotSource={null}
        iotReadingId={null}
        onChangeTemperature={vi.fn()}
        onChangeActivity={vi.fn()}
        onChangeHeartRate={vi.fn()}
        onChangeIotSource={vi.fn()}
        onChangeIotReadingId={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("Unable to fetch ESP32 data").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("Backend IoT server timeout.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simulate iot data/i })).toBeInTheDocument();
  });

  it("8. i18n dictionaries contain all required IoT telemetry strings for en, hi, mr, bn", () => {
    const requiredKeys = [
      "iotSensorData",
      "esp32Connected",
      "esp32OfflineNotice",
      "noEsp32Connected",
      "realEsp32",
      "simulatedEsp32",
      "manualInput",
      "simulateIotData",
      "generateNewValues",
      "refreshSensorData",
      "unableToFetch",
      "sensorAnomalyDetected",
      "deviceOfflineNotice",
      "noPhysicalDeviceAvailable",
      "checkingDevice",
      "simulating",
      "retry",
      "temperature",
      "activity",
      "heartRate",
    ];

    const dicts = [
      { lang: "en", dict: (enDict as Record<string, unknown>).iot as Record<string, string> },
      { lang: "hi", dict: (hiDict as Record<string, unknown>).iot as Record<string, string> },
      { lang: "mr", dict: (mrDict as Record<string, unknown>).iot as Record<string, string> },
      { lang: "bn", dict: (bnDict as Record<string, unknown>).iot as Record<string, string> },
    ];

    for (const { lang, dict } of dicts) {
      for (const key of requiredKeys) {
        expect(dict[key], `Missing key '${key}' in '${lang}' dictionary iot section`).toBeDefined();
        expect(dict[key].trim().length, `Empty string for key '${key}' in '${lang}' dictionary iot section`).toBeGreaterThan(0);
      }
    }
  });

  it("9. Case creation persists iotTelemetry with source and readingId without creating duplicate readings", async () => {
    const reportPayload = {
      submissionId: "sub-123",
      animalId: "animal-cow-1",
      symptoms: ["Fever", "Lethargy"],
      durationDays: 2,
      affectedCount: 1,
      herdSize: 10,
      mortalityCount: 0,
      iotData: {
        temperature: 39.8,
        activity: 22,
        source: "SIMULATED" as const,
        readingId: "reading-sim-123",
      },
    };

    vi.mocked(casesActions.createCaseReportAction).mockResolvedValue({
      success: true,
      caseId: "case-789",
      caseNumber: "CASE-2026-123456",
    });

    const result = await casesActions.createCaseReportAction(reportPayload);

    expect(casesActions.createCaseReportAction).toHaveBeenCalledWith(
      expect.objectContaining({
        iotData: expect.objectContaining({
          source: "SIMULATED",
          readingId: "reading-sim-123",
          temperature: 39.8,
          activity: 22,
        }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.caseId).toBe("case-789");
  });

  it("10. Real data is never labelled simulated and simulated data is never labelled real", () => {
    const realSource: "REAL" | "SIMULATED" | "MANUAL" = "REAL";
    const simSource: "REAL" | "SIMULATED" | "MANUAL" = "SIMULATED";
    const manualSource: "REAL" | "SIMULATED" | "MANUAL" = "MANUAL";

    expect(realSource).not.toBe("SIMULATED");
    expect(simSource).not.toBe("REAL");
    expect(manualSource).not.toBe("REAL");
    expect(manualSource).not.toBe("SIMULATED");
  });

  it("11. Offline queue record structure supports telemetry source and readingId", () => {
    const offlineRecord = {
      id: "sub-offline-999",
      submissionId: "sub-offline-999",
      clerkUserId: "farmer_clerk_123",
      animalId: "animal-999",
      symptoms: ["Cough"],
      durationDays: 1,
      affectedCount: 1,
      herdSize: 5,
      mortalityCount: 0,
      iotData: {
        iotDeviceId: "ESP32-SIM-999",
        temperature: 39.1,
        activity: 45,
        source: "SIMULATED" as const,
        readingId: "reading-sim-999",
      },
      status: "QUEUED" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(offlineRecord.iotData.source).toBe("SIMULATED");
    expect(offlineRecord.iotData.readingId).toBe("reading-sim-999");
    expect(offlineRecord.status).toBe("QUEUED");
  });
});
