"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { HeartPulse, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

interface MotionHeroImageProps {
  src: string;
  alt: string;
  activeCaseCount: number;
}

export function MotionHeroImage({ src, alt, activeCaseCount }: MotionHeroImageProps) {
  const t = useTranslations("landing");
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12; // Max 6px shift
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    setCoords({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={handleMouseMove}
      onPointerLeave={handleMouseLeave}
      className="relative w-full h-[360px] sm:h-[420px] md:h-[480px] rounded-3xl overflow-visible group select-none"
    >
      {/* Framed Image Container with subtle hover zoom and pointer shift */}
      <div className="relative w-full h-full rounded-[2rem] overflow-hidden border border-white/80 shadow-[0_24px_54px_rgba(30,58,43,.18),inset_0_1px_white] bg-[#F4EEE1] transition-all duration-500 ease-out group-hover:shadow-[0_30px_64px_rgba(30,58,43,.26)]">
        <div
          className="relative w-full h-full transition-transform duration-300 ease-out"
          style={{
            transform: isHovered
              ? `scale(1.03) translate3d(${coords.x}px, ${coords.y}px, 0)`
              : "scale(1) translate3d(0, 0, 0)",
          }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority
            className="object-cover transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Product Annotation 1: Animal Card (Top Left) - Gentle Float */}
      <div
        className="absolute -top-4 -left-3 sm:-left-6 liquid-glass-card rounded-2xl p-3 shadow-[0_14px_32px_rgba(30,58,43,.14),inset_0_1.5px_0.5px_white] flex items-center gap-3 max-w-[210px] z-10 transition-transform duration-300 hover:scale-105"
        style={{
          transform: isHovered ? `translate3d(${-coords.x * 0.8}px, ${-coords.y * 0.8}px, 0)` : undefined,
        }}
      >
        <div className="h-9 w-9 rounded-xl bg-[#3F6B4A]/15 border border-white/80 flex items-center justify-center shrink-0 shadow-xs">
          <HeartPulse className="h-4 w-4 text-[#3F6B4A]" />
        </div>
        <div className="text-left leading-tight">
          <div className="text-xs font-bold text-[#1E3A2B]">{t("heroImageCowName")}</div>
          <div className="text-[11px] text-[#3F6B4A] font-semibold mt-0.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3F6B4A] animate-ping" style={{ animationDuration: "2.5s" }} />
            <span>{t("heroImageHealthy")}</span>
          </div>
        </div>
      </div>

      {/* Product Annotation 2: Village Status Card (Bottom Right) - Gentle Float */}
      <div
        className="absolute -bottom-4 -right-3 sm:-right-4 liquid-glass-card rounded-2xl p-3 shadow-[0_14px_32px_rgba(30,58,43,.14),inset_0_1.5px_0.5px_white] flex items-center gap-3 z-10 transition-transform duration-300 hover:scale-105"
        style={{
          transform: isHovered ? `translate3d(${-coords.x * 0.5}px, ${-coords.y * 0.5}px, 0)` : undefined,
        }}
      >
        <div className="h-9 w-9 rounded-xl bg-[#D9A441]/20 border border-white flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4 text-[#D9A441]" />
        </div>
        <div className="text-left leading-tight">
          <div className="text-xs font-bold text-[#1E3A2B]">{t("heroImageBlock")}</div>
          <div className="text-[11px] text-[#4A3324]/75 mt-0.5">
            <strong className="text-[#1E3A2B]">{activeCaseCount || 4}</strong> {t("heroImageReports")}
          </div>
        </div>
      </div>
    </div>
  );
}
