"use client";

import React, { useState } from "react";

interface CaseThumbnailProps {
  photoUrl?: string | null;
  caseId: string;
  species?: string;
  tag: string;
  isCritical?: boolean;
  isAttention?: boolean;
  className?: string;
}

export function CaseThumbnail({
  photoUrl,
  caseId,
  species,
  tag,
  isCritical,
  isAttention,
  className = "",
}: CaseThumbnailProps) {
  const isGoat = species?.toUpperCase() === "GOAT";
  const defaultFallback = isGoat
    ? "/images/osmanabadi_goat.jpg"
    : "/images/buffalo_dairy_care.jpg";

  // Compute resolved initial URL
  const computeInitialSrc = (): string => {
    if (!photoUrl || typeof photoUrl !== "string" || photoUrl.trim().length === 0) {
      return defaultFallback;
    }

    const trimmed = photoUrl.trim();

    // If it's a local valid path
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return trimmed;
    }

    // If it's a base64 data URI
    if (trimmed.startsWith("data:")) {
      return trimmed;
    }

    // If it's mock-blob from dev environment, route through the secure proxy
    if (trimmed.includes("mock-blob.vercel-storage.com")) {
      return caseId ? `/api/media/photo/${caseId}` : defaultFallback;
    }

    // If it's private Vercel blob storage or internal case path
    if (trimmed.includes("blob.vercel-storage.com") || trimmed.startsWith("cases/")) {
      return caseId ? `/api/media/photo/${caseId}` : defaultFallback;
    }

    // If it's another remote URL
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    return defaultFallback;
  };

  const [imgSrc, setImgSrc] = useState<string>(computeInitialSrc());
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(defaultFallback);
    }
  };

  return (
    <div
      className={`relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-white/80 bg-[#1E3A2B]/10 ${className}`}
    >
      <img
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        src={imgSrc}
        alt={tag}
        loading="lazy"
        onError={handleError}
      />
      <span
        className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
          isCritical
            ? "bg-[#C1622D] animate-ping"
            : isAttention
            ? "bg-[#D9A441]"
            : "bg-[#3F6B4A]"
        }`}
      />
    </div>
  );
}
