"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or search params change, complete and hide the progress bar
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Global link click handler for instant (<2ms) visual feedback
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external links, hash-only anchors, download links, new tabs
      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        anchor.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      // Check if navigating to the same URL
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl) return;

      // Start instant visual feedback bar
      setIsNavigating(true);
      setProgress(30);

      const p1 = setTimeout(() => setProgress(65), 120);
      const p2 = setTimeout(() => setProgress(85), 350);

      return () => {
        clearTimeout(p1);
        clearTimeout(p2);
      };
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[2.5px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-[#22C55E] via-[#3B82F6] to-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.7)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
