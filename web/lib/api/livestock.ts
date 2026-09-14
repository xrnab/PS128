import {
  MasterAnalysisPayload,
  UnifiedAnalysisResponse,
  YoloVisionAnalysis,
} from "@/lib/types/livestock";

const DEFAULT_API_URL = "https://ps128-livestock-api.onrender.com";
const REQUEST_TIMEOUT_MS = 30_000;

export class LivestockApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "LivestockApiError";
    this.status = status;
    this.details = details;
  }
}

export function getApiBaseUrl(): string {
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

  let raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.AI_ENGINE_URL ||
    process.env.BACKEND_URL;

  // On deployed domains or production builds, never try to call localhost over HTTPS
  if (isProduction && (!raw || raw.includes("localhost") || raw.includes("127.0.0.1"))) {
    raw = DEFAULT_API_URL;
  }

  if (!raw) {
    raw = isBrowserLocalhost ? "http://localhost:8000" : DEFAULT_API_URL;
  }

  let url = raw.trim().replace(/\/+$/, "");
  if (url.endsWith("/api")) {
    url = url.slice(0, -4);
  }
  return url;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(status: number, body: unknown, operation: string) {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return "Please check the highlighted form fields.";
  }

  if (status === 422) return "The health report contains invalid or missing values.";
  if (status >= 500) return `${operation} service is temporarily unavailable. Please try again.`;
  return `${operation} failed with HTTP ${status}.`;
}

async function request(url: string, init: RequestInit, operation: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await readResponseBody(response);

    if (!response.ok) {
      throw new LivestockApiError(
        getErrorMessage(response.status, body, operation),
        response.status,
        body,
      );
    }

    return body;
  } catch (error) {
    if (error instanceof LivestockApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new LivestockApiError(`${operation} timed out. Please try again.`, 408);
    }
    throw new LivestockApiError(
      `Unable to reach the livestock analysis service. Please check your connection.`,
      0,
      error,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function isVisionAnalysis(value: unknown): value is YoloVisionAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.visual_anomaly_detected === "boolean" &&
    typeof candidate.primary_prediction === "string" &&
    typeof candidate.confidence === "number"
  );
}

function extractVisionResult(value: unknown): YoloVisionAnalysis | null {
  if (typeof value !== "object" || value === null) return null;

  const response = value as Record<string, unknown>;
  const rawObj = (response.yolo_result || response.data || response) as Record<string, unknown>;

  if (typeof rawObj === "object" && rawObj !== null) {
    const primary = typeof rawObj.primary_prediction === "string" ? rawObj.primary_prediction : undefined;
    const confidence = typeof rawObj.confidence === "number" ? rawObj.confidence : 0;
    const anomaly = typeof rawObj.visual_anomaly_detected === "boolean" ? rawObj.visual_anomaly_detected : false;
    const message = ((rawObj.message as string) || (response.message as string) || undefined);
    const success = typeof rawObj.success === "boolean" ? rawObj.success : typeof response.success === "boolean" ? response.success : true;

    if (primary !== undefined) {
      return {
        visual_anomaly_detected: anomaly,
        primary_prediction: primary,
        confidence,
        message,
        success,
      };
    }
  }

  return null;
}

function normalizeAnalysisResponse(value: unknown): UnifiedAnalysisResponse {
  if (typeof value !== "object" || value === null) {
    throw new LivestockApiError("The analysis service returned an invalid response.", 502, value);
  }

  const response = value as Partial<UnifiedAnalysisResponse>;
  if (
    typeof response.overall_risk_score !== "number" ||
    !response.disease_prediction ||
    !response.farmer_advisory
  ) {
    throw new LivestockApiError("The analysis service returned an incomplete response.", 502, value);
  }

  const level = response.overall_risk_level;
  const overallRiskLevel = level === "LOW" || level === "ELEVATED" || level === "CRITICAL" ? level : "ELEVATED";

  return {
    ...response,
    overall_risk_score: Math.min(100, Math.max(0, response.overall_risk_score)),
    overall_risk_level: overallRiskLevel,
    disease_prediction: response.disease_prediction,
    farmer_advisory: response.farmer_advisory,
  } as UnifiedAnalysisResponse;
}

export async function predictYoloImage(
  file: File,
  category: string,
): Promise<YoloVisionAnalysis | null> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  try {
    const response = await request(
      `${getApiBaseUrl()}/api/predict`,
      { method: "POST", body: formData, headers: { Accept: "application/json" } },
      "Image prediction",
    );
    return extractVisionResult(response);
  } catch (error) {
    console.warn("[Livestock image prediction skipped]", error);
    return null;
  }
}

export async function analyzeLivestockHealth(
  payload: MasterAnalysisPayload,
): Promise<UnifiedAnalysisResponse> {
  const response = await request(
    `${getApiBaseUrl()}/api/analyze`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    },
    "Livestock analysis",
  );

  return normalizeAnalysisResponse(response);
}
