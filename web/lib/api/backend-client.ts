import "server-only";
import {
  AnalyzeResponseSchema,
  VisionResponseSchema,
  HealthCheckResponseSchema,
  IoTDataResponseSchema,
  AnalyzeResponse,
  VisionResponse,
  HealthCheckResponse,
  IoTDataRequest,
  IoTDataResponse,
} from "./schemas";

export class BackendUnavailableError extends Error {
  constructor(message: string = "AI engine backend service is unavailable.") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

export class BackendTimeoutError extends Error {
  constructor(message: string = "AI engine request timed out.") {
    super(message);
    this.name = "BackendTimeoutError";
  }
}

export class BackendValidationError extends Error {
  constructor(message: string = "Invalid backend payload schema.") {
    super(message);
    this.name = "BackendValidationError";
  }
}

export class BackendResponseError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "BackendResponseError";
    this.statusCode = statusCode;
  }
}

export interface HealthReportPayload {
  animal: string;
  symptoms: string[];
  heart_rate?: number | null;
  duration_days?: number;
  affected_count?: number;
  herd_size?: number;
  mortality_count?: number;
}

export interface IoTTelemetryPayload {
  animal_id?: string | null;
  temperature?: number | null;
  activity?: number | null;
  simulate_fever?: boolean;
}

export interface AnalyzeRequestPayload {
  latitude?: number | null;
  longitude?: number | null;
  language?: string;
  health_report?: HealthReportPayload;
  iot_telemetry?: IoTTelemetryPayload;
  yolo_vision_analysis?: Record<string, unknown> | null;
  historical_weekly_cases?: number[];
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds timeout for Render cold starts and multi-stream AI processing

/**
 * Resolves the FastAPI AI Microservice Engine base URL across all supported environment variables.
 * Strips any trailing slashes and ensures no duplicate /api path segments.
 * Never exposes secrets.
 */
export function getBackendBaseUrl(): string {
  const isBrowser = typeof window !== "undefined";
  const isBrowserLocalhost =
    isBrowser &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168."));

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    (isBrowser && !isBrowserLocalhost);

  const defaultUrl = isProduction
    ? "https://ps128-livestock-api.onrender.com"
    : "http://localhost:8000";

  let raw =
    process.env.AI_ENGINE_URL ||
    process.env.FASTAPI_URL ||
    process.env.BACKEND_URL ||
    process.env.AI_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    defaultUrl;

  // On deployed domains or production builds, never try to call localhost over HTTPS
  if (isProduction && (raw.includes("localhost") || raw.includes("127.0.0.1"))) {
    raw = "https://ps128-livestock-api.onrender.com";
  }

  let url = raw.trim().replace(/\/+$/, "");
  if (url.endsWith("/api")) {
    url = url.slice(0, -4);
  }
  return url;
}

/**
 * Logs safe diagnostics (endpoint path, status, content type, byte size, error category)
 * strictly WITHOUT logging API keys, Clerk tokens, cookies, auth headers, or raw image bytes.
 */
export function logSafeBackendDiagnostics(
  operation: string,
  targetUrl: string,
  meta?: {
    status?: number;
    contentType?: string;
    byteSize?: number;
    mimeType?: string;
    errorCategory?: string;
    detail?: string;
  }
) {
  try {
    const parsed = new URL(targetUrl);
    const sanitizedTarget = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    const statusPart = meta?.status !== undefined ? ` | status: ${meta.status}` : "";
    const typePart = meta?.contentType ? ` | content-type: ${meta.contentType}` : "";
    const bytesPart = meta?.byteSize !== undefined ? ` | bytes: ${meta.byteSize}` : "";
    const mimePart = meta?.mimeType ? ` | mime: ${meta.mimeType}` : "";
    const catPart = meta?.errorCategory ? ` | category: ${meta.errorCategory}` : "";
    const detailPart = meta?.detail ? ` | detail: ${meta.detail}` : "";

    console.info(
      `[AI Engine Diagnostics] ${operation} | target: ${sanitizedTarget}${statusPart}${typePart}${bytesPart}${mimePart}${catPart}${detailPart}`
    );
  } catch {
    console.info(`[AI Engine Diagnostics] ${operation} | target: [malformed URL]`);
  }
}

/**
 * Executes fetch with timeout protection.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new BackendTimeoutError(`Request to AI Engine timed out after ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sends health report and telemetry to POST /api/analyze.
 * Retries up to 2 times for transient 5xx errors or network drops.
 */
export async function analyzeCase(payload: AnalyzeRequestPayload): Promise<AnalyzeResponse> {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/analyze`;

  logSafeBackendDiagnostics("Livestock Multi-Stream Analysis Started", endpoint, {
    mimeType: "application/json",
  });

  const requestOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  };

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await fetchWithTimeout(endpoint, requestOptions);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        logSafeBackendDiagnostics("Livestock Multi-Stream Analysis Failed", endpoint, {
          status: response.status,
          errorCategory: String(response.status),
          detail: errText ? errText.slice(0, 150) : "HTTP Error",
        });

        // Do NOT retry 4xx client validation errors
        if (response.status >= 400 && response.status < 500) {
          throw new BackendResponseError(
            `Backend returned HTTP ${response.status}: ${errText}`,
            response.status
          );
        }

        // Retry 5xx if attempts remain
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        throw new BackendResponseError(
          `Backend returned HTTP ${response.status}`,
          response.status
        );
      }

      const rawJson = await response.json();
      logSafeBackendDiagnostics("Livestock Multi-Stream Analysis Succeeded", endpoint, {
        status: response.status,
        contentType: response.headers.get("content-type") || undefined,
      });

      // Runtime schema validation
      const parseResult = AnalyzeResponseSchema.safeParse(rawJson);
      if (!parseResult.success) {
        console.warn("[Backend Analysis Schema Warning]:", parseResult.error.format());
        // Passthrough best effort fallback if core fields present
        return rawJson as AnalyzeResponse;
      }

      return parseResult.data;
    } catch (err: unknown) {
      if (err instanceof BackendResponseError || err instanceof BackendTimeoutError) {
        throw err;
      }
      if (attempts >= maxAttempts) {
        logSafeBackendDiagnostics("Livestock Multi-Stream Analysis Unavailable", endpoint, {
          errorCategory: "unreachable",
          detail: err instanceof Error ? err.message : "Connection failed",
        });
        throw new BackendUnavailableError(
          err instanceof Error ? err.message : "Failed to connect to AI engine."
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new BackendUnavailableError("AI Engine service unreachable.");
}

/**
 * Sends animal clinical photograph to POST /api/predict (YOLO vision engine).
 */
export async function predictAnimalImage(
  imageBuffer: Buffer,
  contentType: string,
  category: string
): Promise<VisionResponse> {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/predict`;
  const sanitizedCategory = category.toLowerCase().trim() || "cow";

  logSafeBackendDiagnostics("YOLO Image Prediction Started", endpoint, {
    byteSize: imageBuffer.length,
    mimeType: contentType,
  });

  const formData = new FormData();
  const uint8 = new Uint8Array(imageBuffer);
  const blob = new Blob([uint8], { type: contentType });
  formData.append("file", blob, "image.jpg");
  formData.append("category", sanitizedCategory);

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      logSafeBackendDiagnostics("YOLO Image Prediction Failed", endpoint, {
        status: response.status,
        errorCategory: String(response.status),
        detail: errText ? errText.slice(0, 150) : "HTTP Error",
      });
      throw new BackendResponseError(
        `Backend /api/predict HTTP ${response.status}: ${errText}`,
        response.status
      );
    }

    logSafeBackendDiagnostics("YOLO Image Prediction Succeeded", endpoint, {
      status: response.status,
      contentType: response.headers.get("content-type") || undefined,
    });

    const rawJson = await response.json();
    const parseResult = VisionResponseSchema.safeParse(rawJson);

    if (!parseResult.success) {
      console.warn("[Backend Vision Schema Warning]:", parseResult.error.format());
      return rawJson as VisionResponse;
    }

    return parseResult.data;
  } catch (err: unknown) {
    if (err instanceof BackendResponseError || err instanceof BackendTimeoutError) {
      throw err;
    }
    logSafeBackendDiagnostics("YOLO Image Prediction Unavailable", endpoint, {
      errorCategory: "unreachable",
      detail: err instanceof Error ? err.message : "Connection failed",
    });
    throw new BackendUnavailableError(
      err instanceof Error ? err.message : "Failed to run visual prediction."
    );
  }
}

/**
 * Checks FastAPI backend health status via GET /api/health.
 */
export async function getBackendHealth(): Promise<HealthCheckResponse> {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/health`;

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
      3000 // 3 seconds health timeout
    );

    if (!response.ok) {
      return { status: "unhealthy", healthy: false };
    }

    const rawJson = await response.json();
    const parseResult = HealthCheckResponseSchema.safeParse(rawJson);
    return parseResult.success ? parseResult.data : { status: "healthy", healthy: true };
  } catch (err) {
    console.warn("[AI Engine Health Check Failed]:", err);
    return { status: "offline", healthy: false };
  }
}

/**
 * Ingests live or simulated IoT telemetry via POST /api/iot/data.
 */
export async function ingestIoTData(payload: IoTDataRequest): Promise<IoTDataResponse> {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/iot/data`;

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
      DEFAULT_TIMEOUT_MS // 30 seconds timeout for Render cold starts
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      logSafeBackendDiagnostics("IoT Telemetry Ingestion Failed", endpoint, {
        status: response.status,
        errorCategory: "http_error",
        detail: errText ? errText.slice(0, 150) : "HTTP Error",
      });
      throw new BackendResponseError(
        `Backend /api/iot/data HTTP ${response.status}: ${errText}`,
        response.status
      );
    }

    const rawJson = await response.json();
    const parseResult = IoTDataResponseSchema.safeParse(rawJson);
    if (!parseResult.success) {
      console.warn("[Backend IoT Schema Warning]:", parseResult.error.format());
      return rawJson as IoTDataResponse;
    }

    return parseResult.data;
  } catch (err: unknown) {
    if (err instanceof BackendTimeoutError) {
      logSafeBackendDiagnostics("IoT Telemetry Ingestion Timed Out", endpoint, {
        errorCategory: "timeout",
        detail: err.message,
      });
      throw err;
    }
    if (err instanceof BackendResponseError) {
      throw err;
    }
    logSafeBackendDiagnostics("IoT Telemetry Ingestion Network Failure", endpoint, {
      errorCategory: "network",
      detail: err instanceof Error ? err.message : "Network failure",
    });
    console.error("[AI Engine IoT Ingestion Error]:", err);
    throw new BackendUnavailableError(
      err instanceof Error ? err.message : "Failed to ingest IoT telemetry."
    );
  }
}

export interface LiveESP32Telemetry {
  animal_id: string;
  temperature: number;
  activity: number;
  activity_index?: number;
  fever_flag: boolean;
  lethargy_flag: boolean;
  has_anomaly: boolean;
  anomalies?: string[];
  hardware?: string;
  received_at: string;
}

/**
 * Retrieves the latest live IoT telemetry reading from the FastAPI backend (GET /api/iot/telemetry/{animal_id}).
 * Compatible with live hardware ESP32 streaming MLX90614 (IR temp) + MPU6050 (activity) packets.
 */
export async function fetchLatestIoTTelemetry(
  animalId: string
): Promise<LiveESP32Telemetry | null> {
  const baseUrl = getBackendBaseUrl();
  const endpoint = `${baseUrl}/api/iot/telemetry/${encodeURIComponent(animalId)}`;

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
      8000 // 8 second timeout
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data?.success && data?.telemetry) {
      return data.telemetry as LiveESP32Telemetry;
    }
    return null;
  } catch (err) {
    console.warn(`[Live IoT Telemetry Fetch Notice]: Failed to reach ${endpoint}:`, err);
    return null;
  }
}

