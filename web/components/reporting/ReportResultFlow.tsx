"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { PrintableAnimalOption } from "@/lib/actions/reporting_data";
import { CaseReportResult } from "@/lib/actions/cases";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";
import type { YoloVisionAnalysis } from "@/lib/types/livestock";
import { Button } from "@/components/ui/button";
import { formatDoctorName } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Stethoscope,
  Sparkles,
  Activity,
  CloudSun,
  TrendingUp,
  Camera,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  History,
  FilePlus,
  ArrowRight,
  Eye,
  Info,
} from "lucide-react";

interface ReportResultFlowProps {
  submitResult: CaseReportResult & { submissionId?: string };
  selectedAnimal: PrintableAnimalOption | null;
  symptoms: string[];
  durationDays?: number;
  temperature?: number | null;
  activity?: number | null;
  heartRate?: number | null;
  photoUrl?: string | null;
  yoloVisionResult?: YoloVisionAnalysis | null;
  aiState?: {
    analysisResult?: Record<string, unknown> | null;
    visionResult?: Record<string, unknown> | null;
  } | null;
  onReset: () => void;
  mode?: "farmer" | "agent";
}

export function ReportResultFlow({
  submitResult,
  selectedAnimal,
  symptoms,
  durationDays = 1,
  temperature,
  activity,
  heartRate,
  photoUrl,
  yoloVisionResult: initialYoloResult,
  aiState: initialAiState,
  onReset,
  mode = "farmer",
}: ReportResultFlowProps) {
  const [aiState, setAiState] = useState(initialAiState || null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [, startTransition] = useTransition();

  const assignedVet = submitResult.assignedVeterinarian;
  const assignmentLevel = submitResult.assignmentLevel;
  const location = submitResult.location;

  // Sync state if parent props change
  useEffect(() => {
    if (initialAiState?.analysisResult) {
      setAiState(initialAiState);
    }
  }, [initialAiState]);

  // Automatic trigger on mount if no analysis is present yet
  useEffect(() => {
    if (!aiState?.analysisResult && submitResult.caseId && !analyzing) {
      handleRunAnalysis();
    }
  }, [submitResult.caseId]);

  const handleRunAnalysis = async () => {
    if (!submitResult.caseId) return;
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const res = await runCaseAnalysisAction(submitResult.caseId);
      if (res.success) {
        startTransition(() => {
          setAiState({
            analysisResult: (res.analysisResult as Record<string, unknown>) || null,
            visionResult: (res.visionResult as Record<string, unknown>) || null,
          });
        });
      } else {
        setAnalysisError(res.error || "Unable to complete AI analysis.");
      }
    } catch {
      setAnalysisError("Could not connect to the analysis engine.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Real analysis outputs
  const analysis = aiState?.analysisResult;
  const hasAnalysis = Boolean(analysis && typeof analysis === "object");
  const rawScore = Number(analysis?.overall_risk_score ?? 0);
  const riskScore = Math.min(100, Math.max(0, rawScore));
  const rawLevel = String(analysis?.overall_risk_level || "ELEVATED").toUpperCase();
  const riskLevel =
    rawLevel === "CRITICAL" || rawLevel === "HIGH"
      ? "HIGH"
      : rawLevel === "LOW"
      ? "LOW"
      : "ELEVATED";

  const diseasePrediction = analysis?.disease_prediction as Record<string, unknown> | null;
  const suspectedCondition = diseasePrediction?.suspected_condition
    ? String(diseasePrediction.suspected_condition)
    : null;
  const predictionConfidence = Number(diseasePrediction?.confidence ?? 0);

  // Vision signals
  const vision = (aiState?.visionResult || initialYoloResult) as Record<string, unknown> | null;
  const visionAnomaly = Boolean(vision?.visual_anomaly_detected);
  const rawPrediction = String(vision?.primary_prediction || "");
  const cleanPrediction = rawPrediction.replace(/[-_]/g, " ");
  const isVisionHealthyOrNone =
    !visionAnomaly ||
    !rawPrediction ||
    rawPrediction.toLowerCase() === "healthy" ||
    rawPrediction.toLowerCase() === "none" ||
    rawPrediction.toLowerCase() === "none detected";

  const rawVisionConf = Number(vision?.confidence ?? 0);
  const visionConfidence =
    rawVisionConf > 1 ? Math.round(rawVisionConf) : Math.round(rawVisionConf * 100);

  // Auxiliary signals from real API
  const iotSignals = analysis?.iot_telemetry_analysis as Record<string, unknown> | null;
  const weatherSignals = analysis?.weather_analysis as Record<string, unknown> | null;
  const outbreakSignals = analysis?.outbreak_surge_analysis as Record<string, unknown> | null;
  const farmerAdvisory = analysis?.farmer_advisory as { advisory?: string } | null;

  // Real temperature and activity resolution (from IoT input or analysis)
  const currentTemp =
    temperature ?? (iotSignals?.temperature != null ? Number(iotSignals.temperature) : null);
  const currentActivity =
    activity ?? (iotSignals?.activity_index != null ? Number(iotSignals.activity_index) : null);
  const hasIot = currentTemp != null || currentActivity != null;
  const iotAnomaly = Boolean(
    iotSignals?.has_anomaly ||
      (currentTemp != null && currentTemp > 39.5) ||
      (currentActivity != null && currentActivity < 30)
  );

  // Weather real metrics
  const weatherTemp =
    weatherSignals?.temperature != null ? Number(weatherSignals.temperature) : null;
  const weatherHumidity =
    weatherSignals?.humidity != null ? Number(weatherSignals.humidity) : null;
  const weatherRisk = weatherSignals?.vector_breeding_risk
    ? String(weatherSignals.vector_breeding_risk).toUpperCase()
    : null;
  const hasWeather = weatherTemp != null || weatherHumidity != null || weatherRisk != null;

  // Local trend real metrics
  const latestCases =
    outbreakSignals?.latest_cases != null ? Number(outbreakSignals.latest_cases) : null;
  const isSpike = Boolean(outbreakSignals?.is_outbreak_spike);
  const hasTrend = latestCases != null;

  // Contributing signals resolution (for requirement 10: resolving signal contradictions)
  const symptomsSeverity =
    symptoms.some((s) => /fever|severe|blister|lesion|ulcer|खून|ताप/i.test(s)) || durationDays > 3
      ? "Elevated"
      : symptoms.length > 0
      ? "Mild"
      : "Low";

  const iotStatusLabel = !hasIot
    ? "Unavailable"
    : iotAnomaly
    ? "Abnormal"
    : "Normal";

  const weatherStatusLabel = !hasWeather
    ? "Unavailable"
    : weatherRisk === "HIGH"
    ? "High"
    : weatherRisk === "MODERATE"
    ? "Moderate"
    : "Low";

  const trendStatusLabel = !hasTrend
    ? "Unavailable"
    : isSpike
    ? "Elevated Cluster"
    : (Number(outbreakSignals?.z_score ?? 0) >= 1.5)
    ? "Elevated"
    : "Baseline";

  // Check if signals diverge from overall score
  const isDivergent =
    (riskLevel === "LOW" && (weatherStatusLabel === "High" || trendStatusLabel.includes("Elevated"))) ||
    (riskLevel === "HIGH" && symptomsSeverity === "Low" && !iotAnomaly);

  // Synthesize transparent "Why?" factors from real signals
  const contributingFactors: string[] = [];
  if (currentTemp != null && currentTemp >= 39.5) {
    contributingFactors.push(`Fever recorded (Core temp: ${currentTemp.toFixed(1)}°C)`);
  } else if (symptoms.some((s) => /fever|ताप|तापमान/i.test(s))) {
    contributingFactors.push("Fever reported in clinical symptoms");
  }

  if (isSpike || Number(outbreakSignals?.z_score ?? 0) >= 1.5) {
    contributingFactors.push(
      `Recent local case increase${latestCases != null ? ` (${latestCases} cases in district)` : ""}`
    );
  }

  if (weatherRisk === "HIGH") {
    contributingFactors.push(
      `Environmental risk elevated (${weatherTemp != null ? `${weatherTemp}°C` : "warm"}, ${
        weatherHumidity != null ? `${weatherHumidity}% humidity` : "humid"
      })`
    );
  }

  if (iotAnomaly) {
    contributingFactors.push(
      `IoT activity abnormal${currentActivity != null ? ` (Movement index: ${currentActivity}/100)` : ""}`
    );
  }

  if (visionAnomaly && rawPrediction && !rawPrediction.startsWith("Rejected") && !isVisionHealthyOrNone) {
    contributingFactors.push(`Visual lesion signature noted (${cleanPrediction})`);
  }

  if (symptoms.length > 0 && contributingFactors.length < 3) {
    contributingFactors.push(`Observed clinical indicators: ${symptoms.slice(0, 3).join(", ")}`);
  }

  if (contributingFactors.length === 0) {
    contributingFactors.push("Baseline clinical indicators evaluated across reported symptoms and vitals.");
  }

  // Dynamic Liquid Ledger glow according to risk level
  const heroGlowClass = !hasAnalysis
    ? "shadow-[0_16px_40px_rgba(30,58,43,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] border-[#1E3A2B]/15"
    : riskLevel === "HIGH"
    ? "shadow-[0_16px_40px_rgba(30,58,43,0.12),0_0_36px_rgba(193,98,45,0.22),inset_0_1px_0_rgba(255,255,255,0.7)] border-[#C1622D]/35"
    : riskLevel === "ELEVATED"
    ? "shadow-[0_16px_40px_rgba(30,58,43,0.12),0_0_32px_rgba(217,164,65,0.20),inset_0_1px_0_rgba(255,255,255,0.7)] border-[#D9A441]/40"
    : "shadow-[0_16px_40px_rgba(30,58,43,0.12),0_0_28px_rgba(63,107,74,0.18),inset_0_1px_0_rgba(255,255,255,0.7)] border-emerald-300/50";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E3A2B]/8 via-[#3F6B4A]/5 to-[#D9A441]/10 p-4 sm:p-8 space-y-6 sm:space-y-8 text-[#1D1C14] max-w-3xl mx-auto transition-all">
      {/* Ambient diffuse light pools */}
      <div className="absolute -top-12 right-1/4 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-[#3F6B4A]/12 blur-[90px] pointer-events-none" />
      <div className="absolute top-1/2 -left-12 w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-[#D9A441]/12 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-64 h-64 rounded-full bg-[#1E3A2B]/10 blur-[75px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. TOP REPORT HEADER (Liquid Glass Surface)                                */}
      {/* ========================================================================= */}
      <div className="relative z-10 rounded-3xl bg-[#F4EEE1]/85 backdrop-blur-xl border border-white/70 p-6 sm:p-8 text-center space-y-4 shadow-[0_12px_32px_rgba(30,58,43,0.10),0_4px_10px_rgba(30,58,43,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-300/80 text-emerald-950 text-xs font-bold tracking-wide shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>HEALTH REPORT SUBMITTED</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-black font-display text-[#1E3A2B] tracking-tight">
            Case #{submitResult.caseNumber || "CASE-2026"}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A3324]/80 mt-1 font-semibold">
            Animal: {selectedAnimal?.species || "Livestock"} #{selectedAnimal?.tag || "TAG-001"}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9A441]/20 border border-[#D9A441]/40 text-[#8F6612] text-[11px] font-bold uppercase tracking-wider">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {submitResult.status === "PENDING_REVIEW"
              ? "PENDING VETERINARIAN REVIEW"
              : submitResult.status || "PENDING VETERINARIAN REVIEW"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CASE CONTEXT (Location & Veterinarian Assigned)                          */}
      {/* ========================================================================= */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location Group */}
        <div className="rounded-2xl bg-white/75 backdrop-blur-lg border border-white/80 p-4 space-y-2.5 shadow-[0_6px_20px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]">
          <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            <span>LOCATION</span>
          </span>
          <div className="grid grid-cols-3 gap-2 pt-0.5 text-xs">
            <div className="rounded-xl bg-[#F4EEE1]/60 p-2 border border-white/60">
              <span className="text-[10px] text-stone-500 block font-medium">Village</span>
              <strong className="text-[#1E3A2B] font-bold text-xs truncate block">
                {location?.villageName || selectedAnimal?.villageName || "Bidhannagar"}
              </strong>
            </div>
            <div className="rounded-xl bg-[#F4EEE1]/60 p-2 border border-white/60">
              <span className="text-[10px] text-stone-500 block font-medium">Block</span>
              <strong className="text-[#1E3A2B] font-bold text-xs truncate block">
                {location?.blockName || "Rajarhat"}
              </strong>
            </div>
            <div className="rounded-xl bg-[#F4EEE1]/60 p-2 border border-white/60">
              <span className="text-[10px] text-stone-500 block font-medium">District</span>
              <strong className="text-[#1E3A2B] font-bold text-xs truncate block">
                {location?.districtName || "North 24 Parganas"}
              </strong>
            </div>
          </div>
        </div>

        {/* Assigned Veterinarian Group */}
        <div className="rounded-2xl bg-white/75 backdrop-blur-lg border border-white/80 p-4 space-y-2.5 shadow-[0_6px_20px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 text-emerald-700" />
            <span>ASSIGNED VETERINARIAN</span>
          </span>

          {assignedVet ? (
            <div className="flex items-center justify-between pt-0.5">
              <div>
                <span className="font-bold text-sm text-[#1E3A2B] block">{formatDoctorName(assignedVet.name)}</span>
                <span className="text-[11px] text-[#4A3324]/75">
                  Jurisdiction: <strong className="uppercase">{assignmentLevel || "District"}</strong>
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                <span>Assigned</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-0.5">
              <div>
                <span className="font-bold text-xs text-amber-950 block">Dr. Duty Officer</span>
                <span className="text-[11px] text-amber-800">Assigned at District Level</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                <span>Assigned</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Soft Directional Indicator */}
      <div className="flex justify-center -my-2">
        <div className="h-6 w-0.5 bg-gradient-to-b from-[#1E3A2B]/30 to-transparent" />
      </div>

      {/* ========================================================================= */}
      {/* 3. DOMINANT AI-ASSISTED HEALTH ASSESSMENT (Hero Liquid Glass Card)         */}
      {/* ========================================================================= */}
      <div
        className={`relative z-10 rounded-3xl bg-[#F4EEE1]/90 backdrop-blur-2xl p-6 sm:p-8 space-y-6 ${heroGlowClass} transition-all duration-300`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3A2B]/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#1E3A2B] to-[#3F6B4A] text-white shadow-xs">
              <Sparkles className="h-5 w-5 text-[#D9A441]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider block">
                PRELIMINARY RISK EVALUATION
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#1E3A2B] tracking-tight">
                AI-ASSISTED HEALTH ASSESSMENT
              </h2>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={analyzing}
            onClick={handleRunAnalysis}
            className="h-8 text-xs border-[#1E3A2B]/20 bg-white/80 hover:bg-white text-[#1E3A2B] rounded-full px-3.5 shadow-2xs font-semibold gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 text-emerald-700 ${analyzing ? "animate-spin" : ""}`} />
            <span>{hasAnalysis ? "Refresh Assessment" : "Run Assessment"}</span>
          </Button>
        </div>

        {analysisError && (
          <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}

        {analyzing ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-700" />
            <p className="text-xs text-[#1E3A2B] font-semibold">
              Evaluating reported symptoms, vitals, microclimate, and outbreak surge telemetry...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dominant Score Presentation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 rounded-2xl bg-white/75 backdrop-blur-lg border border-white/80">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#4A3324]/70 uppercase tracking-wider block">
                  MULTIMODAL RISK SCORE
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl sm:text-6xl font-black font-display tracking-tight text-[#1E3A2B]">
                    {hasAnalysis ? riskScore : "—"}
                  </span>
                  <span className="text-xl font-bold text-[#4A3324]/40">/ 100</span>
                </div>
              </div>

              <div className="space-y-2 text-left sm:text-right">
                <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider block">
                  RISK CLASSIFICATION
                </span>
                <span
                  className={`inline-block px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase shadow-xs ${
                    !hasAnalysis
                      ? "bg-stone-100 text-stone-700 border border-stone-300"
                      : riskLevel === "HIGH"
                      ? "bg-[#C1622D]/15 text-[#C1622D] border border-[#C1622D]/30"
                      : riskLevel === "ELEVATED"
                      ? "bg-[#D9A441]/20 text-[#8F6612] border border-[#D9A441]/40"
                      : "bg-emerald-100/90 text-emerald-900 border border-emerald-300"
                  }`}
                >
                  {hasAnalysis ? `${riskLevel} RISK` : "PENDING EVALUATION"}
                </span>
              </div>
            </div>

            {/* Contributing Signals Matrix (Resolves contradiction requirement 10) */}
            <div className="p-4 rounded-2xl bg-[#F4EEE1]/60 border border-white/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider block">
                  Contributing Signals
                </span>
                {hasAnalysis && (
                  <span className="text-[11px] font-mono text-[#4A3324]/70 font-semibold">
                    Overall: {riskScore}/100 — {riskLevel}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-white/70 border border-white/80">
                  <span className="text-[10px] text-stone-500 block">Symptoms</span>
                  <strong className="text-[#1E3A2B] font-bold text-xs">{symptomsSeverity}</strong>
                </div>
                <div className="p-2 rounded-xl bg-white/70 border border-white/80">
                  <span className="text-[10px] text-stone-500 block">IoT Vitals</span>
                  <strong
                    className={`font-bold text-xs ${
                      iotAnomaly ? "text-amber-800" : "text-[#1E3A2B]"
                    }`}
                  >
                    {iotStatusLabel}
                  </strong>
                </div>
                <div className="p-2 rounded-xl bg-white/70 border border-white/80">
                  <span className="text-[10px] text-stone-500 block">Weather</span>
                  <strong
                    className={`font-bold text-xs ${
                      weatherStatusLabel === "High" ? "text-amber-800" : "text-[#1E3A2B]"
                    }`}
                  >
                    {weatherStatusLabel}
                  </strong>
                </div>
                <div className="p-2 rounded-xl bg-white/70 border border-white/80">
                  <span className="text-[10px] text-stone-500 block">Local Trend</span>
                  <strong
                    className={`font-bold text-xs ${
                      trendStatusLabel.includes("Elevated") ? "text-amber-800" : "text-[#1E3A2B]"
                    }`}
                  >
                    {trendStatusLabel}
                  </strong>
                </div>
              </div>

              {isDivergent && (
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Individual environmental or regional trend spikes are tracked for surveillance, while
                    overall preliminary risk prioritizes reported vital stability and clinical observation.
                  </span>
                </div>
              )}
            </div>

            {/* "Why?" Explanation Section */}
            <div className="p-4 rounded-2xl bg-white/60 border border-white/70 space-y-2">
              <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider block">
                Why?
              </span>
              <ul className="space-y-1.5 text-xs text-[#4A3324]/90 font-medium">
                {contributingFactors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-700 font-black">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suspected Condition Signal (Never labeled 'Diagnosis') */}
            {suspectedCondition && (
              <div className="p-4 rounded-2xl bg-white/75 border border-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider block">
                    POSSIBLE CLINICAL CONDITION
                  </span>
                  <span className="text-sm font-bold text-[#1E3A2B]">{suspectedCondition}</span>
                </div>
                {predictionConfidence > 0 && (
                  <div className="self-start sm:self-auto">
                    <span className="text-[10px] text-stone-500 block sm:text-right">
                      Model Confidence
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block">
                      {Math.round(predictionConfidence * 100)}% Match
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Mandatory Regulatory Disclaimer */}
            <p className="text-[11px] text-[#4A3324]/70 italic text-center border-t border-[#1E3A2B]/8 pt-3">
              “Preliminary assessment — veterinarian verification required.”
            </p>
          </div>
        )}
      </div>

      {/* Soft Directional Connector */}
      <div className="flex justify-center -my-2">
        <div className="h-6 w-0.5 bg-gradient-to-b from-[#1E3A2B]/30 to-transparent" />
      </div>

      {/* ========================================================================= */}
      {/* 4. OBSERVED EVIDENCE FLOW (Sequence with subtle connectors)                */}
      {/* ========================================================================= */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A2B]">
            Observed Evidence Synthesis
          </span>
          <span className="text-[11px] text-[#4A3324]/70 font-medium">Multimodal Stream</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Signal 1: Symptoms */}
          <div className="rounded-2xl bg-[#F4EEE1]/80 backdrop-blur-lg border border-white/70 p-4 space-y-2 shadow-[0_4px_16px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1">
                <Activity className="h-3 w-3 text-emerald-700" />
                <span>SYMPTOMS</span>
              </span>
              <p className="text-xs font-bold text-[#1E3A2B] line-clamp-2">
                {symptoms.length > 0 ? symptoms.join(", ") : "No overt symptoms selected"}
              </p>
            </div>
            <span className="text-[10px] text-stone-500 font-medium">
              Duration: {durationDays} day(s)
            </span>
          </div>

          {/* Signal 2: IoT Telemetry */}
          <div className="rounded-2xl bg-[#F4EEE1]/80 backdrop-blur-lg border border-white/70 p-4 space-y-2 shadow-[0_4px_16px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1">
                <Activity className="h-3 w-3 text-emerald-700" />
                <span>IoT TELEMETRY</span>
              </span>
              {hasIot ? (
                <div className="space-y-0.5 text-xs font-bold text-[#1E3A2B]">
                  {currentTemp != null && <p>{currentTemp.toFixed(1)}°C Core Temp</p>}
                  {currentActivity != null && <p>Activity: {currentActivity} / 100</p>}
                  {heartRate != null && <p>Heart Rate: {heartRate} bpm</p>}
                </div>
              ) : (
                <p className="text-xs text-stone-500 italic">IoT data unavailable</p>
              )}
            </div>
            <span
              className={`text-[10px] font-bold ${
                !hasIot ? "text-stone-400" : iotAnomaly ? "text-amber-800" : "text-emerald-800"
              }`}
            >
              {hasIot ? (iotAnomaly ? "Abnormal vitals" : "Normal baseline") : "No live sensor"}
            </span>
          </div>

          {/* Signal 3: Weather */}
          <div className="rounded-2xl bg-[#F4EEE1]/80 backdrop-blur-lg border border-white/70 p-4 space-y-2 shadow-[0_4px_16px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1">
                <CloudSun className="h-3 w-3 text-emerald-700" />
                <span>WEATHER</span>
              </span>
              {hasWeather ? (
                <div className="text-xs font-bold text-[#1E3A2B]">
                  {weatherTemp != null && <p>{weatherTemp.toFixed(1)}°C</p>}
                  {weatherHumidity != null && <p>{weatherHumidity}% humidity</p>}
                </div>
              ) : (
                <p className="text-xs text-stone-500 italic">Weather data unavailable</p>
              )}
            </div>
            <span className="text-[10px] font-medium text-[#4A3324]/75">
              Vector risk: <strong>{weatherRisk || "BASELINE"}</strong>
            </span>
          </div>

          {/* Signal 4: Local Trend */}
          <div className="rounded-2xl bg-[#F4EEE1]/80 backdrop-blur-lg border border-white/70 p-4 space-y-2 shadow-[0_4px_16px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-700" />
                <span>LOCAL TREND</span>
              </span>
              {hasTrend ? (
                <p className="text-xs font-bold text-[#1E3A2B]">
                  {latestCases} recent case{latestCases === 1 ? "" : "s"}
                </p>
              ) : (
                <p className="text-xs text-stone-500 italic">Local trend unavailable</p>
              )}
            </div>
            <span
              className={`text-[10px] font-bold ${
                isSpike ? "text-amber-800" : "text-[#4A3324]/75"
              }`}
            >
              {isSpike ? "Outbreak surge detected" : "Baseline tracking"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. COMPUTER VISION (Non-contradictory status & Model Confidence)           */}
      {/* ========================================================================= */}
      <div className="relative z-10 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-xl border border-white/70 p-6 space-y-4 shadow-[0_8px_24px_rgba(30,58,43,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]">
        <div className="flex items-center justify-between border-b border-[#1E3A2B]/10 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#1E3A2B]">
              COMPUTER VISION
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
            Image: {photoUrl ? "✓ Analyzed" : "Not Provided"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {photoUrl ? (
            <div className="h-16 w-16 rounded-2xl overflow-hidden border border-[#E5E0D8] bg-stone-100 shrink-0 shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Inspection Photo" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-center text-stone-400 shrink-0">
              <Eye className="h-6 w-6" />
            </div>
          )}

          <div className="space-y-1 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">
                  Possible visual signal:
                </span>
                <span className="text-sm font-bold text-[#1E3A2B]">
                  {!photoUrl
                    ? "No photo attached to report."
                    : visionAnomaly && rawPrediction && !rawPrediction.startsWith("Rejected") && !isVisionHealthyOrNone
                    ? `${cleanPrediction}-like lesion`
                    : "No significant visual abnormality detected."}
                </span>
              </div>

              {visionConfidence > 0 && photoUrl && (
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-stone-500 block">Model Confidence</span>
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    {visionConfidence}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#4A3324]/75 italic pt-1">
              “AI-assisted visual signal only. Clinical examination required.”
            </p>
          </div>
        </div>
      </div>

      {/* Soft Directional Connector */}
      <div className="flex justify-center -my-2">
        <div className="h-6 w-0.5 bg-gradient-to-b from-[#1E3A2B]/30 to-transparent" />
      </div>

      {/* ========================================================================= */}
      {/* 6. HANDOFF TO THE VETERINARIAN (Next Clinical Steps)                       */}
      {/* ========================================================================= */}
      <div className="relative z-10 rounded-3xl bg-gradient-to-br from-white/90 to-[#FAF8F3]/90 backdrop-blur-xl border border-emerald-300/60 p-6 space-y-4 shadow-[0_12px_32px_rgba(30,58,43,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E3A2B]/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A2B] tracking-wide uppercase">
            <span>PRELIMINARY ASSESSMENT</span>
            <ArrowRight className="h-3.5 w-3.5 text-emerald-700" />
            <span className="text-emerald-800">VETERINARIAN REVIEW</span>
          </div>
          <span className="text-[10px] font-bold text-[#4A3324]/60 uppercase tracking-wider">
            Clinical Hand-off
          </span>
        </div>

        <div className="space-y-2.5">
          <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider block">
            NEXT CLINICAL STEPS
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#1E3A2B]">
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#E5E0D8] flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                1
              </span>
              <span>Veterinarian review & triage</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#E5E0D8] flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                2
              </span>
              <span>Physical clinical examination</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#E5E0D8] flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                3
              </span>
              <span>Lab referral if required</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/80 border border-[#E5E0D8] flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                4
              </span>
              <span>Authorized treatment / follow-up</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#4A3324]/80 font-medium italic border-t border-[#1E3A2B]/8 pt-2">
          The veterinarian remains the final clinical decision authority.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 7. FARMER GUIDANCE (Simple, practical steps)                               */}
      {/* ========================================================================= */}
      <div className="relative z-10 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-xl border border-white/70 p-6 space-y-3 shadow-[0_6px_20px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]">
        <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <span>FARMER GUIDANCE</span>
        </span>
        <p className="text-xs text-[#4A3324]/80 font-medium">Until veterinary review:</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#1E3A2B] font-medium pl-1">
          <li>Keep the animal under observation.</li>
          <li>Avoid unnecessary contact with other animals.</li>
          <li>Keep feeding and water areas clean.</li>
          <li>Follow veterinary instructions.</li>
        </ol>

        {farmerAdvisory?.advisory && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 font-medium leading-relaxed whitespace-pre-line">
            {farmerAdvisory.advisory}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 8. FINAL ACTIONS (Apple CTA Pills in Deep Pine → Moss)                     */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex flex-col sm:flex-row gap-3 pt-2">
        {selectedAnimal && (
          <Link href={`/farmer/animals/${selectedAnimal.id}`} className="flex-1 w-full">
            <Button
              variant="outline"
              className="w-full text-xs font-semibold rounded-full min-h-[46px] border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] shadow-xs gap-2 transition-all cursor-pointer"
            >
              <History className="h-4 w-4 text-emerald-700" />
              <span>View Animal Health History</span>
            </Button>
          </Link>
        )}

        <Button
          onClick={onReset}
          className="flex-1 w-full text-xs font-semibold rounded-full min-h-[46px] bg-gradient-to-b from-[#1E3A2B] to-[#3F6B4A] hover:opacity-95 text-white shadow-[0_4px_14px_rgba(30,58,43,0.25)] gap-2 transition-all cursor-pointer"
        >
          <FilePlus className="h-4 w-4 text-emerald-200" />
          <span>Create Another Report</span>
        </Button>
      </div>
    </div>
  );
}
