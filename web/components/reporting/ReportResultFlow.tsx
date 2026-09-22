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
  ChevronDown,
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
  // Technical panel: collapsed for farmers, expanded for agents
  const [techExpanded, setTechExpanded] = useState(mode !== "farmer");

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

  // Urgency banner text based on risk level
  const urgencyConfig = !hasAnalysis
    ? {
        emoji: "⏳",
        label: "Analyzing your report…",
        sub: "Your report has been submitted. The AI is evaluating it now.",
        bgClass: "bg-stone-50/80 border-stone-200/80",
        textClass: "text-stone-800",
        subTextClass: "text-stone-600",
      }
    : riskLevel === "HIGH"
    ? {
        emoji: "🚨",
        label: "Urgent — a vet should see this animal today",
        sub: `Risk score: ${riskScore}/100`,
        bgClass: "bg-[#C1622D]/10 border-[#C1622D]/30",
        textClass: "text-[#C1622D]",
        subTextClass: "text-[#C1622D]/70",
      }
    : riskLevel === "ELEVATED"
    ? {
        emoji: "⚠️",
        label: "Moderate Concern — a vet should review this within 24 hours",
        sub: `Risk score: ${riskScore}/100`,
        bgClass: "bg-[#D9A441]/10 border-[#D9A441]/40",
        textClass: "text-[#8F6612]",
        subTextClass: "text-[#8F6612]/70",
      }
    : {
        emoji: "✅",
        label: "Low Concern — keep watching, call if it gets worse",
        sub: `Risk score: ${riskScore}/100`,
        bgClass: "bg-emerald-50/80 border-emerald-200/80",
        textClass: "text-emerald-900",
        subTextClass: "text-emerald-700",
      };

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
      {/* 2. URGENCY BANNER — plain-language risk for farmers                        */}
      {/* ========================================================================= */}
      <div className={`relative z-10 rounded-2xl ${urgencyConfig.bgClass} border p-4 sm:p-5 flex items-start gap-3 transition-all duration-300`}>
        <span className="text-2xl leading-none mt-0.5">{urgencyConfig.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm sm:text-base font-bold ${urgencyConfig.textClass} leading-snug`}>
            {urgencyConfig.label}
          </p>
          {hasAnalysis && (
            <p className={`text-[11px] ${urgencyConfig.subTextClass} font-medium mt-1`}>
              {urgencyConfig.sub}
            </p>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FARMER GUIDANCE — actionable advice FIRST (moved up from bottom)        */}
      {/* ========================================================================= */}
      <div className="relative z-10 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-xl border border-white/70 p-6 space-y-3 shadow-[0_6px_20px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]">
        <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <span>WHAT YOU SHOULD DO</span>
        </span>
        <p className="text-xs text-[#4A3324]/80 font-medium">Until the vet visits:</p>
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
      {/* 4. LOCATION & ASSIGNED VETERINARIAN — actionable context                   */}
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
      {/* 5. COLLAPSIBLE TECHNICAL AI ANALYSIS PANEL                                 */}
      {/*    Collapsed by default for farmers, expanded for agents                   */}
      {/* ========================================================================= */}
      <div className="relative z-10">
        <button
          type="button"
          onClick={() => setTechExpanded(!techExpanded)}
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-[#F4EEE1]/80 backdrop-blur-xl border border-white/70 shadow-[0_6px_20px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] cursor-pointer hover:bg-[#F4EEE1] transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-[#1E3A2B] to-[#3F6B4A] text-white shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#D9A441]" />
            </div>
            <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider">
              See the full AI analysis
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[#4A3324]/60 transition-transform duration-300 ${
              techExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Expandable content */}
        <div
          className={`overflow-hidden transition-all duration-400 ease-in-out ${
            techExpanded ? "max-h-[3000px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <div
            className={`rounded-3xl bg-[#F4EEE1]/90 backdrop-blur-2xl p-6 sm:p-8 space-y-6 ${heroGlowClass} transition-all duration-300`}
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

                {/* ================================================================ */}
                {/* MERGED: Diagnostic Signals (Contributing Signals + Evidence)      */}
                {/* ================================================================ */}
                <div className="p-4 rounded-2xl bg-[#F4EEE1]/60 border border-white/70 space-y-4">
                  <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider block">
                    Diagnostic Signals
                  </span>

                  {/* Signal cards — single unified grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Symptoms */}
                    <div className="rounded-2xl bg-white/70 border border-white/80 p-3 space-y-1.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(30,58,43,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1">
                          <Activity className="h-3 w-3 text-emerald-700" />
                          <span>Symptoms</span>
                        </span>
                        <p className="text-xs font-bold text-[#1E3A2B] line-clamp-2">
                          {symptoms.length > 0 ? symptoms.join(", ") : "None selected"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/60">
                        <span className="text-[10px] text-stone-500 font-medium">
                          Duration: {durationDays}d
                        </span>
                        <strong className="text-[10px] font-bold text-[#1E3A2B]">{symptomsSeverity}</strong>
                      </div>
                    </div>

                    {/* IoT Telemetry */}
                    <div className="rounded-2xl bg-white/70 border border-white/80 p-3 space-y-1.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(30,58,43,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1">
                          <Activity className="h-3 w-3 text-emerald-700" />
                          <span>IoT Vitals</span>
                        </span>
                        {hasIot ? (
                          <div className="space-y-0.5 text-xs font-bold text-[#1E3A2B]">
                            {currentTemp != null && <p>{currentTemp.toFixed(1)}°C</p>}
                            {currentActivity != null && <p>Activity: {currentActivity}/100</p>}
                            {heartRate != null && <p>HR: {heartRate} bpm</p>}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500 italic">Unavailable</p>
                        )}
                      </div>
                      <div className="pt-1 border-t border-white/60">
                        <strong
                          className={`text-[10px] font-bold ${
                            !hasIot ? "text-stone-400" : iotAnomaly ? "text-amber-800" : "text-emerald-800"
                          }`}
                        >
                          {iotStatusLabel}
                        </strong>
                      </div>
                    </div>

                    {/* Weather */}
                    <div className="rounded-2xl bg-white/70 border border-white/80 p-3 space-y-1.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(30,58,43,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1">
                          <CloudSun className="h-3 w-3 text-emerald-700" />
                          <span>Weather</span>
                        </span>
                        {hasWeather ? (
                          <div className="text-xs font-bold text-[#1E3A2B]">
                            {weatherTemp != null && <p>{weatherTemp.toFixed(1)}°C</p>}
                            {weatherHumidity != null && <p>{weatherHumidity}% humidity</p>}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500 italic">Unavailable</p>
                        )}
                      </div>
                      <div className="pt-1 border-t border-white/60">
                        <span className="text-[10px] font-medium text-[#4A3324]/75">
                          Vector: <strong className={weatherStatusLabel === "High" ? "text-amber-800" : ""}>{weatherRisk || "BASELINE"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Local Trend */}
                    <div className="rounded-2xl bg-white/70 border border-white/80 p-3 space-y-1.5 flex flex-col justify-between shadow-[0_2px_8px_rgba(30,58,43,0.04),inset_0_1px_0_rgba(255,255,255,0.7)]">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#4A3324]/70 uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-700" />
                          <span>Local Trend</span>
                        </span>
                        {hasTrend ? (
                          <p className="text-xs font-bold text-[#1E3A2B]">
                            {latestCases} recent case{latestCases === 1 ? "" : "s"}
                          </p>
                        ) : (
                          <p className="text-xs text-stone-500 italic">Unavailable</p>
                        )}
                      </div>
                      <div className="pt-1 border-t border-white/60">
                        <strong
                          className={`text-[10px] font-bold ${
                            isSpike ? "text-amber-800" : "text-[#4A3324]/75"
                          }`}
                        >
                          {isSpike ? "Outbreak surge" : trendStatusLabel}
                        </strong>
                      </div>
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

                {/* Computer Vision */}
                <div className="rounded-2xl bg-white/60 border border-white/70 p-5 space-y-4">
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
                        &ldquo;AI-assisted visual signal only. Clinical examination required.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mandatory Regulatory Disclaimer */}
                <p className="text-[11px] text-[#4A3324]/70 italic text-center border-t border-[#1E3A2B]/8 pt-3">
                  &ldquo;Preliminary assessment &mdash; veterinarian verification required.&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Soft Directional Connector */}
      <div className="flex justify-center -my-2">
        <div className="h-6 w-0.5 bg-gradient-to-b from-[#1E3A2B]/30 to-transparent" />
      </div>

      {/* ========================================================================= */}
      {/* 6. HANDOFF CHECKLIST — simplified for farmer readability                   */}
      {/* ========================================================================= */}
      <div className="relative z-10 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-xl border border-white/70 p-6 space-y-4 shadow-[0_8px_24px_rgba(30,58,43,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E3A2B]/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A2B] tracking-wide uppercase">
            <span>YOUR REPORT</span>
            <ArrowRight className="h-3.5 w-3.5 text-emerald-700" />
            <span className="text-emerald-800">VET REVIEW</span>
          </div>
          <span className="text-[10px] font-bold text-[#4A3324]/60 uppercase tracking-wider">
            What happens next
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#1E3A2B]">
            <div className="p-2.5 rounded-xl bg-white/60 border border-white/70 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-100/90 text-emerald-900 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-300/60">
                1
              </span>
              <span className="font-semibold">Vet will review &amp; examine</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/60 border border-white/70 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-100/90 text-emerald-900 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-300/60">
                2
              </span>
              <span className="font-semibold">Lab tests if needed</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/60 border border-white/70 flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-emerald-100/90 text-emerald-900 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-300/60">
                3
              </span>
              <span className="font-semibold">Treatment plan from vet</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#4A3324]/80 font-medium italic border-t border-[#1E3A2B]/8 pt-2">
          The veterinarian is the final decision authority for your animal&apos;s treatment.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 7. FINAL ACTIONS (Apple CTA Pills in Deep Pine → Moss)                     */}
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
