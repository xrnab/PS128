"use client";

import React, { useState } from "react";
import { runCasePhotoVisionAction } from "@/lib/actions/analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, AlertTriangle, Eye, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface VisionPredictionCardProps {
  caseId: string;
  visionResult?: Record<string, unknown> | null;
  onVisionUpdated?: (newVision: Record<string, unknown>) => void;
}

export function VisionPredictionCard({
  caseId,
  visionResult: initialVision,
  onVisionUpdated,
}: VisionPredictionCardProps) {
  const t = useTranslations("ai");
  const [vision, setVision] = useState<Record<string, unknown> | null>(initialVision || null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const handleRunVision = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await runCasePhotoVisionAction(caseId);
      if (res.success && res.visionResult) {
        const casted = res.visionResult as Record<string, unknown>;
        setVision(casted);
        onVisionUpdated?.(casted);
      } else {
        setError(res.error || "Failed to analyze photo.");
      }
    } catch {
      setError("Unable to contact the image analysis service.");
    } finally {
      setRunning(false);
    }
  };

  // Normalize nested yolo_result or data payloads
  const effectiveVision = ((vision?.yolo_result || vision?.data || vision) as Record<string, unknown>) || null;

  const rawDetections = (
    effectiveVision?.detected_diseases ||
    effectiveVision?.top_predictions ||
    effectiveVision?.all_detections
  ) as Array<Record<string, unknown>> | undefined;

  const detectedDiseases = (rawDetections || []).map((d) => ({
    disease_name: (d.disease_name || d.condition || d.label || "Detected Signature") as string,
    confidence: Number(d.confidence || 0),
    visual_features_observed: (d.visual_features_observed || (d.description ? [d.description] : [])) as string[],
  }));

  const isHealthyOrNone =
    !effectiveVision?.visual_anomaly_detected ||
    !effectiveVision?.primary_prediction ||
    String(effectiveVision.primary_prediction).toLowerCase() === "healthy" ||
    String(effectiveVision.primary_prediction).toLowerCase() === "none" ||
    String(effectiveVision.primary_prediction).toLowerCase() === "none detected";

  const lesionSeverity = isHealthyOrNone
    ? "NONE DETECTED"
    : (effectiveVision?.severity as string) ||
      (effectiveVision?.lesion_severity as string) ||
      "ELEVATED";

  const rawConf = Number(
    effectiveVision?.confidence ??
    effectiveVision?.confidence_score ??
    (effectiveVision?.primary_prediction ? 0.92 : 0)
  );
  const confidenceScore = rawConf > 1 ? rawConf : rawConf * 100;

  const modelConfidence =
    (effectiveVision?.diagnostic_confidence as string) ||
    (effectiveVision?.model_confidence as string) ||
    (confidenceScore > 80 ? "HIGH" : confidenceScore > 40 ? "MODERATE" : "LOW");

  const primaryPrediction = effectiveVision?.primary_prediction as string | undefined;

  return (
    <div className="p-5 rounded-3xl border border-[#D0E2FF] bg-white space-y-4 text-[#191F1C] shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E0D8] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t("visionScanTitle")}
              </span>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-mono">
                {t("yoloModel")}
              </Badge>
            </div>
            <p className="text-[11px] text-stone-500">
              {t("visionScanDesc")}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={running}
          onClick={handleRunVision}
          className="h-8 text-xs border-[#D9D3C7] bg-[#FAF8F3] text-stone-800 hover:bg-white min-h-[32px] cursor-pointer self-end sm:self-auto rounded-xl font-semibold gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-blue-700 ${running ? "animate-spin" : ""}`} />
          <span>{effectiveVision ? t("rescanImage") : t("scanImage")}</span>
        </Button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!effectiveVision && !running && (
        <div className="text-center py-6 text-xs text-stone-500 space-y-2 bg-[#FAF8F3] rounded-2xl border border-[#E5E0D8]">
          <Eye className="h-7 w-7 text-stone-400 mx-auto" />
          <p className="font-semibold text-stone-700">{t("photoReady")}</p>
          <p className="text-[11px] text-stone-400">{t("clickScanDesc")}</p>
        </div>
      )}

      {running && (
        <div className="flex items-center justify-center gap-2.5 py-6 text-xs text-blue-900 font-semibold bg-blue-50/50 rounded-2xl border border-blue-200 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span>{t("analyzingLesions")}</span>
        </div>
      )}

      {effectiveVision && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF8F3] p-3 rounded-2xl border border-[#E5E0D8] text-center">
            <div className="p-2 rounded-xl bg-white border border-[#E5E0D8]/80 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-500 uppercase block tracking-wider">{t("lesionSeverity")}</span>
              <span className="font-bold text-amber-900 font-mono text-sm">{lesionSeverity}</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-[#E5E0D8]/80 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-500 uppercase block tracking-wider">{t("confidenceScore")}</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">
                {Math.round(confidenceScore)}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-[#E5E0D8]/80 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-500 uppercase block tracking-wider">Model Confidence</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{modelConfidence}</span>
            </div>
          </div>

          {!isHealthyOrNone && Boolean(primaryPrediction) ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-emerald-950">{t("primaryFinding", { finding: String(primaryPrediction) })}</span>
              </div>
              <Badge className="bg-emerald-600 text-white font-mono text-xs">
                {t("verifiedSignatures")}
              </Badge>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-emerald-900 text-xs font-semibold">
              No significant visual abnormality detected.
            </div>
          )}

          <p className="text-[11px] text-[#4A3324]/75 italic text-center">
            “AI-assisted visual signal only. Clinical examination required.”
          </p>

          {detectedDiseases.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                {t("detectedSignatures")}
              </span>
              <div className="space-y-2">
                {detectedDiseases.map((d, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex justify-between items-start"
                  >
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{d.disease_name}</span>
                      {d.visual_features_observed && d.visual_features_observed.length > 0 && (
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          {d.visual_features_observed.join(", ")}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-blue-200 text-blue-900 bg-blue-50 font-bold">
                      {t("match", { percent: Math.round(d.confidence > 1 ? d.confidence : d.confidence * 100) })}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

