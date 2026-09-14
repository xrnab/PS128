import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#BFB69E] dark:border-white/16 bg-[#FBF9F3] dark:bg-black/35 px-4 py-2 text-sm text-[#20271F] dark:text-[#F4EEE1] placeholder:text-[#858878] dark:placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F6B4A] dark:focus-visible:ring-[#50C878]/50 focus-visible:border-[#3F6B4A] dark:focus-visible:border-[#50C878] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-none dark:shadow-[inset_0_1px_1px_rgba(0,0,0,0.4)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
