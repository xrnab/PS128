"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  const [shouldShow, setShouldShow] = useState(false);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [isExiting, setIsExiting] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [progress, setProgress] = useState(0);

  const dismiss = useCallback(() => {
    setIsExiting(true);
    const timer = setTimeout(() => {
      setHasFinished(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Support query param ?intro=true or ?splash=1 to force replay during dev/testing
    const urlParams = new URLSearchParams(window.location.search);
    const forceReplay = urlParams.get("intro") === "true" || urlParams.get("splash") === "1";

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion && !forceReplay) {
      return;
    }

    const showTimer = window.setTimeout(() => setShouldShow(true), 0);

    // Timeline configuration (Total ~3.6s)
    // 0.0s - 0.6s: Phase 0 (Identity)
    // 0.6s - 1.3s: Phase 1 (Animal Health Vital)
    // 1.3s - 2.0s: Phase 2 (Field Connections)
    // 2.0s - 2.7s: Phase 3 (Geographic Intelligence & Anomaly Alert)
    // 2.7s - 3.4s: Phase 4 (Mission Resolution)
    // 3.4s - 3.8s: Smooth Exit

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

    // Escape key listener for immediate dismissal
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
  }, [dismiss]);

  // If not mounted yet (SSR) or already finished, do not render overlay
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
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(74, 85, 66, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(74, 85, 66, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: "36px 36px",
      }}
    >
      {/* Top Hairline Progress Bar */}
      <div className="w-full h-1 bg-[#E2DCCE] relative">
        <div
          className="h-full bg-[#274C36] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top Institutional Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-[#D8D1BF]/70 bg-[#F3EFE5]/85 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-2 h-2 rounded-full bg-[#274C36] animate-pulse" />
          <span className="text-[11px] font-mono font-medium tracking-wider text-[#3F4839] uppercase">
            National Livestock Health & Surveillance Architecture
          </span>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="group flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-[#5E6655] hover:text-[#20271F] bg-[#EAE4D5]/80 hover:bg-[#E1DAC8] border border-[#D5CDBD] rounded-xs transition-colors cursor-pointer"
        >
          <span>Skip</span>
          <span className="text-[10px] text-[#818978] hidden sm:inline">(Esc)</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </header>

      {/* Main Cinematic Visual Stage */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full relative">
        {/* Subtle Watermark Map Rings */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className={`w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-[#274C36]/10 transition-all duration-700 ${
              phase >= 2 ? "scale-125 opacity-100" : "scale-75 opacity-20"
            }`}
          />
          <div
            className={`absolute w-[440px] h-[440px] sm:w-[560px] sm:h-[560px] rounded-full border border-dashed border-[#274C36]/8 transition-all duration-1000 ${
              phase >= 3 ? "scale-100 opacity-100 rotate-45" : "scale-50 opacity-0"
            }`}
          />
        </div>

        {/* Phase Container */}
        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-2xl min-h-[380px] sm:min-h-[420px] justify-center">
          {/* Phase 0: Brand Identity (0.0s - 0.6s) */}
          <div
            className={`transition-all duration-500 ease-out flex flex-col items-center ${
              phase === 0
                ? "opacity-100 translate-y-0 scale-100"
                : phase >= 1
                ? "opacity-0 -translate-y-4 pointer-events-none absolute"
                : "opacity-0 translate-y-4"
            }`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md bg-[#E3E8D8] border border-[#B7C4A5] p-2 flex items-center justify-center shadow-xs mb-4">
              <Image
                src="/images/maitri-livestock-logo.png"
                alt="Maitri Livestock Logo"
                width={72}
                height={72}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-[#20271F] font-bold">
              MAITRI
            </h1>
            <p className="text-xs sm:text-sm font-mono tracking-widest text-[#4B5542] uppercase mt-1">
              Livestock Health & Veterinary Surveillance
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 bg-[#E7E2D3] border border-[#CEC6B1] rounded-xs text-[11px] font-mono text-[#384232]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#274C36] animate-ping" />
              <span>INITIALIZING SYSTEM TELEMETRY</span>
            </div>
          </div>

          {/* Phase 1: Animal Health (0.6s - 1.3s) */}
          <div
            className={`transition-all duration-500 ease-out flex flex-col items-center ${
              phase === 1
                ? "opacity-100 translate-y-0 scale-100"
                : phase > 1
                ? "opacity-0 -translate-y-4 pointer-events-none absolute"
                : "opacity-0 translate-y-4 pointer-events-none absolute"
            }`}
          >
            <div className="relative flex items-center justify-center w-56 h-36 sm:w-64 sm:h-40 mb-3">
              {/* Refined Veterinary Line Silhouette of Indigenous Cattle */}
              <svg
                viewBox="0 0 240 160"
                className="w-full h-full text-[#274C36]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Cattle Body Contour */}
                <path
                  d="M45 92 C42 80, 50 65, 62 60 C68 57, 72 45, 78 40 C84 35, 92 38, 96 46 C105 38, 120 38, 132 43 C145 42, 175 44, 192 60 C202 70, 206 90, 200 106 C196 114, 190 120, 185 138 L176 138 C177 122, 172 110, 166 108 C150 109, 130 110, 116 112 C112 120, 108 132, 104 138 L95 138 C97 125, 95 112, 85 106 C74 106, 60 104, 52 116 L44 116 C48 106, 46 98, 45 92 Z"
                  stroke="#274C36"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Horn & Ear detail */}
                <path
                  d="M66 50 C62 38, 54 30, 48 26 C53 34, 56 44, 58 52"
                  stroke="#274C36"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M74 48 C72 36, 68 28, 64 24 C68 32, 70 40, 71 47"
                  stroke="#274C36"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Muzzle */}
                <path
                  d="M48 65 C40 68, 36 78, 38 88 C40 92, 45 94, 50 90"
                  stroke="#274C36"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Vital Pulse Target over Thorax/Heart */}
                <circle cx="108" cy="78" r="14" stroke="#274C36" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="108" cy="78" r="5" fill="#274C36" />
                <circle cx="108" cy="78" r="22" stroke="#274C36" strokeWidth="0.8" opacity="0.3" className="animate-ping" />

                {/* ECG / Vital Wave Line */}
                <path
                  d="M92 78 L101 78 L104 70 L108 86 L112 73 L115 80 L124 78"
                  stroke="#274C36"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Live Vital Badge */}
              <div className="absolute -top-2 -right-4 px-2.5 py-1 bg-[#FBF9F3] border border-[#CBD5BE] rounded-xs shadow-xs text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#274C36] font-semibold">
                  <Activity className="w-3 h-3 text-[#274C36] animate-pulse" />
                  <span>38.5°C • NORMAL</span>
                </div>
                <span className="text-[9px] font-mono text-[#737C69] block">ID: IND-294-81</span>
              </div>
            </div>

            <div className="mt-4">
              <span className="text-[10px] font-mono tracking-widest text-[#69735E] uppercase block mb-1">
                STAGE 1 / 4
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#20271F]">
                Monitoring Animal Health
              </h2>
              <p className="text-xs font-mono text-[#4A5443] mt-1">
                Continuous physiological baselines & syndromic observations
              </p>
            </div>
          </div>

          {/* Phase 2: Field Observations (1.3s - 2.0s) */}
          <div
            className={`transition-all duration-500 ease-out flex flex-col items-center ${
              phase === 2
                ? "opacity-100 translate-y-0 scale-100"
                : phase > 2
                ? "opacity-0 -translate-y-4 pointer-events-none absolute"
                : "opacity-0 translate-y-4 pointer-events-none absolute"
            }`}
          >
            {/* 4 Connected Operational Field Nodes */}
            <div className="relative w-72 h-52 sm:w-84 sm:h-56 mb-2 flex items-center justify-center">
              {/* Central Hub */}
              <div className="w-14 h-14 rounded-full bg-[#274C36] text-[#F3EFE5] flex items-center justify-center border-2 border-[#D4DEC5] shadow-xs z-20">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>

              {/* Connecting Lines SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 220">
                <line x1="160" y1="110" x2="60" y2="45" stroke="#7A896E" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="160" y1="110" x2="260" y2="45" stroke="#7A896E" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="160" y1="110" x2="60" y2="175" stroke="#7A896E" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="160" y1="110" x2="260" y2="175" stroke="#7A896E" strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>

              {/* Node 1: Field Paravet */}
              <div className="absolute top-2 left-2 flex items-center gap-2 p-1.5 bg-[#FBF9F3] border border-[#CBD5BE] rounded-xs shadow-xs">
                <ClipboardCheck className="w-4 h-4 text-[#274C36]" />
                <span className="text-[10px] font-mono font-medium text-[#20271F]">Field Paravet</span>
              </div>

              {/* Node 2: Vet Clinical Intel */}
              <div className="absolute top-2 right-2 flex items-center gap-2 p-1.5 bg-[#FBF9F3] border border-[#CBD5BE] rounded-xs shadow-xs">
                <Stethoscope className="w-4 h-4 text-[#274C36]" />
                <span className="text-[10px] font-mono font-medium text-[#20271F]">Clinical Intel</span>
              </div>

              {/* Node 3: IoT Sensor Stream */}
              <div className="absolute bottom-2 left-2 flex items-center gap-2 p-1.5 bg-[#FBF9F3] border border-[#CBD5BE] rounded-xs shadow-xs">
                <Radio className="w-4 h-4 text-[#274C36]" />
                <span className="text-[10px] font-mono font-medium text-[#20271F]">IoT Telemetry</span>
              </div>

              {/* Node 4: Geo Coordinates */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2 p-1.5 bg-[#FBF9F3] border border-[#CBD5BE] rounded-xs shadow-xs">
                <MapPin className="w-4 h-4 text-[#274C36]" />
                <span className="text-[10px] font-mono font-medium text-[#20271F]">Geo Tagging</span>
              </div>
            </div>

            <div className="mt-3">
              <span className="text-[10px] font-mono tracking-widest text-[#69735E] uppercase block mb-1">
                STAGE 2 / 4
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#20271F]">
                Connecting Field Observations
              </h2>
              <p className="text-xs font-mono text-[#4A5443] mt-1">
                Real-time triangulation across frontline workers, vets, and sensor feeds
              </p>
            </div>
          </div>

          {/* Phase 3: Geographic & District Intelligence (2.0s - 2.7s) */}
          <div
            className={`transition-all duration-500 ease-out flex flex-col items-center ${
              phase === 3
                ? "opacity-100 translate-y-0 scale-100"
                : phase > 3
                ? "opacity-0 -translate-y-4 pointer-events-none absolute"
                : "opacity-0 translate-y-4 pointer-events-none absolute"
            }`}
          >
            {/* Cartographic Coordinate Map Grid */}
            <div className="relative w-80 h-52 sm:w-96 sm:h-56 bg-[#EDE7D9] border border-[#D5CCBA] rounded-xs p-3 mb-2 shadow-inner flex flex-col justify-between overflow-hidden">
              {/* Map Coordinates Header */}
              <div className="flex justify-between items-center text-[9px] font-mono text-[#717C67] border-b border-[#D8CEBA] pb-1">
                <span>DISTRICT SECTOR 04 • RURAL SURVEILLANCE</span>
                <span>23°34&apos;N, 87°08&apos;E</span>
              </div>

              {/* Network Graph with Alert Nodes */}
              <div className="relative flex-1 my-2">
                <svg className="w-full h-full" viewBox="0 0 300 120">
                  {/* Village Mesh Lines */}
                  <line x1="40" y1="40" x2="100" y2="25" stroke="#B8C4A9" strokeWidth="1" />
                  <line x1="100" y1="25" x2="170" y2="45" stroke="#B8C4A9" strokeWidth="1" />
                  <line x1="170" y1="45" x2="250" y2="35" stroke="#B8C4A9" strokeWidth="1" />
                  <line x1="100" y1="25" x2="120" y2="85" stroke="#B8C4A9" strokeWidth="1" />
                  <line x1="120" y1="85" x2="200" y2="90" stroke="#B8C4A9" strokeWidth="1" />
                  <line x1="170" y1="45" x2="200" y2="90" stroke="#B8C4A9" strokeWidth="1" />

                  {/* Normal Nodes (Muted Forest) */}
                  <circle cx="40" cy="40" r="4" fill="#274C36" />
                  <circle cx="100" cy="25" r="4" fill="#274C36" />
                  <circle cx="120" cy="85" r="4" fill="#274C36" />
                  <circle cx="250" cy="35" r="4" fill="#274C36" />

                  {/* Outbreak / Anomaly Cluster (Amber / Red Pulse) */}
                  <circle cx="170" cy="45" r="5" fill="#D97706" />
                  <circle cx="170" cy="45" r="10" stroke="#D97706" strokeWidth="1" opacity="0.4" className="animate-ping" />

                  <circle cx="200" cy="90" r="6" fill="#DC2626" />
                  <circle cx="200" cy="90" r="14" stroke="#DC2626" strokeWidth="1" opacity="0.5" className="animate-ping" />
                </svg>

                {/* Tactical Alert Flag */}
                <div className="absolute bottom-1 right-2 flex items-center gap-1.5 px-2 py-0.5 bg-[#FEF2F2] border border-[#F87171] rounded-xs text-[10px] font-mono text-[#991B1B] shadow-xs">
                  <AlertTriangle className="w-3 h-3 text-[#DC2626]" />
                  <span>EARLY SPIKE DETECTED • 3 HERDS</span>
                </div>
              </div>

              {/* Status Footer */}
              <div className="flex justify-between items-center text-[9px] font-mono text-[#5C6653]">
                <span>VILLAGES ACTIVE: 14</span>
                <span className="text-[#B45309] font-medium">SYNDROMIC RISK: ELEVATED (SECTOR 4)</span>
              </div>
            </div>

            <div className="mt-3">
              <span className="text-[10px] font-mono tracking-widest text-[#69735E] uppercase block mb-1">
                STAGE 3 / 4
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#20271F]">
                Building Local Health Intelligence
              </h2>
              <p className="text-xs font-mono text-[#4A5443] mt-1">
                Automated geospatial outbreak prevention and district containment
              </p>
            </div>
          </div>

          {/* Phase 4: Mission Resolution (2.7s - 3.4s) */}
          <div
            className={`transition-all duration-500 ease-out flex flex-col items-center ${
              phase === 4
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-4 pointer-events-none absolute"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E1EAD2] border border-[#B1C39A] rounded-xs mb-3 text-[11px] font-mono text-[#274C36] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#274C36]" />
              <span>SURVEILLANCE GRID SYNCHRONIZED</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#20271F] tracking-tight">
              Better care. For every animal.
            </h2>
            <p className="text-xs sm:text-sm font-sans text-[#4D5646] max-w-md mt-2">
              Empowering farmers, field agents, veterinarians, and district officials with an integrated national health registry.
            </p>

            {/* Institutional KPI Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-lg mt-6 pt-4 border-t border-[#D5CDBD]">
              <div className="p-2 sm:p-3 bg-[#FAF8F3] border border-[#D5CDBD] rounded-xs text-center">
                <span className="text-base sm:text-lg font-mono font-bold text-[#20271F] block">
                  4,280+
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono text-[#66705D] uppercase tracking-wider">
                  Herds Monitored
                </span>
              </div>
              <div className="p-2 sm:p-3 bg-[#FAF8F3] border border-[#D5CDBD] rounded-xs text-center">
                <span className="text-base sm:text-lg font-mono font-bold text-[#20271F] block">
                  100%
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono text-[#66705D] uppercase tracking-wider">
                  District Coverage
                </span>
              </div>
              <div className="p-2 sm:p-3 bg-[#FAF8F3] border border-[#D5CDBD] rounded-xs text-center">
                <span className="text-base sm:text-lg font-mono font-bold text-[#20271F] block">
                  &lt; 0.4s
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono text-[#66705D] uppercase tracking-wider">
                  Field Triage Latency
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-mono text-[#274C36] font-medium animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-[#274C36]" />
              <span>Entering Live Platform...</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Institutional Seal / Footer */}
      <footer className="w-full px-6 py-3 border-t border-[#D8D1BF]/70 bg-[#F3EFE5]/85 backdrop-blur-xs flex items-center justify-between text-[11px] font-mono text-[#69735E]">
        <div className="flex items-center gap-2">
          <span>MINISTRY OF FISHERIES, ANIMAL HUSBANDRY & DAIRYING</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>SECURE GOVERNMENT ARCHITECTURE</span>
          <span>•</span>
          <span>v2.4.0-PROD</span>
        </div>
      </footer>
    </aside>
  );
}

