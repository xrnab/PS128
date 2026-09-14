"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = true, className = "" }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`h-8 px-2.5 rounded-full border border-white/15 bg-[#072417]/60 text-xs font-semibold shadow-[inset_0_1px_rgba(255,255,255,.1)] backdrop-blur-xl shrink-0 inline-flex items-center gap-1.5 opacity-70 ${className}`}
        aria-hidden="true"
      >
        <Moon className="h-3.5 w-3.5 text-[#BDEEC5]" />
        {showLabel && <span className="hidden sm:inline text-[11px] font-medium text-[#AECEB9]">Theme</span>}
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`h-8 px-2.5 sm:px-3 rounded-full border border-white/15 bg-[#072417]/60 hover:bg-[#072417]/85 text-xs font-semibold shadow-[inset_0_1px_rgba(255,255,255,.1)] backdrop-blur-xl shrink-0 inline-flex items-center gap-1.5 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 text-[#F4EEE1] select-none ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-[#D9A441] transition-transform duration-300 rotate-0 hover:rotate-45" />
          {showLabel && <span className="hidden sm:inline text-[11px] font-medium text-[#AECEB9]">Light</span>}
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-[#BDEEC5] transition-transform duration-300 rotate-0 hover:-rotate-12" />
          {showLabel && <span className="hidden sm:inline text-[11px] font-medium text-[#AECEB9]">Dark</span>}
        </>
      )}
    </button>
  );
}
