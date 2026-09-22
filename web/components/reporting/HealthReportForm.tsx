"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { PrintableAnimalOption } from "@/lib/actions/reporting_data";
import { FarmerAnimalSelector } from "./FarmerAnimalSelector";
import { AgentAnimalSelector } from "./AgentAnimalSelector";
import { SymptomSelector } from "./SymptomSelector";
import { PhotoCapture } from "./PhotoCapture";
import { IoTInput } from "./IoTInput";
import { createCaseReportAction, CaseReportResult } from "@/lib/actions/cases";
import { completeAssistanceWithReportAction } from "@/lib/actions/assistance";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";
import { enqueueReport } from "@/lib/offline/db";
import { checkServerReachability } from "@/lib/offline/sync";
import type { YoloVisionAnalysis } from "@/lib/types/livestock";
import { ReportResultFlow } from "./ReportResultFlow";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  WifiOff,
  PhoneCall,
  ShieldAlert,
  Camera,
  Cpu,
  Clock,
  MapPin,
} from "lucide-react";

interface HealthReportFormProps {
  mode: "farmer" | "agent";
  initialRequestId?: string;
  initialFarmId?: string;
  initialAnimalId?: string;
  expectedUpdatedAt?: string;
}

export function HealthReportForm({
  mode,
  initialRequestId,
  expectedUpdatedAt,
}: HealthReportFormProps) {
  const { user } = useUser();
  const t = useTranslations("reporting");
  const tCommon = useTranslations("common");
  const [step, setStep] = useState(1);
  const [animalSelectorKey, setAnimalSelectorKey] = useState(0);

  // Form State
  const [submissionId, setSubmissionId] = useState("pending-submission");
  const [selectedAnimal, setSelectedAnimal] = useState<PrintableAnimalOption | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<number>(1);
  const [affectedCount, setAffectedCount] = useState<number>(1);
  const [herdSize, setHerdSize] = useState<number>(1);
  const [mortalityCount, setMortalityCount] = useState<number>(0);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<"idle" | "uploading" | "uploaded" | "failed">("idle");
  const [yoloVisionResult, setYoloVisionResult] = useState<YoloVisionAnalysis | null>(null);

  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

  // Automatic Background Geolocation
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation && gpsLat === null) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLat(pos.coords.latitude);
          setGpsLng(pos.coords.longitude);
        },
        (err) => {
          console.log("[Auto Geolocation Info]:", err.message);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    }
  }, [gpsLat]);

  // Check if backend rejected the image (e.g., "Rejected: Person" or "Rejected: Cell Phone")
  const isImageRejected = Boolean(yoloVisionResult?.primary_prediction?.startsWith("Rejected"));

  // Disable next button if photo is uploading / analyzing or rejected
  const isUploading = photoUploadStatus === "uploading";
  const isNextButtonDisabled = step === 3 ? (isUploading || isAnalyzingPhoto || isImageRejected) : false;

  // IoT State
  const [temperature, setTemperature] = useState<number | null>(null);
  const [activity, setActivity] = useState<number | null>(null);
  const [iotSource, setIotSource] = useState<"REAL" | "SIMULATED" | "MANUAL" | null>(null);
  const [iotReadingId, setIotReadingId] = useState<string | null>(null);

  // Submission & AI Analysis Status
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [submitResult, setSubmitResult] = useState<(CaseReportResult & { offlineQueued?: boolean; submissionId?: string }) | null>(null);
  const [aiState, setAiState] = useState<{
    analysisResult?: Record<string, unknown> | null;
    visionResult?: Record<string, unknown> | null;
  } | null>(null);

  useEffect(() => {
    if (submitResult?.caseId && !aiState) {
      runCaseAnalysisAction(submitResult.caseId).then((res) => {
        if (res.success) {
          setAiState({
            analysisResult: res.analysisResult as Record<string, unknown>,
            visionResult: res.visionResult as Record<string, unknown>,
          });
        }
      });
    }
  }, [submitResult?.caseId, aiState]);

  const handleAnimalSelected = (animal: PrintableAnimalOption) => {
    setSelectedAnimal(animal);
    if (animal.herdSize) {
      setHerdSize(animal.herdSize);
    }
    setFormError("");
  };

  const resetReport = () => {
    setSubmissionId("pending-submission");
    setSelectedAnimal(null);
    setSymptoms([]);
    setDurationDays(1);
    setAffectedCount(1);
    setHerdSize(1);
    setMortalityCount(0);
    setHeartRate(null);
    setPhotoUrl(null);
    setPhotoBlob(null);
    setPhotoUploadStatus("idle");
    setYoloVisionResult(null);
    setTemperature(null);
    setActivity(null);
    setIsAnalyzingPhoto(false);
    setIotSource(null);
    setIotReadingId(null);
    setSubmitResult(null);
    setAiState(null);
    setFormError("");
    setResetNotice("New report started. Select an animal to continue.");
    setAnimalSelectorKey((current) => current + 1);
    setStep(1);
  };

  const handleNextStep = () => {
    setFormError("");
    setResetNotice("");

    // Step 1 Validation: Animal selected
    if (step === 1 && !selectedAnimal) {
      setFormError("Select an animal ear tag before continuing.");
      return;
    }

    // Step 2 Validation (MERGE 1: Symptoms & Duration):
    if (step === 2) {
      if (symptoms.length === 0) {
        setFormError("Select at least one observed symptom.");
        return;
      }
      if (affectedCount > herdSize) {
        setFormError(`Affected animals (${affectedCount}) cannot exceed the herd size (${herdSize}).`);
        return;
      }
      if (!durationDays || durationDays < 1) {
        setFormError("Please select how long symptoms have been present.");
        return;
      }
    }

    // Step 3 Validation (MERGE 2: Evidence Photo & IoT):
    if (step === 3) {
      if (photoUploadStatus === "uploading" || isAnalyzingPhoto) {
        setFormError("Please wait for the photo upload and analysis to complete before proceeding.");
        return;
      }
      if (isImageRejected) {
        setFormError(
          yoloVisionResult?.message ||
            "Invalid photo detected. You must delete this photo and upload a clear picture of the animal to proceed."
        );
        return;
      }
    }

    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrevStep = () => {
    setFormError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmitReport = async () => {
    if (!selectedAnimal) {
      setFormError("Animal selection is required.");
      return;
    }
    if (symptoms.length === 0) {
      setFormError("At least one symptom is required.");
      return;
    }
    if (photoUploadStatus === "uploading" || isAnalyzingPhoto) {
      setFormError("Please wait for the photo upload and analysis to complete before submitting.");
      return;
    }
    if (isImageRejected) {
      setFormError(
        yoloVisionResult?.message ||
          "Submission blocked: Invalid photo detected. You must remove or replace this photo to submit."
      );
      return;
    }

    const reportSubmissionId = submissionId === "pending-submission"
      ? `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      : submissionId;
    setSubmissionId(reportSubmissionId);

    setSubmitting(true);
    setFormError("");

    const activeClerkUserId = user?.id || "anonymous_user";

    // Cleanse photoUrl so browser-local blob: URLs are never persisted as permanent server references
    const persistentPhotoUrl = photoUrl && !photoUrl.startsWith("blob:") ? photoUrl : undefined;

    const reportPayload = {
      submissionId: reportSubmissionId,
      animalId: selectedAnimal.id,
      symptoms,
      durationDays,
      affectedCount,
      herdSize,
      mortalityCount,
      temperature: temperature || undefined,
      activity: activity || undefined,
      heartRate: heartRate || undefined,
      photoUrl: persistentPhotoUrl,
      yoloVisionResult: yoloVisionResult || undefined,
      gpsLat: gpsLat || undefined,
      gpsLng: gpsLng || undefined,
      iotData:
        temperature || activity
          ? {
              iotDeviceId: selectedAnimal.iotDeviceId || undefined,
              temperature: temperature || null,
              activity: activity || null,
              source: iotSource || (selectedAnimal.iotDeviceId ? "REAL" : "MANUAL"),
              readingId: iotReadingId || undefined,
            }
          : undefined,
    };

    try {
      const isOnline = navigator.onLine && (await checkServerReachability());

      if (!isOnline) {
        await enqueueReport({
          id: reportSubmissionId,
          submissionId: reportSubmissionId,
          clerkUserId: activeClerkUserId,
          animalId: selectedAnimal.id,
          symptoms,
          durationDays,
          affectedCount,
          herdSize,
          mortalityCount,
          heartRate: heartRate || null,
          photoBlob: photoBlob || null,
          photoUrl: persistentPhotoUrl || null,
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
          iotData: {
            temperature: temperature || null,
            activity: activity || null,
            source: iotSource || (selectedAnimal.iotDeviceId ? "REAL" : "MANUAL"),
            readingId: iotReadingId || null,
          },
          status: "QUEUED",
          retryCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        setSubmitResult({
          success: true,
          offlineQueued: true,
          submissionId: reportSubmissionId,
        });
        setSubmitting(false);
        return;
      }

      if (initialRequestId) {
        const res = await completeAssistanceWithReportAction({
          submissionId: reportSubmissionId,
          requestId: initialRequestId,
          animalId: selectedAnimal.id,
          symptoms,
          durationDays,
          affectedCount,
          herdSize,
          mortalityCount,
          heartRate: heartRate || null,
          gpsLat: gpsLat || null,
          gpsLng: gpsLng || null,
          photoUrl: persistentPhotoUrl || null,
          iotData: {
            temperature: temperature || null,
            activity: activity || null,
          },
          expectedUpdatedAt,
        });

        if (res.success && res.caseId) {
          setSubmitResult({
            success: true,
            caseId: res.caseId,
            caseNumber: res.caseNumber,
            status: res.status,
          });
        } else {
          setFormError(res.error || "Report submission failed. Please try again.");
        }
      } else {
        const res = await createCaseReportAction(reportPayload);
        if (res.success) {
          setSubmitResult(res);
        } else {
          setFormError(res.error || "Report submission failed. Please try again.");
        }
      }
    } catch (err: unknown) {
      const isNetworkError =
        typeof navigator !== "undefined" && !navigator.onLine;

      if (isNetworkError) {
        try {
          await enqueueReport({
            id: reportSubmissionId,
            submissionId: reportSubmissionId,
            clerkUserId: activeClerkUserId,
            animalId: selectedAnimal.id,
            symptoms,
            durationDays,
            affectedCount,
            herdSize,
            mortalityCount,
            heartRate: heartRate || null,
            photoBlob: photoBlob || null,
            photoUrl: photoUrl || null,
            gpsLat: gpsLat || null,
            gpsLng: gpsLng || null,
            iotData: {
              temperature: temperature || null,
              activity: activity || null,
            },
            status: "QUEUED",
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          setSubmitResult({
            success: true,
            offlineQueued: true,
            submissionId: reportSubmissionId,
          });
          return;
        } catch {
          // IndexedDB fallback
        }
      }

      setFormError(err instanceof Error ? err.message : "Unable to contact the server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Render Offline Enqueued Screen
  if (submitResult?.offlineQueued) {
    return (
      <Card className="max-w-xl mx-auto w-full border-amber-200/80 bg-white/90 dark:bg-[#0A1A12]/90 backdrop-blur-xl text-center shadow-md p-6 space-y-5 rounded-3xl text-[#191F1C] dark:text-[#F4EEE1]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <WifiOff className="h-8 w-8" />
          </div>

          <Badge className="text-xs px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 font-semibold">
            Saved on this device (QUEUED_OFFLINE)
          </Badge>

          <CardTitle className="text-xl font-bold font-display">
            {t("savedLocallyTitle")}
          </CardTitle>

          <CardDescription className="text-xs text-stone-600 dark:text-[#AECEB9] max-w-sm">
            {t("savedLocallyDesc", { tag: selectedAnimal?.tag || "" })}
          </CardDescription>
        </div>

        <div className="bg-black/[0.02] dark:bg-white/[0.04] p-4 rounded-2xl border border-black/8 dark:border-white/10 text-xs text-left space-y-2 text-stone-700 dark:text-[#AECEB9]">
          <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
            <span className="text-stone-500">Animal tag:</span>
            <span className="font-bold text-stone-900 dark:text-[#F4EEE1]">{selectedAnimal?.tag} ({selectedAnimal?.species})</span>
          </div>
          <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
            <span className="text-stone-500">Recorded symptoms:</span>
            <span className="font-medium text-amber-800 dark:text-amber-400">{symptoms.join(", ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Submission ID:</span>
            <span className="font-mono text-stone-600 dark:text-[#8EAA97]">{submissionId}</span>
          </div>
        </div>

        <Button
          onClick={() => {
            setSubmitResult(null);
            setAiState(null);
            setSelectedAnimal(null);
            setSymptoms([]);
            setStep(1);
          }}
          className="w-full text-xs bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl min-h-[44px]"
        >
          {t("createAnotherReport")}
        </Button>
      </Card>
    );
  }

  // Render Success Screen after Case creation
  if (submitResult?.success) {
    return (
      <ReportResultFlow
        submitResult={submitResult}
        selectedAnimal={selectedAnimal}
        symptoms={symptoms}
        durationDays={durationDays}
        temperature={temperature}
        activity={activity}
        heartRate={heartRate}
        photoUrl={photoUrl}
        yoloVisionResult={yoloVisionResult}
        aiState={aiState}
        onReset={resetReport}
        mode={mode}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* TWO PROMINENT REPORT CHOICES (Farmer Path 1 vs Path 2) */}
      {mode === "farmer" && (
        <div className="rounded-3xl border border-[#1E3A2B]/15 dark:border-white/10 bg-white/70 dark:bg-[#0A1A12]/70 backdrop-blur-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#2D5A3C]/10 dark:bg-[#8EE6A3]/15 text-[#2D5A3C] dark:text-[#8EE6A3] border-[#2D5A3C]/20 text-[10px] font-bold">
                {t("reportOptions")}
              </Badge>
              <h3 className="text-sm font-bold text-[#15271E] dark:text-[#F4EEE1]">{t("needHelpAgent")}</h3>
            </div>
            <p className="text-xs text-stone-600 dark:text-[#AECEB9]">
              {t("cantFillReportDesc")}
            </p>
          </div>
          <Link href="/farmer/request-help" prefetch={true} className="shrink-0">
            <Button size="sm" variant="outline" className="text-xs border-[#D9A441]/40 bg-white/80 dark:bg-[#15271E] text-[#9B6E18] dark:text-[#E5A93C] hover:bg-amber-50 dark:hover:bg-[#1A3326] font-semibold gap-1.5 rounded-xl h-10 shadow-xs cursor-pointer">
              <PhoneCall className="h-3.5 w-3.5 text-[#B87A1E] dark:text-[#E5A93C]" />
              <span>{t("callFieldAgent")}</span>
            </Button>
          </Link>
        </div>
      )}

      {/* 5-STEP WIZARD LIQUID GLASS CARD */}
      <Card className="max-w-3xl mx-auto w-full rounded-[28px] bg-white/80 dark:bg-[#0A1A12]/80 backdrop-blur-[28px] border border-white/80 dark:border-white/10 shadow-[inset_0_1.5px_0.5px_rgba(255,255,255,1),0_12px_32px_rgba(30,58,43,0.08)] dark:shadow-[inset_0_1.5px_0.5px_rgba(255,255,255,0.15),0_16px_40px_rgba(0,0,0,0.5)] overflow-hidden text-[#191F1C] dark:text-[#F4EEE1]">
        {/* Animated 5-Step Progress Bar */}
        <div className="w-full bg-stone-100 dark:bg-white/5 h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#2D5A3C] to-[#1E3A2B] dark:from-[#3F6B4A] dark:to-[#8EE6A3] h-full transition-all duration-300 ease-out"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        <CardHeader className="border-b border-black/8 dark:border-white/10 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Badge className="border-[#2D5A3C]/20 text-[#2D5A3C] dark:text-[#8EE6A3] bg-[#2D5A3C]/10 dark:bg-[#8EE6A3]/10 text-[10px] uppercase font-mono shrink-0">
              {t("stepOf", { step, mode: mode === "farmer" ? t("farmerReportMode") : t("fieldInspectionMode") })}
            </Badge>
            <div className="flex items-center gap-1.5 shrink-0" aria-label="Step progress indicator">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    s < step
                      ? "bg-[#2D5A3C] dark:bg-[#8EE6A3]"
                      : s === step
                      ? "bg-[#2D5A3C] dark:bg-[#8EE6A3] ring-2 ring-[#2D5A3C]/30 dark:ring-[#8EE6A3]/40 scale-125"
                      : "bg-stone-200 dark:bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>

          <CardTitle className="text-xl font-bold text-[#15271E] dark:text-[#F4EEE1] tracking-tight mt-1 font-display">
            {step === 1 && t("step1Title")}
            {step === 2 && t("step2Title")}
            {step === 3 && t("step3Title")}
            {step === 4 && t("step4Title")}
            {step === 5 && t("step5Title")}
          </CardTitle>

          <CardDescription className="text-xs text-stone-500 dark:text-[#8EAA97]">
            {step === 1 && t("step1Desc")}
            {step === 2 && t("step2Desc")}
            {step === 3 && t("step3Desc")}
            {step === 4 && t("step4Desc")}
            {step === 5 && t("step5Desc")}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {formError && (
            <div className="p-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 text-red-800 dark:text-red-300 text-xs flex items-center gap-3 animate-fade-in">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {resetNotice && !formError && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/40 p-3 text-xs text-emerald-800 dark:text-emerald-300" role="status">
              {resetNotice}
            </div>
          )}

          <div key={step} className="animate-fade-in space-y-6">
            {/* STEP 1: Select Sick Animal */}
            {step === 1 && (
              mode === "farmer" ? (
                <FarmerAnimalSelector
                  key={animalSelectorKey}
                  selectedAnimal={selectedAnimal}
                  onSelectAnimal={handleAnimalSelected}
                  onRemoveAnimal={() => {
                    setSelectedAnimal(null);
                    setFormError("");
                    setResetNotice("Animal selection cleared. Select an animal to continue.");
                  }}
                  onNewReport={resetReport}
                />
              ) : (
                <AgentAnimalSelector
                  selectedAnimal={selectedAnimal}
                  onSelectAnimal={handleAnimalSelected}
                />
              )
            )}

            {/* STEP 2 (MERGE 1): Symptoms & Duration */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Top Section: Observed Symptoms Checklist */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3C] dark:text-[#8EE6A3]">
                      Clinical Symptoms
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-[#8EAA97]">
                      {symptoms.length > 0 ? `${symptoms.length} selected` : "Select at least 1"}
                    </span>
                  </div>
                  <SymptomSelector
                    selectedSymptoms={symptoms}
                    onChangeSymptoms={(syms) => {
                      setSymptoms(syms);
                      setFormError("");
                    }}
                  />
                </div>

                {/* Bottom Section: Duration & Herd Size Counts */}
                <div className="pt-4 border-t border-black/8 dark:border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3C] dark:text-[#8EE6A3]">
                      Duration & Affected Livestock
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Duration Days */}
                    <div className="space-y-1.5">
                      <Label htmlFor="duration" className="text-xs text-[#15271E] dark:text-[#F4EEE1] font-bold">
                        {t("howLongSymptoms")}
                      </Label>
                      <select
                        id="duration"
                        value={durationDays}
                        onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                        className="w-full bg-white dark:bg-[#0A1A12] border border-black/15 dark:border-white/15 text-xs text-[#191F1C] dark:text-[#F4EEE1] rounded-xl p-3 focus:border-[#2D5A3C] focus:outline-none min-h-[44px] shadow-xs"
                      >
                        <option value={1}>{t("today1Day")}</option>
                        <option value={2}>{t("twoDays")}</option>
                        <option value={3}>{t("threeDays")}</option>
                        <option value={5}>{t("fourToFiveDays")}</option>
                        <option value={7}>{t("moreThanWeek")}</option>
                      </select>
                    </div>

                    {/* Affected Count */}
                    <div className="space-y-1.5">
                      <Label htmlFor="affected" className="text-xs text-[#15271E] dark:text-[#F4EEE1] font-bold">
                        {t("numAffectedAnimals")}
                      </Label>
                      <Input
                        id="affected"
                        type="number"
                        min={1}
                        value={affectedCount}
                        onChange={(e) => setAffectedCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="bg-white dark:bg-[#0A1A12] border-black/15 dark:border-white/15 text-xs text-[#191F1C] dark:text-[#F4EEE1] min-h-[44px] rounded-xl"
                      />
                    </div>

                    {/* Herd Size */}
                    <div className="space-y-1.5">
                      <Label htmlFor="herd" className="text-xs text-[#15271E] dark:text-[#F4EEE1] font-bold">
                        {t("totalAnimalsHerd")}
                      </Label>
                      <Input
                        id="herd"
                        type="number"
                        min={1}
                        value={herdSize}
                        onChange={(e) => setHerdSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="bg-white dark:bg-[#0A1A12] border-black/15 dark:border-white/15 text-xs text-[#191F1C] dark:text-[#F4EEE1] min-h-[44px] rounded-xl"
                      />
                    </div>

                    {/* Mortality Count */}
                    <div className="space-y-1.5">
                      <Label htmlFor="mortality" className="text-xs text-[#15271E] dark:text-[#F4EEE1] font-bold">
                        {t("deathsMortality")}
                      </Label>
                      <Input
                        id="mortality"
                        type="number"
                        min={0}
                        value={mortalityCount}
                        onChange={(e) => setMortalityCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="bg-white dark:bg-[#0A1A12] border-black/15 dark:border-white/15 text-xs text-[#191F1C] dark:text-[#F4EEE1] min-h-[44px] rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 (MERGE 2): Evidence: Photo & IoT */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Panel 1: Photo Capture */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3C] dark:text-[#8EE6A3]">
                      Photo Evidence (Optional)
                    </span>
                  </div>

                  <PhotoCapture
                    photoUrl={photoUrl}
                    onChangePhoto={(url, blob) => {
                      setPhotoUrl(url);
                      setPhotoBlob(blob);
                    }}
                    onChangePhotoUrl={setPhotoUrl}
                    onUploadStatusChange={setPhotoUploadStatus}
                    onAnalyzingChange={setIsAnalyzingPhoto}
                    onVisionResult={setYoloVisionResult}
                    submissionId={submissionId}
                    animalCategory={
                      selectedAnimal?.species?.toUpperCase().includes("DOG") ||
                      selectedAnimal?.species?.toUpperCase().includes("CAT") ||
                      selectedAnimal?.species?.toUpperCase().includes("PET")
                        ? "pet"
                        : selectedAnimal?.species || "cow"
                    }
                  />

                  {/* Hard-block warning only if the image is rejected */}
                  {isImageRejected && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                      <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-900 dark:text-red-300 uppercase tracking-wider">
                          Submission Blocked
                        </p>
                        <p className="text-xs text-red-800 dark:text-red-400 mt-1 font-medium leading-relaxed">
                          {yoloVisionResult?.message ||
                            "Invalid photo detected. You must delete this photo and upload a clear picture of the animal to proceed."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Panel 2: IoT Sensor Vitals */}
                <div className="pt-4 border-t border-black/8 dark:border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3C] dark:text-[#8EE6A3]">
                      Sensor & Vitals Telemetry (Optional)
                    </span>
                  </div>

                  <IoTInput
                    animalId={selectedAnimal?.id}
                    animalTag={selectedAnimal?.tag}
                    linkedIotDeviceId={selectedAnimal?.iotDeviceId}
                    temperature={temperature}
                    activity={activity}
                    heartRate={heartRate}
                    iotSource={iotSource}
                    iotReadingId={iotReadingId}
                    onChangeTemperature={setTemperature}
                    onChangeActivity={setActivity}
                    onChangeHeartRate={setHeartRate}
                    onChangeIotSource={setIotSource}
                    onChangeIotReadingId={setIotReadingId}
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Review Health Report */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#2D5A3C] dark:text-[#8EE6A3] uppercase tracking-wider">
                    {t("reportSummaryTitle")}
                  </h4>
                  <Badge className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[10px]">
                    Ready to Submit
                  </Badge>
                </div>

                <div className="bg-black/[0.02] dark:bg-white/[0.04] p-4 sm:p-5 rounded-2xl border border-black/8 dark:border-white/10 text-xs space-y-3 text-stone-700 dark:text-[#AECEB9]">
                  <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-stone-500 dark:text-[#8EAA97]">{t("selectedAnimalLabel")}</span>
                    <span className="font-bold text-[#15271E] dark:text-[#F4EEE1]">{selectedAnimal?.tag} ({selectedAnimal?.species})</span>
                  </div>
                  <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-stone-500 dark:text-[#8EAA97]">{t("farmVillageLabel")}</span>
                    <span className="font-medium text-[#15271E] dark:text-[#F4EEE1]">{selectedAnimal?.farmName} ({selectedAnimal?.villageName})</span>
                  </div>
                  <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-stone-500 dark:text-[#8EAA97]">{t("selectedSymptomsLabel")}</span>
                    <span className="font-semibold text-amber-800 dark:text-amber-400">{symptoms.join(", ")}</span>
                  </div>
                  <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-stone-500 dark:text-[#8EAA97]">{t("durationAndCount")}</span>
                    <span className="text-[#15271E] dark:text-[#F4EEE1]">{durationDays} days • {affectedCount} of {herdSize} affected</span>
                  </div>
                  <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-stone-500 dark:text-[#8EAA97]">{t("deathsLabel")}</span>
                    <span className={mortalityCount > 0 ? "font-bold text-red-700 dark:text-red-400" : "text-stone-600 dark:text-[#8EAA97]"}>
                      {mortalityCount}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-stone-500 dark:text-[#8EAA97]">{t("iotTelemetryLabel")}</span>
                    <span>
                      {temperature || activity || heartRate ? (
                        <span className="font-medium text-[#15271E] dark:text-[#F4EEE1] inline-flex items-center gap-1.5 flex-wrap justify-end">
                          <span>{temperature ? `${temperature}°C` : ""}{activity ? ` • Act: ${activity}` : ""}{heartRate ? ` • HR: ${heartRate}` : ""}</span>
                          {iotSource === "REAL" && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">{t("realEsp32")}</span>}
                          {iotSource === "SIMULATED" && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">{t("simulatedEsp32")}</span>}
                          {iotSource === "MANUAL" && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">{t("manual")}</span>}
                        </span>
                      ) : (
                        t("noSensorTelemetry")
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-stone-500 dark:text-[#8EAA97]">{t("photoLabel")}</span>
                    <span>{photoUrl ? t("photoAttachedReview") : t("noPhotoAttached")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-[#8EAA97] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                      <span>{t("gpsLocationLabel")}</span>
                    </span>
                    <span className="font-mono text-[11px] text-[#15271E] dark:text-[#F4EEE1]">
                      {gpsLat && gpsLng ? `${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}` : (selectedAnimal?.villageName || "Auto GPS")}
                    </span>
                  </div>
                </div>

                {/* Hard Block banner if photo was rejected */}
                {isImageRejected && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3 animate-in fade-in">
                    <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-900 dark:text-red-300 uppercase tracking-wider">
                        Submission Blocked
                      </p>
                      <p className="text-xs text-red-800 dark:text-red-400 mt-1 font-medium leading-relaxed">
                        {yoloVisionResult?.message ||
                          "Invalid photo detected. You must go back to Step 3 and remove or replace the photo before submitting."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between items-center border-t border-black/8 dark:border-white/10 pt-4">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevStep}
              disabled={submitting}
              className="gap-1 text-xs border-black/15 dark:border-white/15 bg-white/80 dark:bg-[#0A1A12]/80 text-[#15271E] dark:text-[#F4EEE1] hover:bg-stone-50 dark:hover:bg-white/10 min-h-[40px] rounded-xl cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("backBtn")}</span>
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNextStep}
              disabled={isNextButtonDisabled}
              className={`gap-1.5 text-xs font-semibold min-h-[40px] rounded-xl shadow-sm transition-all cursor-pointer ${
                isImageRejected && step === 3
                  ? "bg-stone-300 text-stone-500 cursor-not-allowed hover:bg-stone-300"
                  : "bg-[#1E3A2B] hover:bg-[#162E22] dark:bg-[#3F6B4A] dark:hover:bg-[#4E825B] text-white"
              }`}
            >
              <span>{t("nextStepBtn")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={submitting || isUploading || isAnalyzingPhoto || isImageRejected}
              onClick={handleSubmitReport}
              className={`gap-2 text-xs font-semibold shadow-sm min-h-[44px] px-5 rounded-xl transition-all cursor-pointer ${
                isImageRejected
                  ? "bg-stone-300 text-stone-500 cursor-not-allowed hover:bg-stone-300"
                  : "bg-[#1E3A2B] hover:bg-[#162E22] dark:bg-[#28543D] dark:hover:bg-[#33684C] text-white shadow-[0_4px_16px_rgba(30,58,43,0.25)]"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("submittingReport")}</span>
                </>
              ) : isImageRejected ? (
                <>
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span>Submission Blocked</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#8EE6A3]" />
                  <span>{t("submitReportBtn")}</span>
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
