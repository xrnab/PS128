"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Play, Activity, Radio } from "lucide-react";
import { useTranslations } from "next-intl";

export interface DemoVideoItem {
  id: string;
  titleKey: string;
  defaultTitle: string;
  tabKey: string;
  defaultTabLabel: string;
}

export const DEMO_VIDEOS: readonly DemoVideoItem[] = [
  {
    id: "https://youtu.be/x6H0suXY7SI",
    titleKey: "video1Title",
    defaultTitle: "PS128 Maitri IOT Demo",
    tabKey: "tab1",
    defaultTabLabel: "IoT Hardware & Telemetry",
  },
  {
    id: "x6H0suXY7SI",
    titleKey: "video2Title",
    defaultTitle: "PS128 Field Intelligence Walkthrough",
    tabKey: "tab2",
    defaultTabLabel: "Field Intelligence",
  },
] as const;

export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return "";
  const trimmed = urlOrId.trim();
  const regExp = /(?:youtu\.be\/|(?:www\.)?youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : trimmed;
}

interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  const t = useTranslations("demoVideo");
  const [activeTab, setActiveTab] = useState<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape & Lock body scrolling
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Simple focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Initial focus on close button
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const currentVideo = DEMO_VIDEOS[activeTab] || DEMO_VIDEOS[0];
  const videoId = extractYouTubeId(currentVideo.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-video-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col liquid-glass-dark rounded-2xl sm:rounded-3xl border border-white/25 shadow-2xl p-3 sm:p-5 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Activity className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="demo-video-title"
                className="text-sm sm:text-base font-bold text-white tracking-tight truncate"
              >
                {t("modalTitle")}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-[#F4EEE1]/70">
                <Radio className="h-3 w-3 text-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">{t("telemetryTag")}</span>
              </div>
            </div>
          </div>

          {/* Close Button with >= 44px touch target */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="touch-target min-h-[44px] min-w-[44px] h-11 w-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 text-white/80 hover:text-white border border-white/15 transition-all duration-200 cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Tab Switcher */}
        <div className="py-2.5 sm:py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {DEMO_VIDEOS.map((video, index) => {
            const isActive = activeTab === index;
            const tabLabel = t(video.tabKey as Parameters<typeof t>[0]);
            return (
              <button
                key={video.titleKey}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`touch-target min-h-[44px] px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-white/25 text-white border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_14px_rgba(0,0,0,0.25)] scale-[1.01]"
                    : "bg-white/5 text-white/70 hover:text-white hover:bg-white/12 border border-white/10 active:scale-[0.98]"
                }`}
              >
                <Play className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400 fill-emerald-400" : "text-white/60"}`} />
                <span>{tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Responsive 16:9 Video Canvas (Strictly maintained at 320px+) */}
        <div className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-black/80 shadow-inner border border-white/15 flex items-center justify-center">
          {videoId ? (
            <iframe
              key={videoId + activeTab}
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
              title={t(currentVideo.titleKey as Parameters<typeof t>[0])}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="text-stone-400 text-xs text-center p-4">
              Video stream unavailable.
            </div>
          )}
        </div>

        {/* Video Title & Footer Info */}
        <div className="pt-2.5 sm:pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-white/70">
          <span className="font-medium text-white truncate">
            {t(currentVideo.titleKey as Parameters<typeof t>[0])}
          </span>
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            1080p IoT Telemetry Stream
          </span>
        </div>
      </div>
    </div>
  );
}
