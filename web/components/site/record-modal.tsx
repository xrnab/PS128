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
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface RecordModalData {
  name: string;
  tagId: string;
  species: string;
  age: string;
  sex: string;
  status: string;
  nextAction: string;
  history: { date: string; note: string }[];
}

/**
 * Wraps a register row/card. Clicking it opens the animal's fuller record —
 * a small, focused preview rather than navigating away from the page.
 */
export function RecordModal({
  data,
  children,
}: {
  data: RecordModalData;
  children: ReactNode;
}) {
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#191F1C]/60 p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-[#C9BFA0] bg-[#F7F3E6] p-0 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#C9BFA0] bg-[#EDE7D3] px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
              <div className="min-w-0 space-y-0.5 sm:space-y-1">
                <h2 id={titleId} className="font-serif text-xl sm:text-2xl font-normal text-[#22291F]">
                  {data.name}
                </h2>
                <p id={descriptionId} className="text-xs sm:text-sm text-[#5C5645]">
                  {data.species} · {data.age} · {data.sex}
                </p>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <span className="shrink-0 border border-[#C9BFA0] px-2 py-1 font-mono text-xs text-[#5C5645]">
                  {data.tagId}
                </span>
                <button
                  type="button"
                  aria-label={`Close ${data.name} record`}
                  onClick={() => setOpen(false)}
                  className="shrink-0 border border-[#C9BFA0] p-1.5 sm:p-2 text-[#5C5645] transition-colors hover:bg-[#F7F3E6] hover:text-[#22291F] min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 sm:space-y-5 px-4 sm:px-6 py-4 sm:py-5 text-xs sm:text-sm text-[#3A3D30] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#C9BFA0]/70 pb-3">
                <span className="text-[#5C5645]">{t("recordModalStatus")}</span>
                <span className="font-medium text-[#22291F]">{data.status}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#C9BFA0]/70 pb-3">
                <span className="text-[#5C5645]">{t("recordModalNext")}</span>
                <span className="font-medium text-[#22291F]">{data.nextAction}</span>
              </div>

              <div>
                <p className="mb-2 text-xs text-[#8A8265]">{t("recordModalHistory")}</p>
                <ul className="space-y-2">
                  {data.history.map((entry) => (
                    <li key={`${data.tagId}-${entry.date}-${entry.note}`} className="flex gap-3 text-xs">
                      <span className="w-20 shrink-0 font-mono text-[#8A8265]">
                        {entry.date}
                      </span>
                      <span className="text-[#3A3D30]">{entry.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
