"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Trash2, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import { predictYoloImage } from "@/lib/api/livestock";
import type { YoloVisionAnalysis } from "@/lib/types/livestock";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getReportCopy } from "@/lib/i18n/report";
import { useTranslations } from "next-intl";

export type PhotoUploadStatus = "idle" | "uploading" | "uploaded" | "failed";

interface PhotoCaptureProps {
  photoUrl: string | null;
  onChangePhotoUrl?: (url: string | null) => void;
  onChangePhoto?: (url: string | null, blob: Blob | null) => void;
  onVisionResult?: (result: YoloVisionAnalysis | null) => void;
  onUploadStatusChange?: (status: PhotoUploadStatus) => void;
  submissionId: string;
  animalCategory?: string;
}

export function PhotoCapture({
  photoUrl,
  onChangePhotoUrl,
  onChangePhoto,
  onVisionResult,
  onUploadStatusChange,
  submissionId,
  animalCategory = "cow"
}: PhotoCaptureProps) {
  const { locale } = useLocale();
  const copy = getReportCopy(locale);
  const t = useTranslations("reporting");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<PhotoUploadStatus>(photoUrl ? "uploaded" : "idle");
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [visionResult, setVisionResult] = useState<YoloVisionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  const setStatus = (status: PhotoUploadStatus) => {
    setUploadStatus(status);
    onUploadStatusChange?.(status);
  };

  const processFile = async (file: File) => {
    setError(null);
    setCurrentFile(file);

    // 1. Client-side UX Validation
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setError(`Unsupported image format (${file.type || "unknown"}). Please upload a JPEG, PNG, or WebP photo.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File size (${sizeMb} MB) exceeds the 10 MB maximum limit. Please select a smaller photo.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Set immediate local preview and notify parent of raw blob for offline resilience
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    onChangePhoto?.(null, file);
    onChangePhotoUrl?.(null);
    setStatus("uploading");

    // 3. Trigger AI Vision Prediction in parallel
    const runVision = async () => {
      try {
        setAnalyzing(true);
        const result = await predictYoloImage(file, animalCategory);
        if (result) {
          setVisionResult(result);
          onVisionResult?.(result);
        }
      } catch (visionErr) {
        console.warn("[PhotoCapture AI Warning]:", visionErr);
      } finally {
        setAnalyzing(false);
      }
    };

    runVision();

    try {
      // 4. Attempt upload to secure endpoint (private Vercel Blob)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("submissionId", submissionId);

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image to secure storage.");
      }

      // 5. Update parent state with durable private storage reference
      onChangePhoto?.(data.url, file);
      onChangePhotoUrl?.(data.url);
      setStatus("uploaded");
      setError(null);
    } catch (err: unknown) {
      // On upload failure: retain raw Blob in parent state for offline IndexedDB queue if offline,
      // and display localized retry prompt without instructing user to make Blob public
      onChangePhoto?.(null, file);
      onChangePhotoUrl?.(null);
      setStatus("failed");
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      if (isOffline) {
        setError("Network offline: Photo saved locally on device and will sync automatically when reconnected.");
      } else {
        const errorMsg = err instanceof Error ? err.message : "";
        setError(
          copy.photoUploadFailed ||
          (errorMsg ? `Photo upload failed: ${errorMsg}. Please try uploading again.` : "Photo upload failed. Your photo is still available for retry. Please try uploading again.")
        );
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRetry = () => {
    if (currentFile) {
      processFile(currentFile);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemovePhoto = () => {
    setLocalPreview(null);
    setCurrentFile(null);
    setVisionResult(null);
    setError(null);
    setStatus("idle");
    onVisionResult?.(null);
    onChangePhoto?.(null, null);
    onChangePhotoUrl?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const displayImage = localPreview || photoUrl;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-emerald-700" />
          <span>{t("lesionInspectionPhoto")}</span>
        </label>
        <span className="text-[11px] text-stone-500 font-medium">{t("photoOptional")}</span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error display with localized retry */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-fade-in shadow-2xs">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <p className="font-medium text-red-900">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={uploadStatus === "uploading"}
              className="h-7 text-xs border-red-300 bg-white text-red-800 hover:bg-red-50 rounded-xl cursor-pointer font-semibold gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              <span>{copy.photoRetry || "Try again"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Preview or Upload Box */}
      {displayImage ? (
        <div className="relative rounded-2xl overflow-hidden border border-[#E5E0D8] bg-[#FAF8F3] max-h-64 flex flex-col items-center justify-center p-2 shadow-2xs animate-fade-in group">
          {uploadStatus === "uploading" && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 text-emerald-700 animate-spin" />
              <span className="text-xs text-stone-700 font-medium">{copy.photoUploading || "Uploading image securely..."}</span>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImage}
            alt="Animal Health Inspection Preview"
            className="max-h-56 object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
          />

          {/* Upload Status Badge */}
          {uploadStatus === "uploaded" && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-emerald-600 text-white border-emerald-500 backdrop-blur-sm gap-1 px-2.5 py-0.5 shadow-md text-[10px] font-bold">
                <CheckCircle2 className="h-3 w-3" />
                <span>{copy.photoUploaded || "Photo uploaded securely"}</span>
              </Badge>
            </div>
          )}

          {visionResult && !analyzing && (
            <div className="absolute bottom-3 left-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Badge
                className={`${
                  visionResult.primary_prediction?.startsWith("Rejected")
                    ? "bg-red-600/90 text-white border-red-400"
                    : "bg-emerald-600/90 text-white border-emerald-400"
                } backdrop-blur-sm gap-1.5 px-2.5 py-1 shadow-lg`}
              >
                {visionResult.primary_prediction?.startsWith("Rejected") ? (
                  <ShieldAlert className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span className="text-[10px] font-bold tracking-wide">
                  AI: {visionResult.primary_prediction}{" "}
                  {visionResult.confidence > 0 ? `(${Math.round(visionResult.confidence)}%)` : ""}
                </span>
              </Badge>
            </div>
          )}

          {analyzing && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-blue-600/90 text-white border-blue-400 backdrop-blur-sm gap-1.5 px-2.5 py-1 shadow-lg animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px] font-bold tracking-wide">{t("aiAnalyzing")}</span>
              </Badge>
            </div>
          )}

          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemovePhoto}
              disabled={uploadStatus === "uploading"}
              className="h-8 w-8 p-0 rounded-full bg-red-700 hover:bg-red-800 text-white shadow-md cursor-pointer"
              title={t("removePhotoTitle")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => uploadStatus !== "uploading" && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center gap-3 min-h-[140px] hover-lift-sm ${
            isDragging
              ? "border-emerald-600 bg-emerald-50/60 scale-[1.01]"
              : "border-[#D9D3C7] bg-[#FAF8F3]/70 hover:border-emerald-600 hover:bg-emerald-50/40"
          }`}
        >
          <div className="h-12 w-12 rounded-2xl bg-white border border-[#E5E0D8] flex items-center justify-center text-emerald-700 shadow-2xs transition-transform duration-200 group-hover:scale-110">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-900">{t("takePhotoOrDrag")}</p>
            <p className="text-[11px] text-stone-500 max-w-xs mt-0.5">
              {t("clearPhotosHelp")}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" className="text-xs gap-1.5 border-[#D9D3C7] bg-white text-stone-800 min-h-[36px] rounded-xl shadow-2xs hover-lift-sm">
              <Camera className="h-3.5 w-3.5 text-emerald-700" />
              <span>{t("cameraBtn")}</span>
            </Button>
            <Button type="button" size="sm" variant="outline" className="text-xs gap-1.5 border-[#D9D3C7] bg-white text-stone-800 min-h-[36px] rounded-xl shadow-2xs hover-lift-sm">
              <Upload className="h-3.5 w-3.5" />
              <span>{t("galleryBtn")}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

