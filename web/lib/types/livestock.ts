export type RiskLevel = "LOW" | "ELEVATED" | "CRITICAL";

export interface HealthReport {
  animal: string;
  symptoms: string[] | string;
  heart_rate: number;
  duration_days: number;
  affected_count: number;
  herd_size: number;
  mortality_count: number;
}

export interface IoTTelemetry {
  animal_id: string;
  temperature?: number;
  activity?: number;
}

export interface YoloVisionAnalysis {
  visual_anomaly_detected: boolean;
  primary_prediction: string;
  confidence: number;
  message?: string;
  success?: boolean;
}

export interface DiseasePrediction {
  suspected_condition: string;
  confidence: number;
  animal_type?: string;
  vitals_evaluated?: Record<string, number>;
  symptoms_analyzed?: string;
  epidemiology_context?: Record<string, number>;
}

export interface IoTTelemetryAnalysis {
  animal_id?: string;
  temperature?: number | null;
  activity_index?: number | null;
  has_anomaly: boolean;
  anomalies: string[];
}

export interface WeatherAnalysis {
  temperature?: number | null;
  humidity?: number | null;
  precipitation?: number | null;
  vector_breeding_risk: string;
  weather_advisory: string;
  source?: string;
}

export interface OutbreakSurgeAnalysis {
  latest_cases: number;
  historical_mean: number;
  z_score: number;
  is_outbreak_spike: boolean;
}

export interface FarmerAdvisory {
  language: string;
  advisory: string;
  provider_used?: string;
}

export interface MasterAnalysisPayload {
  latitude?: number;
  longitude?: number;
  language: string;
  health_report: HealthReport;
  iot_telemetry?: IoTTelemetry;
  yolo_vision_analysis?: YoloVisionAnalysis | null;
  historical_weekly_cases?: number[];
}

export interface UnifiedAnalysisResponse {
  overall_risk_score: number;
  overall_risk_level: RiskLevel;
  disease_prediction: DiseasePrediction;
  yolo_vision_analysis?: YoloVisionAnalysis | null;
  iot_telemetry_analysis?: IoTTelemetryAnalysis;
  weather_analysis?: WeatherAnalysis;
  outbreak_surge_analysis?: OutbreakSurgeAnalysis;
  farmer_advisory: FarmerAdvisory;
}

export interface UserFormInputs {
  animal: string;
  symptoms: string[] | string;
  heartRate: number;
  durationDays: number;
  affectedCount: number;
  herdSize: number;
  mortalityCount: number;
  animalId: string;
  temperature?: number;
  activity?: number;
  latitude?: number;
  longitude?: number;
  language: string;
  historicalWeeklyCases?: number[];
}
