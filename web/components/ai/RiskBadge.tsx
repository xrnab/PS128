"use client";

import React from "react";

interface RiskBadgeProps {
  level?: string | null;
  className?: string;
}

export function RiskBadge({ level = "UNKNOWN", className = "" }: RiskBadgeProps) {
  const normalizedLevel = (level || "UNKNOWN").toUpperCase();

  if (normalizedLevel === "CRITICAL") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/85 dark:bg-red-500/15 backdrop-blur-md border border-white/90 dark:border-red-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_4px_rgba(193,98,45,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_12px_rgba(239,68,68,0.25)] text-[#C1622D] dark:text-[#FB923C] text-[10px] font-bold tracking-wider uppercase ${className}`}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C1622D] dark:bg-[#FB923C] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#C1622D] dark:bg-[#FB923C]" />
        </span>
        <span>Critical Risk</span>
      </span>
    );
  }

  if (normalizedLevel === "HIGH") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/85 dark:bg-red-500/15 backdrop-blur-md border border-white/90 dark:border-red-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_4px_rgba(193,98,45,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-[#C1622D] dark:text-[#FB923C] text-[10px] font-bold tracking-wider uppercase ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#C1622D] dark:bg-[#FB923C] shrink-0" />
        <span>High Risk</span>
      </span>
    );
  }

  if (normalizedLevel === "ELEVATED") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/85 dark:bg-amber-500/15 backdrop-blur-md border border-white/90 dark:border-amber-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_4px_rgba(217,164,65,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-[#8F6612] dark:text-[#FBBF24] text-[10px] font-bold tracking-wider uppercase ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441] dark:bg-[#FBBF24] shrink-0" />
        <span>Elevated Risk</span>
      </span>
    );
  }

  if (normalizedLevel === "MEDIUM" || normalizedLevel === "MODERATE") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/85 dark:bg-amber-500/15 backdrop-blur-md border border-white/90 dark:border-amber-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_4px_rgba(217,164,65,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-[#8F6612] dark:text-[#FBBF24] text-[10px] font-semibold tracking-wider uppercase ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441] dark:bg-[#FBBF24] shrink-0" />
        <span>Moderate Risk</span>
      </span>
    );
  }

  if (normalizedLevel === "LOW") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/85 dark:bg-emerald-500/15 backdrop-blur-md border border-white/90 dark:border-emerald-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_4px_rgba(63,107,74,0.10)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-[#3F6B4A] dark:text-[#50C878] text-[10px] font-semibold tracking-wider uppercase ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B4A] dark:bg-[#50C878] shrink-0" />
        <span>Low Risk</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/75 dark:bg-white/10 backdrop-blur-md border border-white/85 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(30,58,43,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-[#4A3324]/60 dark:text-stone-300 text-[10px] font-semibold tracking-wider uppercase ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-500 shrink-0" />
      <span>Risk: {normalizedLevel === "UNKNOWN" ? "Unassessed" : normalizedLevel}</span>
    </span>
  );
}
