"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { PrintableAnimalOption } from "@/lib/actions/reporting_data";
import { FarmerAnimalSelector } from "./FarmerAnimalSelector";
import { AgentAnimalSelector } from "./AgentAnimalSelector";
import { SymptomSelector } from "./SymptomSelector";
import { PhotoCapture } from "./PhotoCapture";
import { LocationCapture } from "./LocationCapture";
import { IoTInput } from "./IoTInput";
import { createCaseReportAction, CaseReportResult } from "@/lib/actions/cases";
import { completeAssistanceWithReportAction } from "@/lib/actions/assistance";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";
import { enqueueReport } from "@/lib/offline/db";
import { checkServerReachability } from "@/lib/offline/sync";
import type { YoloVisionAnalysis } from "@/lib/types/livestock";
import { AiAssessmentCard } from "@/components/ai/AiAssessmentCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
  WifiOff,
  MapPin,
  PhoneCall,
  ShieldAlert,
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

  // Check if the backend explicitly rejected the image (e.g., "Rejected: Person" or "Rejected: Cell Phone")
  const isImageRejected = Boolean(yoloVisionResult?.primary_prediction?.startsWith("Rejected"));

  // The Next button should be disabled if an upload or AI analysis is currently processing OR if the image was rejected
  const isUploading = photoUploadStatus === "uploading";
  const isNextButtonDisabled = step === 4 ? (isUploading || isAnalyzingPhoto || isImageRejected) : false;
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);

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

  React.useEffect(() => {
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
    setGpsLat(null);
    setGpsLng(null);
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
    if (step === 1 && !selectedAnimal) {
      setFormError("Select an animal ear tag before continuing.");
      return;
    }
    if (step === 2 && symptoms.length === 0) {
      setFormError("Select at least one observed symptom.");
      return;
    }
    if (step === 3) {
      if (affectedCount > herdSize) {
        setFormError(`Affected animals (${affectedCount}) cannot exceed the herd size (${herdSize}).`);
        return;
      }
    }
    if (step === 4 && (photoUploadStatus === "uploading" || isAnalyzingPhoto)) {
      setFormError("Please wait for the photo upload and analysis to complete before proceeding.");
      return;
    }
    if (step === 4 && isImageRejected) {
      setFormError(
        yoloVisionResult?.message ||
          "Invalid photo detected. You must delete this photo and upload a clear picture of the animal to proceed."
      );
      return;
    }
    setStep((prev) => Math.min(prev + 1, 7));
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
      <Card className="max-w-xl mx-auto w-full border-amber-200 bg-white text-center shadow-sm p-6 space-y-5 rounded-3xl text-[#191F1C]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
            <WifiOff className="h-8 w-8 text-amber-700" />
          </div>

          <Badge className="text-xs px-3 py-1 bg-amber-100 text-amber-900 border-amber-300 font-semibold">
            Saved on this device (QUEUED_OFFLINE)
          </Badge>

          <CardTitle className="text-xl font-bold text-[#191F1C]">
            {t("savedLocallyTitle")}
          </CardTitle>

          <CardDescription className="text-xs text-stone-600 max-w-sm">
            {t("savedLocallyDesc", { tag: selectedAnimal?.tag || "" })}
          </CardDescription>
        </div>

        <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs text-left space-y-2 text-stone-700">
          <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
            <span className="text-stone-500">Animal tag:</span>
            <span className="font-bold text-stone-900">{selectedAnimal?.tag} ({selectedAnimal?.species})</span>
          </div>
          <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
            <span className="text-stone-500">Recorded symptoms:</span>
            <span className="font-medium text-amber-800">{symptoms.join(", ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Submission ID:</span>
            <span className="font-mono text-stone-600">{submissionId}</span>
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
    const assignedVet = submitResult.assignedVeterinarian;
    const assignmentLevel = submitResult.assignmentLevel;
    const location = submitResult.location;

    return (
      <Card className="max-w-xl mx-auto w-full border-emerald-200 bg-white text-center shadow-sm p-6 space-y-5 rounded-3xl text-[#191F1C]">
        <CardHeader className="flex flex-col items-center gap-3 p-0">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="h-9 w-9 text-emerald-700" />
          </div>

          <Badge className="text-xs px-3 py-1 bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold">
            {t("reportSubmittedTitle")}
          </Badge>

          <CardTitle className="text-2xl font-bold text-[#191F1C]">
            Case #{submitResult.caseNumber}
          </CardTitle>

          <CardDescription className="text-xs text-stone-600 max-w-sm">
            {t("reportCreatedFor", { tag: selectedAnimal?.tag || "", species: selectedAnimal?.species || "" })}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-left p-0">
          {/* Location & Routing Summary Card */}
          <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs space-y-3 text-stone-700">
            {/* 1. Location */}
            <div className="space-y-1 border-b border-[#E5E0D8] pb-2.5">
              <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <MapPin className="h-3 w-3 text-emerald-700" />
                <span>{tCommon("location")}</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="bg-white px-2.5 py-1 rounded-lg border border-[#E5E0D8]">
                  <span className="text-stone-500 block text-[10px]">Village / Town:</span>
                  <strong className="text-stone-900">{location?.villageName || selectedAnimal?.villageName || "-"}</strong>
                </div>
                <div className="bg-white px-2.5 py-1 rounded-lg border border-[#E5E0D8]">
                  <span className="text-stone-500 block text-[10px]">Block / Taluka:</span>
                  <strong className="text-stone-900">{location?.blockName || "-"}</strong>
                </div>
                <div className="bg-white px-2.5 py-1 rounded-lg border border-[#E5E0D8]">
                  <span className="text-stone-500 block text-[10px]">District:</span>
                  <strong className="text-stone-900">{location?.districtName || "-"}</strong>
                </div>
              </div>
            </div>

            {/* 2. Destination & Assigned Veterinarian */}
            <div className="space-y-1.5 border-b border-[#E5E0D8] pb-2.5">
              <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Stethoscope className="h-3 w-3 text-emerald-700" />
                <span>{t("sentToVet")}</span>
              </span>
              {assignedVet ? (
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-emerald-950 block">Dr. {assignedVet.name}</span>
                    <span className="text-[11px] text-emerald-800">
                      Assigned at: <strong className="uppercase">{assignmentLevel || "District"}</strong> level
                    </span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px]">
                    Assigned
                  </Badge>
                </div>
              ) : (
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-950">{t("awaitingVetAssignment")}</span>
                    <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-[10px]">
                      {t("pendingAssignmentBadge")}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    {t("noVetFoundQueued")}
                  </p>
                </div>
              )}
            </div>

            {/* 3. Status & Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Current status:</span>
                <Badge className="text-[10px] bg-amber-100 text-amber-900 border-amber-300 font-bold">
                  {submitResult.status === "PENDING_REVIEW" ? "Pending veterinarian review" : (submitResult.status || "Pending veterinarian review")}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Recorded symptoms:</span>
                <span className="font-medium text-amber-800">{symptoms.join(", ")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Reported at:</span>
                <span className="text-stone-600">{formatDateTime(submitResult.reportedAt || new Date(), true)}</span>
              </div>
            </div>
          </div>

          <AiAssessmentCard
            caseId={submitResult.caseId!}
            analysisResult={aiState?.analysisResult}
            visionResult={aiState?.visionResult}
            hasPhoto={Boolean(photoUrl)}
          />
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-[#E5E0D8] p-0">
          {selectedAnimal && (
            <Link href={`/farmer/animals/${selectedAnimal.id}`} className="flex-1 w-full">
              <Button variant="outline" size="sm" className="w-full text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-xl min-h-[40px] font-semibold">
                <span>{t("viewAnimalHealthHistory")}</span>
              </Button>
            </Link>
          )}
          <Button
            onClick={resetReport}
            className="flex-1 w-full text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold min-h-[40px] rounded-xl"
          >
            <span>{t("createAnotherReport")}</span>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* TWO PROMINENT REPORT CHOICES (Farmer Path 1 vs Path 2) */}
      {mode === "farmer" && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold">
                {t("reportOptions")}
              </Badge>
              <h3 className="text-sm font-bold text-stone-900">{t("needHelpAgent")}</h3>
            </div>
            <p className="text-xs text-stone-600">
              {t("cantFillReportDesc")}
            </p>
          </div>
          <Link href="/farmer/request-help" className="shrink-0">
            <Button size="sm" variant="outline" className="text-xs border-amber-300 bg-white text-amber-900 hover:bg-amber-50 font-semibold gap-1.5 rounded-xl h-10 shadow-xs cursor-pointer">
              <PhoneCall className="h-3.5 w-3.5 text-amber-700" />
              <span>{t("callFieldAgent")}</span>
            </Button>
          </Link>
        </div>
      )}

      <Card className="max-w-2xl mx-auto w-full border-[#E5E0D8] bg-white shadow-xs rounded-3xl text-[#191F1C] overflow-hidden">
        {/* Animated Step Progress Bar */}
        <div className="w-full bg-stone-100 h-1.5 overflow-hidden">
          <div
            className="bg-emerald-700 h-full transition-all duration-300 ease-out"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>

      <CardHeader className="border-b border-[#E5E0D8] pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Badge className="border-emerald-200 text-emerald-800 bg-emerald-50 text-[10px] uppercase font-mono shrink-0">
            {t("stepOf", { step, mode: mode === "farmer" ? t("farmerReportMode") : t("fieldInspectionMode") })}
          </Badge>
          <div className="flex items-center gap-1.5 shrink-0">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <span
                key={s}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  s < step
                    ? "bg-emerald-700"
                    : s === step
                    ? "bg-emerald-500 ring-2 ring-emerald-200 scale-125"
                    : "bg-stone-200"
                }`}
              />
            ))}
          </div>
        </div>

        <CardTitle className="text-xl font-bold text-[#191F1C] tracking-tight mt-1">
          {step === 1 && t("step1Title")}
          {step === 2 && t("step2Title")}
          {step === 3 && t("step3Title")}
          {step === 4 && t("step4Title")}
          {step === 5 && t("step5Title")}
          {step === 6 && t("step6Title")}
          {step === 7 && t("step7Title")}
        </CardTitle>

        <CardDescription className="text-xs text-stone-500">
          {step === 1 && t("step1Desc")}
          {step === 2 && t("step2Desc")}
          {step === 3 && t("step3Desc")}
          {step === 4 && t("step4Desc")}
          {step === 5 && t("step5Desc")}
          {step === 6 && t("step6Desc")}
          {step === 7 && t("step7Desc")}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {formError && (
          <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {resetNotice && !formError && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800" role="status">
            {resetNotice}
          </div>
        )}

        <div key={step} className="animate-fade-in space-y-4">
          {/* STEP 1: Animal Selector */}
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

          {/* STEP 2: Symptoms */}
          {step === 2 && (
            <SymptomSelector
              selectedSymptoms={symptoms}
              onChangeSymptoms={(syms) => {
                setSymptoms(syms);
                setFormError("");
              }}
            />
          )}

        {/* STEP 3: Duration & Counts */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Duration Days */}
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-xs text-stone-700 font-bold">{t("howLongSymptoms")}</Label>
                <select
                  id="duration"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                  className="w-full bg-white border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-3 focus:border-emerald-600 focus:outline-none min-h-[44px] shadow-xs"
                >
                  <option value={1}>{t("today1Day")}</option>
                  <option value={2}>{t("twoDays")}</option>
                  <option value={3}>{t("threeDays")}</option>
                  <option value={5}>{t("fourToFiveDays")}</option>
                  <option value={7}>{t("moreThanWeek")}</option>
                </select>
              </div>

              {/* Affected Count */}
              <div className="space-y-2">
                <Label htmlFor="affected" className="text-xs text-stone-700 font-bold">{t("numAffectedAnimals")}</Label>
                <Input
                  id="affected"
                  type="number"
                  min={1}
                  value={affectedCount}
                  onChange={(e) => setAffectedCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] min-h-[44px] rounded-xl"
                />
              </div>

              {/* Herd Size */}
              <div className="space-y-2">
                <Label htmlFor="herd" className="text-xs text-stone-700 font-bold">{t("totalAnimalsHerd")}</Label>
                <Input
                  id="herd"
                  type="number"
                  min={1}
                  value={herdSize}
                  onChange={(e) => setHerdSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] min-h-[44px] rounded-xl"
                />
              </div>

              {/* Mortality Count */}
              <div className="space-y-2">
                <Label htmlFor="mortality" className="text-xs text-stone-700 font-bold">{t("deathsMortality")}</Label>
                <Input
                  id="mortality"
                  type="number"
                  min={0}
                  value={mortalityCount}
                  onChange={(e) => setMortalityCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="bg-white border-[#D9D3C7] text-xs text-[#191F1C] min-h-[44px] rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Photo Capture */}
        {step === 4 && (
          <div className="space-y-4">
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

            {/* Only show this hard-block warning if the image is rejected */}
            {isImageRejected && (
              <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-900 uppercase tracking-wider">
                    Submission Blocked
                  </p>
                  <p className="text-xs text-red-800 mt-1 font-medium leading-relaxed">
                    {yoloVisionResult?.message ||
                      "Invalid photo detected. You must delete this photo and upload a clear picture of the animal to proceed."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: GPS Location */}
        {step === 5 && (
          <LocationCapture
            gpsLat={gpsLat}
            gpsLng={gpsLng}
            onChangeLocation={(lat, lng) => {
              setGpsLat(lat);
              setGpsLng(lng);
            }}
          />
        )}

        {/* STEP 6: IoT Telemetry */}
        {step === 6 && (
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
        )}

        {/* STEP 7: Review & Submit */}
        {step === 7 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              {t("reportSummaryTitle")}
            </h4>

            <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#E5E0D8] text-xs space-y-2.5 text-stone-700">
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">{t("selectedAnimalLabel")}</span>
                <span className="font-bold text-stone-900">{selectedAnimal?.tag} ({selectedAnimal?.species})</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">{t("farmVillageLabel")}</span>
                <span className="font-medium text-stone-900">{selectedAnimal?.farmName} ({selectedAnimal?.villageName})</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">{t("selectedSymptomsLabel")}</span>
                <span className="font-medium text-amber-800">{symptoms.join(", ")}</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">{t("durationAndCount")}</span>
                <span>{durationDays} days • {affectedCount} of {herdSize} affected</span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">{t("deathsLabel")}</span>
                <span className={mortalityCount > 0 ? "font-bold text-red-700" : "text-stone-600"}>
                  {mortalityCount}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">{t("iotTelemetryLabel")}</span>
                <span>
                  {temperature || activity || heartRate ? (
                    <span className="font-medium text-stone-900 inline-flex items-center gap-1.5 flex-wrap justify-end">
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
              <div className="flex justify-between border-b border-[#E5E0D8] pb-2">
                <span className="text-stone-500">{t("photoLabel")}</span>
                <span>{photoUrl ? t("photoAttachedReview") : t("noPhotoAttached")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">{t("gpsLocationLabel")}</span>
                <span>{gpsLat && gpsLng ? `${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}` : t("villageDefaultLocation")}</span>
              </div>
            </div>

            {/* Step 7 Hard Block banner if photo was rejected */}
            {isImageRejected && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-in fade-in">
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-900 uppercase tracking-wider">
                    Submission Blocked
                  </p>
                  <p className="text-xs text-red-800 mt-1 font-medium leading-relaxed">
                    {yoloVisionResult?.message ||
                      "Invalid photo detected. You must go back to Step 4 and remove or replace the photo before submitting."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t border-[#E5E0D8] pt-4">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevStep}
            disabled={submitting}
            className="gap-1 text-xs border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 min-h-[40px] rounded-xl cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("backBtn")}</span>
          </Button>
        ) : (
          <div />
        )}

        {step < 7 ? (
          <Button
            type="button"
            size="sm"
            onClick={handleNextStep}
            disabled={isNextButtonDisabled}
            className={`gap-1.5 text-xs font-semibold min-h-[40px] rounded-xl shadow-sm transition-colors ${
              isImageRejected && step === 4
                ? "bg-stone-300 text-stone-500 cursor-not-allowed hover:bg-stone-300"
                : "bg-[#006B4D] hover:bg-[#005a41] text-white cursor-pointer"
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
            className={`gap-2 text-xs font-semibold shadow-sm min-h-[44px] rounded-xl transition-colors ${
              isImageRejected
                ? "bg-stone-300 text-stone-500 cursor-not-allowed hover:bg-stone-300"
                : "bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
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
                <CheckCircle2 className="h-4 w-4" />
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
