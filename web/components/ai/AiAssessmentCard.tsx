"use client";

import React, { useState } from "react";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";
import { VisionPredictionCard } from "./VisionPredictionCard";
import { IoTAnalysisCard } from "./IoTAnalysisCard";
import { WeatherRiskCard } from "./WeatherRiskCard";
import { OutbreakTrendCard } from "./OutbreakTrendCard";
import { RiskGauge } from "./RiskGauge";
import { RiskBadge } from "./RiskBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  RefreshCw,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getReportCopy } from "@/lib/i18n/report";
import { useTranslations } from "next-intl";

interface AiAssessmentCardProps {
  caseId: string;
  analysisResult?: Record<string, unknown> | null;
  visionResult?: Record<string, unknown> | null;
  hasPhoto?: boolean;
}

export function AiAssessmentCard({
  caseId,
  analysisResult: initialAnalysis,
  visionResult: initialVision,
  hasPhoto = false,
}: AiAssessmentCardProps) {
  const tAi = useTranslations("common.aiCard");
  const { locale } = useLocale();
  const copy = getReportCopy(locale);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(
    initialAnalysis || null
  );
  const [visionResult, setVisionResult] = useState<Record<string, unknown> | null>(
    initialVision || null
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setError("");
    try {
      const res = await runCaseAnalysisAction(caseId);
      if (res.success) {
        setAnalysisResult((res.analysisResult as Record<string, unknown>) || null);
        setVisionResult((res.visionResult as Record<string, unknown>) || null);
      } else {
        setError(res.error || "AI analysis failed.");
      }
    } catch {
      setError("Unable to contact the analysis server.");
    } finally {
      setAnalyzing(false);
    }
  };

  const riskScore = Number(analysisResult?.overall_risk_score || 0);
  const riskLevel = (analysisResult?.overall_risk_level as string) || "UNKNOWN";
  const diseasePrediction = analysisResult?.disease_prediction as Record<string, unknown> | null;
  const differentials = (analysisResult?.differential_diagnoses as Array<{
    disease_name: string;
    probability: number;
    hallmark_symptoms_matched: string[];
    quarantine_protocol_summary: string;
  }>) || [];

  const iotSignals = analysisResult?.iot_telemetry_analysis as Record<string, unknown> | null;
  const weatherSignals = analysisResult?.weather_analysis as Record<string, unknown> | null;
  const outbreakSignals = analysisResult?.outbreak_surge_analysis as Record<string, unknown> | null;
  const farmerAdvisory = analysisResult?.farmer_advisory as { advisory?: string } | null;

  return (
    <Card className="border-[#D0E2FF] dark:border-white/14 bg-[#F4F8FF] dark:bg-[#101E17]/85 rounded-3xl shadow-xs dark:shadow-[inset_0_1.5px_0.5px_rgba(255,255,255,0.18),0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden text-[#191F1C] dark:text-[#F4EEE1]">
      {/* Header with Clinical Decision Support Tag */}
      <CardHeader className="border-b border-[#D0E2FF] dark:border-white/10 pb-3 bg-white/90 dark:bg-black/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-xs">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  {copy.decisionTitle || "Clinical Decision Support"}
                </CardTitle>
              </div>
              <p className="text-xs text-slate-600">
                {copy.decisionDescription || "Multimodal synthesis of clinical symptoms, vital sensors, microclimate, and outbreak surge telemetry."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {analysisResult && <RiskBadge level={riskLevel} />}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={analyzing}
              onClick={handleRunAnalysis}
              className="h-8 gap-1.5 text-xs border-blue-200 bg-white text-blue-900 hover:bg-blue-50 min-h-[32px] rounded-xl cursor-pointer shadow-2xs font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${analyzing ? "animate-spin" : ""}`} />
              <span>{analysisResult ? (copy.retry || "Retry analysis") : (copy.startAnalysis || "Start analysis")}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {error && (
          <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!analysisResult && !analyzing && (
          <div className="p-8 rounded-3xl border border-blue-200 bg-white text-center space-y-3 shadow-2xs">
            <Activity className="h-10 w-10 text-blue-500 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-900">{tAi("pendingAssessment")}</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                {tAi("runPrompt")}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleRunAnalysis}
              className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl px-5 h-9"
            >
              {copy.startAnalysis || "Run AI Analysis"}
            </Button>
          </div>
        )}

        {analyzing && (
          <div className="p-10 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-blue-200 shadow-2xs">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs text-slate-800 font-semibold">
              {tAi("evaluating")}
            </span>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* 1. Primary Risk Gauge & Clinical Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl border border-[#D0E2FF] shadow-xs">
              <div className="flex flex-col items-center justify-center p-2 border-b md:border-b-0 md:border-r border-slate-100">
                <RiskGauge score={riskScore} level={riskLevel} />
              </div>

              <div className="md:col-span-2 space-y-3 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>{copy.clinicalSummary || "Clinical Synthesis & Primary Suspected Condition"}</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-2">
                  <div className="text-base font-bold text-slate-900">
                    {diseasePrediction?.suspected_condition ? String(diseasePrediction.suspected_condition) : "Suspected Clinical Condition"}
                  </div>
                  {Boolean(diseasePrediction?.confidence) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 font-medium">Model Confidence:</span>
                      <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-mono text-xs font-bold">
                        {Math.round(Number(diseasePrediction?.confidence) * 100)}% Match
                      </Badge>
                    </div>
                  )}
                  {Boolean(diseasePrediction?.symptoms_analyzed) && (
                    <p className="text-xs text-stone-600 pt-1 border-t border-[#E5E0D8]/60">
                      <strong>Analyzed Indicators:</strong> {String(diseasePrediction?.symptoms_analyzed)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Differential Diagnoses Matrix */}
            {differentials.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-600" />
                    <span>{tAi("differentialMatrix")}</span>
                  </span>
                  <span className="text-xs text-stone-500 font-mono font-medium">
                    {differentials.length} candidate condition{differentials.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {differentials.map((diff, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-[#E5E0D8] bg-white space-y-2.5 shadow-2xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-900">{diff.disease_name}</span>
                        <Badge
                          className={`text-[10px] font-mono font-bold ${
                            diff.probability >= 0.7
                              ? "bg-red-50 text-red-700 border-red-200"
                              : diff.probability >= 0.4
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-stone-100 text-stone-700 border-stone-200"
                          }`}
                        >
                          {Math.round(diff.probability * 100)}% likelihood
                        </Badge>
                      </div>

                      {diff.hallmark_symptoms_matched && diff.hallmark_symptoms_matched.length > 0 && (
                        <div className="text-[11px] text-stone-600">
                          <span className="text-stone-500">Hallmark markers: </span>
                          <span className="text-stone-800 font-medium">{diff.hallmark_symptoms_matched.join(", ")}</span>
                        </div>
                      )}

                      {diff.quarantine_protocol_summary && (
                        <p className="text-[11px] text-amber-900 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/80">
                          <strong>Isolation Protocol:</strong> {diff.quarantine_protocol_summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Vision Analysis Card (With Pre-Filter Rejection UI) */}
            {hasPhoto && (visionResult?.success === false || (typeof visionResult?.primary_prediction === "string" && visionResult.primary_prediction.startsWith("Rejected"))) ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs flex items-start gap-3 shadow-2xs">
                <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-wider text-[11px] text-amber-900">
                    Image Scan Rejected
                  </p>
                  <p className="text-amber-800 font-medium leading-relaxed">
                    {String(
                      visionResult.message ||
                        "Invalid image detected. Please upload a clear photo of the animal's affected skin or lesion."
                    )}
                  </p>
                </div>
              </div>
            ) : hasPhoto ? (
              <VisionPredictionCard
                caseId={caseId}
                visionResult={visionResult}
                onVisionUpdated={(newVision) => setVisionResult(newVision)}
              />
            ) : null}

            {/* 4. Multi-Modal Auxiliary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IoTAnalysisCard telemetrySignals={iotSignals} />
              <WeatherRiskCard weatherSignals={weatherSignals} />
              <OutbreakTrendCard outbreakSignals={outbreakSignals} />
            </div>

            {/* 5. Farmer Advisory Guidelines */}
            {farmerAdvisory?.advisory && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs leading-relaxed text-emerald-950 shadow-2xs space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span>{copy.advisoryTitle || "Automated Farmer Advisory Summary"}</span>
                </h4>
                <p className="whitespace-pre-wrap font-medium">{farmerAdvisory.advisory}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}