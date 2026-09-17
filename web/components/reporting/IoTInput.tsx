"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Cpu,
  HeartPulse,
  Thermometer,
  Activity as ActivityIcon,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  WifiOff,
  Radio,
  ChevronDown,
  Zap,
} from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useTranslations } from "next-intl";
import {
  getAnimalIoTMonitoringDataAction,
  ingestIoTTelemetryAction,
  IoTConnectionState,
} from "@/lib/actions/iot";

export interface IoTInputProps {
  animalId?: string;
  animalTag?: string;
  linkedIotDeviceId?: string | null;
  temperature: number | null;
  activity: number | null;
  heartRate: number | null;
  iotSource?: "REAL" | "SIMULATED" | "MANUAL" | null;
  iotReadingId?: string | null;
  onChangeTemperature: (val: number | null) => void;
  onChangeActivity: (val: number | null) => void;
  onChangeHeartRate: (val: number | null) => void;
  onChangeIotSource: (source: "REAL" | "SIMULATED" | "MANUAL" | null) => void;
  onChangeIotReadingId?: (id: string | null) => void;
}

export type SimulationPreset = "NORMAL" | "WARNING" | "CRITICAL";

const SIMULATION_PRESETS: Record<
  SimulationPreset,
  {
    temperature: number;
    activity: number;
    heartRate: number;
    label: string;
    description: string;
    fever: boolean;
  }
> = {
  NORMAL: {
    temperature: 38.6,
    activity: 74,
    heartRate: 68,
    label: "Normal",
    description: "Standard physiological baseline (38.6°C, Act: 74, HR: 68 bpm)",
    fever: false,
  },
  WARNING: {
    temperature: 39.3,
    activity: 38,
    heartRate: 92,
    label: "Warning",
    description: "Mild temperature elevation, declining mobility (39.3°C, Act: 38, HR: 92 bpm)",
    fever: false,
  },
  CRITICAL: {
    temperature: 40.2,
    activity: 18,
    heartRate: 118,
    label: "Critical (Fever / Lethargy)",
    description: "Hyperthermia > 39.5°C & Severe lethargy < 30 (40.2°C, Act: 18, HR: 118 bpm)",
    fever: true,
  },
};

export function IoTInput({
  animalId,
  animalTag,
  linkedIotDeviceId,
  temperature,
  activity,
  heartRate,
  iotSource,
  onChangeTemperature,
  onChangeActivity,
  onChangeHeartRate,
  onChangeIotSource,
  onChangeIotReadingId,
}: IoTInputProps) {
  const { dictionary } = useLocale();
  const t = useTranslations("reporting");
  const iotCopy = dictionary.iot || {};

  // Connection and Device Detection State
  const [checkingDevice, setCheckingDevice] = useState<boolean>(false);
  const [deviceState, setDeviceState] = useState<IoTConnectionState | "CHECKING" | "ERROR">(
    !animalId ? "NO_DEVICE" : "CHECKING"
  );
  const [resolvedDeviceId, setResolvedDeviceId] = useState<string | null>(linkedIotDeviceId || null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Live Physical ESP32 Hardware Streaming State (MLX90614 + MPU6050)
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const [isFetchingLive, setIsFetchingLive] = useState<boolean>(false);

  // Simulation State
  const [selectedPreset, setSelectedPreset] = useState<SimulationPreset>("NORMAL");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [backendAnomalies, setBackendAnomalies] = useState<string[]>([]);
  const [hasAnomaly, setHasAnomaly] = useState<boolean>(false);
  const [showPresetDropdown, setShowPresetDropdown] = useState<boolean>(false);

  // Mounted guard to prevent memory leaks
  const isMountedRef = useRef<boolean>(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch live telemetry from physical ESP32 node (ESP32-COW-01)
  const handleFetchLiveTelemetry = useCallback(async () => {
    setIsFetchingLive(true);
    setSimulationError(null);
    try {
      const targetId = resolvedDeviceId || (animalTag ? `ESP32-${animalTag}` : "ESP32-COW-01");
      const res = await fetch(`/api/iot/telemetry/${encodeURIComponent(targetId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.telemetry) {
          const tel = data.telemetry;
          onChangeTemperature(tel.temperature);
          onChangeActivity(tel.activity ?? tel.activity_index ?? null);
          onChangeIotSource("REAL");
          setHasAnomaly(Boolean(tel.has_anomaly));
          setBackendAnomalies(tel.anomalies || []);
          setDeviceState("REAL_ONLINE");
          setResolvedDeviceId(tel.animal_id || targetId);
          const timeStr = tel.received_at
            ? new Date(tel.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setLastUpdated(timeStr);
        }
      }
    } catch (err) {
      console.warn("[Live Telemetry Sync Warning]:", err);
    } finally {
      if (isMountedRef.current) {
        setIsFetchingLive(false);
      }
    }
  }, [resolvedDeviceId, animalTag, onChangeTemperature, onChangeActivity, onChangeIotSource]);

  // Real-time 5-second polling loop matching ESP32 firmware TRANSMIT_INTERVAL_MS = 5000
  useEffect(() => {
    if (!isLiveStreaming) return;
    handleFetchLiveTelemetry();
    const timer = setInterval(() => {
      handleFetchLiveTelemetry();
    }, 5000);
    return () => clearInterval(timer);
  }, [isLiveStreaming, handleFetchLiveTelemetry]);

  // Check physical device connection when animal changes or user refreshes
  const checkDeviceConnection = useCallback(
    async (isRefresh: boolean = false) => {
      if (!animalId) {
        setDeviceState("NO_DEVICE");
        return;
      }

      setCheckingDevice(true);
      setSimulationError(null);
      setFetchError(null);

      try {
        const data = await getAnimalIoTMonitoringDataAction(animalId);
        if (!isMountedRef.current) return;

        setResolvedDeviceId(data.device.deviceIdentifier || linkedIotDeviceId || null);
        const connection = data.connectionState;
        setDeviceState(connection);

        if (connection === "REAL_ONLINE") {
          // REAL ESP32 connected: Auto-populate with live telemetry
          const liveTemp =
            data.device.lastTemperature ??
            data.latestReading?.temperature ??
            null;
          const liveAct =
            data.device.lastActivity ??
            data.latestReading?.activityIndex ??
            null;

          if (liveTemp !== null || liveAct !== null) {
            onChangeTemperature(liveTemp);
            onChangeActivity(liveAct);
            onChangeIotSource("REAL");
            if (data.latestReading?.id) {
              onChangeIotReadingId?.(data.latestReading.id);
            }
            if (data.latestReading?.hasAnomaly) {
              setHasAnomaly(true);
              setBackendAnomalies(data.latestReading.anomalies || []);
            } else {
              setHasAnomaly(false);
              setBackendAnomalies([]);
            }
          }

          const timestampStr = data.device.lastSeenAt
            ? new Date(data.device.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setLastUpdated(timestampStr);
        } else {
          // Real device offline or no device: do not fake real values
          if (iotSource === "REAL" && !isRefresh) {
            onChangeIotSource(null);
          }
        }
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        const errMsg = err instanceof Error ? err.message : "Unable to fetch ESP32 status";
        console.warn("[IoTInput Device Check Warning]:", errMsg);
        setDeviceState("ERROR");
        setFetchError(errMsg);
      } finally {
        if (isMountedRef.current) {
          setCheckingDevice(false);
        }
      }
    },
    [animalId, linkedIotDeviceId, iotSource, onChangeTemperature, onChangeActivity, onChangeIotSource, onChangeIotReadingId]
  );

  useEffect(() => {
    let ignore = false;
    if (!animalId) {
      return;
    }

    getAnimalIoTMonitoringDataAction(animalId)
      .then((data) => {
        if (ignore) return;
        setResolvedDeviceId(data.device.deviceIdentifier || linkedIotDeviceId || null);
        const connection = data.connectionState;
        setDeviceState(connection);

        if (connection === "REAL_ONLINE") {
          const liveTemp =
            data.device.lastTemperature ??
            data.latestReading?.temperature ??
            null;
          const liveAct =
            data.device.lastActivity ??
            data.latestReading?.activityIndex ??
            null;

          if (liveTemp !== null || liveAct !== null) {
            onChangeTemperature(liveTemp);
            onChangeActivity(liveAct);
            onChangeIotSource("REAL");
            if (data.latestReading?.id) {
              onChangeIotReadingId?.(data.latestReading.id);
            }
            if (data.latestReading?.hasAnomaly) {
              setHasAnomaly(true);
              setBackendAnomalies(data.latestReading.anomalies || []);
            } else {
              setHasAnomaly(false);
              setBackendAnomalies([]);
            }
          }

          const timestampStr = data.device.lastSeenAt
            ? new Date(data.device.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setLastUpdated(timestampStr);
        } else {
          if (iotSource === "REAL") {
            onChangeIotSource(null);
          }
        }
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const errMsg = err instanceof Error ? err.message : "Unable to fetch ESP32 status";
        console.warn("[IoTInput Device Check Warning]:", errMsg);
        setDeviceState("ERROR");
        setFetchError(errMsg);
      })
      .finally(() => {
        if (!ignore) {
          setCheckingDevice(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [animalId, linkedIotDeviceId, iotSource, onChangeTemperature, onChangeActivity, onChangeIotSource, onChangeIotReadingId]);

  // Handle Simulation Trigger via Unified FastAPI Pipeline
  const handleSimulateIoT = async (presetOverride?: SimulationPreset) => {
    if (!animalId) return;

    const presetKey = presetOverride || selectedPreset;
    const preset = SIMULATION_PRESETS[presetKey];

    setIsSimulating(true);
    setSimulationError(null);

    try {
      // Send through the authoritative IoT pipeline
      const result = await ingestIoTTelemetryAction({
        animalId,
        source: "SIMULATED",
        useSimulation: true,
        temperature: preset.temperature,
        activity: preset.activity,
        simulateFever: preset.fever,
      });

      if (!isMountedRef.current) return;

      if (!result.success || !result.reading) {
        setSimulationError(result.error || iotCopy.transmissionFailed || "Simulation failed. Please try again.");
        return;
      }

      // Populate input fields with backend-processed telemetry & simulated heart rate
      onChangeTemperature(result.reading.temperature);
      onChangeActivity(result.reading.activityIndex);
      onChangeHeartRate(preset.heartRate);
      onChangeIotSource("SIMULATED");
      onChangeIotReadingId?.(result.reading.id);

      setHasAnomaly(result.reading.hasAnomaly);
      setBackendAnomalies(result.reading.anomalies || []);
      setLastUpdated("Just now");
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setSimulationError(err instanceof Error ? err.message : "Failed to simulate IoT telemetry.");
    } finally {
      if (isMountedRef.current) {
        setIsSimulating(false);
      }
    }
  };

  // Handle manual input modification
  const handleManualTempChange = (val: string) => {
    const parsed = val ? parseFloat(val) : null;
    onChangeTemperature(parsed);
    if (val) {
      onChangeIotSource("MANUAL");
      onChangeIotReadingId?.(null);
    } else if (activity === null && heartRate === null) {
      onChangeIotSource(null);
    }
  };

  const handleManualActivityChange = (val: string) => {
    const parsed = val ? parseInt(val, 10) : null;
    onChangeActivity(parsed);
    if (val) {
      onChangeIotSource("MANUAL");
      onChangeIotReadingId?.(null);
    } else if (temperature === null && heartRate === null) {
      onChangeIotSource(null);
    }
  };

  const handleManualHeartRateChange = (val: string) => {
    const parsed = val ? parseInt(val, 10) : null;
    onChangeHeartRate(parsed);
    if (val) {
      onChangeIotSource("MANUAL");
      onChangeIotReadingId?.(null);
    } else if (temperature === null && activity === null) {
      onChangeIotSource(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Device Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <Cpu className="h-4 w-4 text-emerald-700" />
          <span>{iotCopy.iotSensorData || "IoT Sensor Data"}</span>
        </label>

        {/* Dynamic Device Status Badge */}
        <div className="flex items-center gap-2">
          {checkingDevice ? (
            <Badge variant="outline" className="text-[10px] bg-stone-50 text-stone-600 border-stone-200 gap-1 py-0.5">
              <RefreshCw className="h-3 w-3 animate-spin text-stone-500" />
              <span>{iotCopy.checkingDevice || "Checking ESP32 connection..."}</span>
            </Badge>
          ) : deviceState === "REAL_ONLINE" ? (
            <Badge className="bg-emerald-600 text-white border-emerald-500 text-[10px] gap-1 px-2.5 py-0.5 shadow-2xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span>{iotCopy.esp32Connected || "ESP32 Connected"}</span>
            </Badge>
          ) : deviceState === "REAL_OFFLINE" ? (
            <Badge variant="outline" className="bg-stone-100 text-stone-700 border-stone-300 text-[10px] gap-1 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-stone-400" />
              <span>{iotCopy.esp32OfflineNotice || "ESP32 Offline"}</span>
            </Badge>
          ) : deviceState === "ERROR" ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] gap-1 px-2 py-0.5">
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <span>{iotCopy.unableToFetch || "Unable to fetch ESP32 data"}</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-stone-50 text-stone-500 border-stone-200 text-[10px] gap-1 px-2 py-0.5">
              <WifiOff className="h-3 w-3 text-stone-400" />
              <span>{iotCopy.noEsp32Connected || "No ESP32 Connected"}</span>
            </Badge>
          )}

          {/* Active Data Source Badge */}
          {iotSource === "REAL" && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold px-2 py-0.5">
              {iotCopy.realEsp32 || "REAL ESP32"}
            </Badge>
          )}
          {iotSource === "SIMULATED" && (
            <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-bold px-2 py-0.5">
              {iotCopy.simulatedEsp32 || "SIMULATED ESP32"}
            </Badge>
          )}
          {iotSource === "MANUAL" && (
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold px-2 py-0.5">
              {iotCopy.manualInput || "MANUAL INPUT"}
            </Badge>
          )}
        </div>
      </div>

      {/* Device State Announcement Banner & Action Bar */}
      {deviceState === "REAL_ONLINE" ? (
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{t("physicalEsp32Online")}</span>
            </div>
            <p className="text-[11px] text-emerald-800/90 pl-6">
              Device <span className="font-mono font-semibold">{resolvedDeviceId || `ESP32-${animalTag}`}</span> is active. Live biometric sensor telemetry auto-filled below.
              {lastUpdated && <span className="ml-1 text-emerald-700">({iotCopy.lastUpdated || "Last updated"}: {lastUpdated})</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const next = !isLiveStreaming;
                setIsLiveStreaming(next);
                if (next) {
                  handleFetchLiveTelemetry();
                }
              }}
              className={`h-8 text-xs rounded-xl cursor-pointer gap-1.5 shadow-2xs font-semibold ${
                isLiveStreaming
                  ? "border-emerald-500 bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              <Radio className={`h-3 w-3 ${isLiveStreaming ? "text-white animate-pulse" : "text-emerald-600"}`} />
              <span>{isLiveStreaming ? "Live 5s Active" : "Auto-Sync 5s"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={checkingDevice}
              onClick={() => checkDeviceConnection(true)}
              className="h-8 text-xs border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl cursor-pointer gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`h-3 w-3 ${checkingDevice ? "animate-spin" : ""}`} />
              <span>{iotCopy.refreshSensorData || "Refresh Sensor Data"}</span>
            </Button>
          </div>
        </div>
      ) : deviceState === "ERROR" ? (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-semibold text-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{iotCopy.unableToFetch || "Unable to fetch ESP32 data"}</span>
            </div>
            <p className="text-[11px] text-amber-800 pl-6">
              {fetchError || iotCopy.deviceOfflineNotice || "Could not retrieve live ESP32 status. You can retry or simulate IoT data."}
            </p>
          </div>
          <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => checkDeviceConnection(true)}
              disabled={checkingDevice}
              className="h-8 text-xs border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-xl cursor-pointer gap-1 shadow-2xs"
            >
              <RefreshCw className={`h-3 w-3 ${checkingDevice ? "animate-spin" : ""}`} />
              <span>{iotCopy.retry || "Retry"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSimulateIoT()}
              disabled={isSimulating}
              className="h-8 text-xs border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100 rounded-xl cursor-pointer gap-1.5 font-medium shadow-2xs"
            >
              <Zap className="h-3.5 w-3.5 text-purple-600" />
              <span>{iotCopy.simulateIotData || "Simulate IoT Data"}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] text-stone-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-semibold text-stone-800">
              {deviceState === "REAL_OFFLINE" ? (
                <>
                  <WifiOff className="h-4 w-4 text-stone-500" />
                  <span>{iotCopy.deviceOfflineNotice || "Physical ESP32 device is offline. You can simulate sensor readings for testing."}</span>
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4 text-stone-400" />
                  <span>{iotCopy.noPhysicalDeviceAvailable || "No physical ESP32 device is currently available for this animal."}</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-stone-500 pl-6">
              {t("virtualIotDesc")}
            </p>
          </div>

          {/* Action Buttons: Live ESP32 Hardware + Simulation */}
          <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0 flex-wrap">
            {/* Live ESP32 Auto-Sync (5s) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetchingLive}
              onClick={() => {
                const next = !isLiveStreaming;
                setIsLiveStreaming(next);
                if (next) {
                  handleFetchLiveTelemetry();
                }
              }}
              data-testid="live-esp32-stream-btn"
              className={`h-8 text-xs rounded-xl cursor-pointer gap-1.5 shadow-2xs font-semibold ${
                isLiveStreaming
                  ? "border-emerald-500 bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
              }`}
              title="Connects to live physical ESP32 node (ESP32-COW-01) with MLX90614 + MPU6050 and auto-fetches every 5s"
            >
              <Radio className={`h-3 w-3 ${isLiveStreaming ? "text-white animate-pulse" : "text-emerald-700"}`} />
              <span>{isLiveStreaming ? "Live ESP32 (5s Active)" : "Live ESP32 (5s)"}</span>
            </Button>

            {deviceState === "REAL_OFFLINE" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={checkingDevice}
                onClick={() => checkDeviceConnection(true)}
                className="h-8 text-xs border-stone-300 bg-white text-stone-700 hover:bg-stone-50 rounded-xl cursor-pointer gap-1 shadow-2xs"
              >
                <RefreshCw className={`h-3 w-3 ${checkingDevice ? "animate-spin" : ""}`} />
                <span>{iotCopy.retry || "Retry"}</span>
              </Button>
            )}

            <div className="relative flex items-center">
              <Button
                type="button"
                size="sm"
                disabled={isSimulating}
                onClick={() => handleSimulateIoT()}
                data-testid="simulate-iot-btn"
                className="h-8 text-xs bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-l-xl rounded-r-none gap-1.5 shadow-2xs cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>{iotCopy.simulating || "Simulating..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{iotSource === "SIMULATED" ? (iotCopy.generateNewValues || "Generate New Values") : (iotCopy.simulateIotData || "Simulate IoT Data")}</span>
                  </>
                )}
              </Button>

              <button
                type="button"
                disabled={isSimulating}
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                className="h-8 px-2 bg-purple-800 hover:bg-purple-900 text-white rounded-r-xl border-l border-purple-600 flex items-center justify-center cursor-pointer transition-colors"
                title={t("selectPresetTitle")}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {/* Preset Selector Dropdown */}
              {showPresetDropdown && (
                <div className="absolute right-0 top-10 z-20 w-64 p-2 bg-white rounded-2xl shadow-xl border border-stone-200 text-xs space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    {t("selectBiometricPreset")}
                  </div>
                  {(["NORMAL", "WARNING", "CRITICAL"] as SimulationPreset[]).map((presetKey) => (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(presetKey);
                        setShowPresetDropdown(false);
                        handleSimulateIoT(presetKey);
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-colors flex flex-col gap-0.5 ${
                        selectedPreset === presetKey ? "bg-purple-50 text-purple-900 font-semibold" : "hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs">{SIMULATION_PRESETS[presetKey].label}</span>
                        <span className="font-mono text-[10px] text-stone-500">{SIMULATION_PRESETS[presetKey].temperature}°C</span>
                      </div>
                      <span className="text-[10px] text-stone-500">{SIMULATION_PRESETS[presetKey].description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Live ESP32 Hardware Streaming Readout */}
      {isLiveStreaming && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <div>
              <span className="font-bold text-emerald-900">
                Live ESP32 Streaming Active:
              </span>{" "}
              <span className="text-[11px] text-emerald-800">
                Auto-fetching from <span className="font-mono font-semibold">{resolvedDeviceId || "ESP32-COW-01"}</span> (Adafruit MLX90614 IR Temp + MPU6050 Motion) every 5s.
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleFetchLiveTelemetry()}
            disabled={isFetchingLive}
            className="h-7 text-xs text-emerald-800 hover:bg-emerald-100 rounded-lg px-2.5 shrink-0"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isFetchingLive ? "animate-spin" : ""}`} />
            <span>Sync Now</span>
          </Button>
        </div>
      )}

      {/* Simulation Error Alert */}
      {simulationError && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{simulationError}</span>
        </div>
      )}

      {/* Backend Anomaly Observation Banner */}
      {hasAnomaly && backendAnomalies.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 text-xs space-y-1.5 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <span>{iotCopy.sensorAnomalyDetected || "Sensor anomaly detected"}</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900/90 pl-1 font-medium">
            {backendAnomalies.map((anomaly, idx) => (
              <li key={idx}>{anomaly}</li>
            ))}
          </ul>
          <p className="text-[10px] text-amber-800 italic pt-0.5">
            {iotCopy.vetReviewNote || "Clinical observation only. Veterinary examination recommended."}
          </p>
        </div>
      )}

      {/* Vitals Input Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] shadow-2xs">
        {/* Core Temperature */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="temp" className="text-xs text-stone-700 font-bold flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-rose-600" />
              <span>{iotCopy.temperature || "Core Temperature (°C)"}</span>
            </Label>
            {temperature !== null && (
              <span className="text-[10px] text-stone-500 font-mono">
                {iotSource === "REAL" ? "Live MLX90614" : iotSource === "SIMULATED" ? "Simulated" : "Manual"}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="temp"
              data-testid="iot-temperature-input"
              type="number"
              step="0.1"
              min="25"
              max="45"
              placeholder="e.g. 38.6 or 40.2"
              value={temperature !== null ? temperature : ""}
              onChange={(e) => handleManualTempChange(e.target.value)}
              className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl font-mono pr-8"
            />
            <span className="absolute right-3 top-2.5 text-[11px] text-stone-400 font-mono">°C</span>
          </div>
        </div>

        {/* Activity Index */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="act" className="text-xs text-stone-700 font-bold flex items-center gap-1">
              <ActivityIcon className="h-3.5 w-3.5 text-emerald-700" />
              <span>{iotCopy.activity || "Activity Index (0-150)"}</span>
            </Label>
            {activity !== null && (
              <span className="text-[10px] text-stone-500 font-mono">
                {iotSource === "REAL" ? "Live MPU6050" : activity < 30 ? "Low" : activity > 85 ? "High" : "Normal"}
              </span>
            )}
          </div>
          <Input
            id="act"
            data-testid="iot-activity-input"
            type="number"
            step="1"
            min="0"
            max="150"
            placeholder="e.g. 22 (low) to 75"
            value={activity !== null ? activity : ""}
            onChange={(e) => handleManualActivityChange(e.target.value)}
            className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl font-mono"
          />
        </div>

        {/* Heart Rate */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="hr" className="text-xs text-stone-700 font-bold flex items-center gap-1">
              <HeartPulse className="h-3.5 w-3.5 text-amber-700" />
              <span>{iotCopy.heartRate || "Heart Rate (BPM)"}</span>
            </Label>
            {heartRate !== null ? (
              <span className="text-[10px] text-stone-500 font-mono">
                {iotSource === "REAL" ? "Live ESP32" : iotSource === "SIMULATED" ? "Simulated" : "Manual"}
              </span>
            ) : (
              <span className="text-[10px] text-stone-400 font-mono">Optional</span>
            )}
          </div>
          <div className="relative">
            <Input
              id="hr"
              data-testid="iot-heartrate-input"
              type="number"
              step="1"
              min="30"
              max="220"
              placeholder="e.g. 68 (normal) to 118"
              value={heartRate !== null ? heartRate : ""}
              onChange={(e) => handleManualHeartRateChange(e.target.value)}
              className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl font-mono pr-12"
            />
            <span className="absolute right-3 top-2.5 text-[11px] text-stone-400 font-mono">BPM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
