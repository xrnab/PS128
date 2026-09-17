import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { IoTInput } from "@/components/reporting/IoTInput";
import { MockESP32Simulator } from "@/components/iot/MockESP32Simulator";
import * as iotActions from "@/lib/actions/iot";
import enDict from "@/lib/i18n/dictionaries/en.json";

// Mock server actions
vi.mock("@/lib/actions/iot", () => ({
  getAnimalIoTMonitoringDataAction: vi.fn(),
  ingestIoTTelemetryAction: vi.fn(),
}));

vi.mock("@/components/layout/LocaleProvider", () => ({
  useLocale: () => ({
    locale: "en",
    dictionary: enDict,
    setLocale: vi.fn(),
  }),
}));

describe("ESP32 Live Hardware Node (MLX90614 + MPU6050) Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default fetch mock for /api/iot/telemetry/ESP32-COW-01
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/iot/telemetry")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              isLive: true,
              telemetry: {
                animal_id: "ESP32-COW-01",
                temperature: 39.15,
                activity: 42,
                activity_index: 42,
                fever_flag: false,
                lethargy_flag: false,
                has_anomaly: false,
                anomalies: [],
                hardware: "ESP32 + MLX90614 + MPU6050",
                received_at: new Date().toISOString(),
              },
            }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. IoTInput renders the 'Live ESP32 (5s)' auto-sync button alongside simulation controls", async () => {
    vi.mocked(iotActions.getAnimalIoTMonitoringDataAction).mockResolvedValue({
      animal: {
        id: "animal-cow-1",
        tag: "COW-01",
        species: "COW",
        breed: "Gir",
        ageMonths: 36,
        farmName: "Farm",
        villageName: "Village",
        districtName: "District",
      },
      device: {
        id: "dev-1",
        deviceIdentifier: "ESP32-COW-01",
        source: "SIMULATED",
        status: "OFFLINE",
        connectionState: "NO_DEVICE",
        lastSeenAt: null,
        lastTemperature: null,
        lastActivity: null,
        lastAnomalyState: false,
      },
      connectionState: "NO_DEVICE",
      readings: [],
      latestReading: null,
      summary: { totalReadings: 0, simulatedReadings: 0, realReadings: 0, anomaliesCount: 0 },
    });

    render(
      <IoTInput
        animalId="animal-cow-1"
        animalTag="COW-01"
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

    // Both the Live ESP32 button and the Simulate IoT Data button exist
    expect(screen.getByTestId("live-esp32-stream-btn")).toBeInTheDocument();
    expect(screen.getByTestId("simulate-iot-btn")).toBeInTheDocument();
  });

  it("2. Activating Live ESP32 stream auto-fetches real telemetry from physical node", async () => {
    const mockChangeTemp = vi.fn();
    const mockChangeAct = vi.fn();
    const mockChangeSource = vi.fn();

    vi.mocked(iotActions.getAnimalIoTMonitoringDataAction).mockResolvedValue({
      animal: {
        id: "animal-cow-1",
        tag: "COW-01",
        species: "COW",
        breed: "Gir",
        ageMonths: 36,
        farmName: "Farm",
        villageName: "Village",
        districtName: "District",
      },
      device: {
        id: "dev-1",
        deviceIdentifier: "ESP32-COW-01",
        source: "SIMULATED",
        status: "OFFLINE",
        connectionState: "NO_DEVICE",
        lastSeenAt: null,
        lastTemperature: null,
        lastActivity: null,
        lastAnomalyState: false,
      },
      connectionState: "NO_DEVICE",
      readings: [],
      latestReading: null,
      summary: { totalReadings: 0, simulatedReadings: 0, realReadings: 0, anomaliesCount: 0 },
    });

    render(
      <IoTInput
        animalId="animal-cow-1"
        animalTag="COW-01"
        temperature={null}
        activity={null}
        heartRate={null}
        iotSource={null}
        iotReadingId={null}
        onChangeTemperature={mockChangeTemp}
        onChangeActivity={mockChangeAct}
        onChangeHeartRate={vi.fn()}
        onChangeIotSource={mockChangeSource}
        onChangeIotReadingId={vi.fn()}
      />
    );

    const liveStreamBtn = screen.getByTestId("live-esp32-stream-btn");
    await act(async () => {
      fireEvent.click(liveStreamBtn);
    });

    await waitFor(() => {
      expect(mockChangeTemp).toHaveBeenCalledWith(39.15);
      expect(mockChangeAct).toHaveBeenCalledWith(42);
      expect(mockChangeSource).toHaveBeenCalledWith("REAL");
    });

    // Verify active streaming announcement banner appears
    expect(screen.getByText(/Live ESP32 Streaming Active/i)).toBeInTheDocument();
  });

  it("3. MockESP32Simulator allows switching to 'Physical ESP32 Node (ESP32-COW-01)' mode", async () => {
    const mockSend = vi.fn().mockResolvedValue({ success: true });

    render(
      <MockESP32Simulator
        animalId="animal-cow-1"
        animalTag="COW-01"
        isSimulating={false}
        onSendTelemetry={mockSend}
      />
    );

    // Initial state: Virtual Simulator is active
    expect(screen.getByText("Virtual ESP32 Simulator")).toBeInTheDocument();
    expect(screen.getByTestId("mode-tab-simulation")).toBeInTheDocument();
    expect(screen.getByTestId("mode-tab-hardware")).toBeInTheDocument();

    // Switch to Physical ESP32 Node
    const hardwareTab = screen.getByTestId("mode-tab-hardware");
    await act(async () => {
      fireEvent.click(hardwareTab);
    });

    // Hardware specifications and live readout are rendered
    expect(screen.getByText("ESP32 Surveillance Node Hardware")).toBeInTheDocument();
    expect(screen.getByText("Adafruit MLX90614")).toBeInTheDocument();
    expect(screen.getByText("Adafruit MPU6050")).toBeInTheDocument();
    expect(screen.getByText(/Danish07/i)).toBeInTheDocument();

    // Click Ingest Live Packet into Animal Ledger
    const ingestBtn = screen.getByRole("button", {
      name: /ingest live packet into animal ledger/i,
    });
    await act(async () => {
      fireEvent.click(ingestBtn);
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "REAL",
      })
    );
  });
});
