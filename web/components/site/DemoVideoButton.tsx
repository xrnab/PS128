"use client";

import React, { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { DemoVideoModal } from "@/components/site/DemoVideoModal";

export function DemoVideoButton() {
  const t = useTranslations("demoVideo");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
        className="liquid-button-glass gap-2 h-12 px-5 sm:px-6 rounded-full text-sm font-semibold text-[#1E3A2B] dark:text-[#F4EEE1] border border-white/80 dark:border-white/20 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
      >
        <PlayCircle className="h-4 w-4 text-[#3F6B4A] dark:text-emerald-400 shrink-0" />
        <span>{t("watchDemo")}</span>
      </Button>

      <DemoVideoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
