"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { PhoneCall, X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Opens when the helpline reference in the header or footer is clicked.
 * Keeps the page-level chrome uncluttered while still giving people the
 * actual steps for what happens on the call, rather than just a phone icon.
 */
export function HelplineModal({ children }: { children: ReactNode }) {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const trigger = Children.toArray(children).find(isValidElement) as
    | ReactElement<{
    onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
    type?: "button" | "submit" | "reset";
  }>
    | undefined;

  if (!trigger) {
    return null;
  }

  return (
    <>
      {cloneElement(trigger, {
        ...(trigger.type === "button" && !trigger.props.type ? { type: "button" as const } : {}),
        onClick: (event: ReactMouseEvent<HTMLElement>) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) {
            setOpen(true);
          }
        },
      })}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/80 dark:border-white/16 bg-[#FAF6EE]/95 dark:bg-[#0F1E16]/95 backdrop-blur-2xl p-0 shadow-2xl dark:shadow-[0_24px_54px_rgba(0,0,0,0.7)] text-[#1D1C14] dark:text-[#F4EEE1]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#1E3A2B]/10 dark:border-white/10 bg-white/60 dark:bg-black/30 px-6 py-5">
              <div className="min-w-0">
                <h2 id={titleId} className="text-xl font-bold tracking-tight text-[#1E3A2B] dark:text-[#F5EFE6] font-display">
                  {t("helplineModalTitle")}
                </h2>
                <p id={descriptionId} className="mt-1 text-xs text-[#4A3324]/75 dark:text-[#C8BBAA]">
                  {t("helplineModalSub")}
                </p>
              </div>
              <button
                type="button"
                aria-label={tCommon("close")}
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full border border-white/80 dark:border-white/15 p-2 text-[#4A3324]/80 dark:text-stone-300 hover:bg-white dark:hover:bg-white/10 hover:text-[#1E3A2B] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-xs sm:text-sm text-[#1E3A2B] dark:text-[#F4EEE1]">
              <div className="flex items-start gap-3">
                <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-[#3F6B4A] dark:text-[#50C878]" />
                <p className="leading-relaxed">
                  {t("helplineAvail")}
                </p>
              </div>
              <ol className="list-decimal space-y-2.5 pl-5 marker:text-xs marker:text-[#3F6B4A] dark:marker:text-[#50C878]">
                <li>{t("helplineStep1")}</li>
                <li>{t("helplineStep2")}</li>
                <li>{t("helplineStep3")}</li>
                <li>{t("helplineStep4")}</li>
              </ol>
              <p className="border-t border-[#1E3A2B]/10 dark:border-white/10 pt-2 text-xs text-[#4A3324]/70 dark:text-stone-400">
                {t("helplineUrgent")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
