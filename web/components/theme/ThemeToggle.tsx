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
        className={`h-8 px-2.5 rounded-full border border-black/8 dark:border-white/15 bg-black/5 dark:bg-white/10 text-xs font-semibold shadow-[inset_0_1px_rgba(255,255,255,.8)] dark:shadow-[inset_0_1px_rgba(255,255,255,.1)] backdrop-blur-xl shrink-0 inline-flex items-center gap-1.5 opacity-70 ${className}`}
        aria-hidden="true"
      >
        <Moon className="h-3.5 w-3.5 text-[#3F6B4A] dark:text-[#BDEEC5]" />
        {showLabel && <span className="hidden sm:inline text-[11px] font-medium text-stone-600 dark:text-[#AECEB9]">Theme</span>}
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
      className={`h-8 px-2.5 sm:px-3 rounded-full border border-black/8 dark:border-white/15 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-semibold shadow-[inset_0_1px_rgba(255,255,255,.8)] dark:shadow-[inset_0_1px_rgba(255,255,255,.1)] backdrop-blur-xl shrink-0 inline-flex items-center gap-1.5 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 text-[#15271E] dark:text-[#F4EEE1] select-none ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-[#E5A93C] transition-transform duration-300 rotate-0 hover:rotate-45" />
          {showLabel && <span className="hidden sm:inline text-[11px] font-medium text-[#BDEEC5]">Light</span>}
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-[#2D5A3C] transition-transform duration-300 rotate-0 hover:-rotate-12" />
          {showLabel && <span className="hidden sm:inline text-[11px] font-medium text-[#2D5A3C]">Dark</span>}
        </>
      )}
    </button>
  );
}
