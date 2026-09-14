import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-[#D9D3C7] dark:border-white/16 bg-white dark:bg-black/35 px-3.5 py-2.5 text-xs text-[#191F1C] dark:text-[#F4EEE1] placeholder:text-stone-400 dark:placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-[#50C878]/50 focus-visible:border-emerald-600 dark:focus-visible:border-[#50C878] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-xs dark:shadow-[inset_0_1px_1px_rgba(0,0,0,0.4)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
