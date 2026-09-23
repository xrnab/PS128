"use client";

import React, { useState, useEffect } from "react";
import { Image as ImageIcon, AlertCircle, Loader2, Maximize2, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface CasePhotoViewerProps {
  caseId?: string;
  photoUrl?: string | null;
  alt?: string;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
}

export function CasePhotoViewer({
  caseId,
  photoUrl,
  alt = "Clinical animal health photo",
  className = "",
  aspectRatio = "auto",
}: CasePhotoViewerProps) {
  const t = useTranslations("common.photo");
  const isPrivateBlobUrl = (url?: string | null): boolean => {
    if (!url) return false;
    return (
      url.includes("blob.vercel-storage.com") ||
      url.includes("mock-blob.vercel-storage.com") ||
      url.startsWith("cases/")
    );
  };

  const computeInitialSrc = (): string | null => {
    if (!photoUrl) return null;
    if (
      photoUrl.startsWith("data:") ||
      photoUrl.startsWith("blob:") ||
      (photoUrl.startsWith("/") && !photoUrl.startsWith("//"))
    ) {
      return photoUrl;
    }
    if (isPrivateBlobUrl(photoUrl)) {
      return null;
    }
    return photoUrl;
  };

  const [src, setSrc] = useState<string | null>(computeInitialSrc());
  const [loading, setLoading] = useState<boolean>(Boolean(caseId));
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!caseId) return;

    let isMounted = true;
    const proxyUrl = `/api/media/photo/${caseId}`;
    fetch(proxyUrl)
      .then(async (res) => {
        if (!res.ok) {
          // If proxy fails, only use direct photoUrl if safe (data URI or local path)
          if (photoUrl && !isPrivateBlobUrl(photoUrl) && (photoUrl.startsWith("data:") || photoUrl.startsWith("/"))) {
            if (isMounted) {
              setSrc(photoUrl);
              setLoading(false);
            }
            return;
          }
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Unable to stream photo (HTTP ${res.status})`);
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setSrc(objectUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (photoUrl && !isPrivateBlobUrl(photoUrl) && (photoUrl.startsWith("data:") || photoUrl.startsWith("/"))) {
            setSrc(photoUrl);
            setLoading(false);
          } else {
            setError(err.message || "Unable to load case photograph.");
            setLoading(false);
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [caseId, photoUrl]);

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "min-h-[180px] max-h-[380px]",
  }[aspectRatio];

  // 1. Missing Photo State
  if (!loading && !src && !error) {
    return (
      <div
        className={`w-full rounded-2xl border border-[#E5E0D8] bg-[#FAF8F3] p-6 flex flex-col items-center justify-center text-center gap-2 ${aspectClasses} ${className}`}
      >
        <div className="h-10 w-10 rounded-xl bg-white border border-[#E5E0D8] flex items-center justify-center text-stone-400 shadow-2xs">
          <ImageIcon className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-stone-700">{t("noPhoto")}</p>
        <p className="text-[11px] text-stone-500 max-w-xs">
          {t("noPhotoDesc")}
        </p>
      </div>
    );
  }

  // 2. Error State
  if (!loading && error && !src) {
    return (
      <div
        className={`w-full rounded-2xl border border-amber-200 bg-amber-50/50 p-6 flex flex-col items-center justify-center text-center gap-2 ${aspectClasses} ${className}`}
      >
        <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-amber-900">{t("previewUnavailable")}</p>
        <p className="text-[11px] text-amber-800/80 max-w-xs">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative group w-full rounded-2xl overflow-hidden border border-[#E5E0D8] bg-slate-950 flex items-center justify-center ${aspectClasses} ${className}`}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-[#FAF8F3]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="h-6 w-6 text-emerald-700 animate-spin" />
            <span className="text-xs text-stone-700 font-medium">Loading clinical photograph securely...</span>
          </div>
        )}

        {/* Loaded Image */}
        {src && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-contain max-h-[380px] rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
              loading="lazy"
              onError={() => {
                // If direct loading fails, reset or show friendly fallback
                setError("Remote photograph stream unreachable.");
              }}
            />

            {/* Privacy Badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 text-[10px] font-semibold text-emerald-400 shadow-md">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t("protectedMedia")}</span>
            </div>

            {/* Lightbox Trigger Button */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLightboxOpen(true)}
              className="absolute top-3 right-3 h-8 w-8 p-0 rounded-full bg-white/90 border-[#D9D3C7] text-stone-700 hover:text-stone-900 hover:bg-stone-100 shadow-md backdrop-blur-sm cursor-pointer"
              title={t("expand")}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && src && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-white hover:bg-white/20 rounded-full h-9 w-9 p-0 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[82vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
            />

            <div className="mt-3 flex items-center justify-between w-full text-xs text-stone-300 px-2">
              <span className="truncate max-w-sm">{alt}</span>
              <span className="text-emerald-400 flex items-center gap-1.5 font-mono text-xs">
                <ShieldCheck className="h-4 w-4" />
                Maitri Secure Clinical Stream
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
