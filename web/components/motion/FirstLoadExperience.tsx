"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Activity,
  ClipboardCheck,
  Stethoscope,
  Radio,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function FirstLoadExperience() {
  const pathname = usePathname();
  const [shouldShow, setShouldShow] = useState(false);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [isExiting, setIsExiting] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [progress, setProgress] = useState(0);

  const dismiss = useCallback(() => {
    setIsExiting(true);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("maitri-intro-seen", "true");
      } catch {}
    }
    const timer = setTimeout(() => {
      setHasFinished(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Never show on dashboard sub-routes (/farmer, /vet, /authority, /agent, etc.)
    const isRootLanding = pathname === "/" || pathname === "";
    const urlParams = new URLSearchParams(window.location.search);
    const forceReplay = urlParams.get("intro") === "true" || urlParams.get("splash") === "1";

    if (!isRootLanding && !forceReplay) {
      setHasFinished(true);
      return;
    }

    // Check if already seen in current session
    try {
      if (!forceReplay && sessionStorage.getItem("maitri-intro-seen") === "true") {
        setHasFinished(true);
        return;
      }
    } catch {}

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion && !forceReplay) {
      setHasFinished(true);
      return;
    }

    try {
      sessionStorage.setItem("maitri-intro-seen", "true");
    } catch {}

    const showTimer = window.setTimeout(() => setShouldShow(true), 0);

    const t1 = setTimeout(() => setPhase(1), 600);
    const t2 = setTimeout(() => setPhase(2), 1300);
    const t3 = setTimeout(() => setPhase(3), 2000);
    const t4 = setTimeout(() => setPhase(4), 2700);
    const tExit = setTimeout(() => setIsExiting(true), 3400);
    const tFinish = setTimeout(() => {
      setHasFinished(true);
    }, 3850);

    // Smooth hairline progress bar driver
    const startTime = performance.now();
    const totalDuration = 3400;
    let animationFrameId: number;

    const updateProgress = () => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      setProgress(pct);
      if (pct < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };
    animationFrameId = requestAnimationFrame(updateProgress);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(tExit);
      clearTimeout(tFinish);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname, dismiss]);

  if (!shouldShow || hasFinished) {
    return null;
  }

  return (
    <aside
      aria-label="Platform introduction"
      className={`fixed inset-0 z-[9999] flex flex-col justify-between overflow-hidden select-none bg-[#F3EFE5] transition-all duration-500 ease-out ${
        isExiting
          ? "opacity-0 pointer-events-none scale-[0.99] blur-[2px]"
          : "opacity-100 pointer-events-auto scale-100 blur-0"
      }`}
    >
      <div className="w-full h-1 bg-[#E2DCCE] relative">
        <div
          className="h-full bg-[#274C36] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#1E3A2B] text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="h-6 w-6 text-[#8EE6A3]" />
          </div>
          <span className="text-xl font-bold text-[#1E3A2B] tracking-tight">Maitri Surveillance</span>
        </div>
        <p className="text-xs text-stone-600 max-w-sm">
          National Livestock Health & Veterinary Surveillance Intelligence
        </p>
        <button
          onClick={dismiss}
          className="px-4 py-1.5 rounded-full bg-[#1E3A2B] text-white text-xs font-semibold cursor-pointer hover:bg-[#162E22] transition-colors"
        >
          Skip Introduction →
        </button>
      </div>
    </aside>
  );
}
