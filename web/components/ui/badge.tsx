import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#3F6B4A] shadow-xs",
  {
    variants: {
      variant: {
        default:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
        secondary:
          "border-stone-200 bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-200 dark:border-white/15",
        destructive:
          "border-red-200 bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
        outline:
          "border-stone-300 text-stone-700 bg-white dark:border-white/15 dark:text-stone-200 dark:bg-white/5",
        critical:
          "border-red-500 bg-red-600 text-white font-bold shadow-sm shadow-red-200 dark:bg-red-600/90 dark:border-red-400/40 dark:shadow-red-950/50",
        elevated:
          "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/35",
        low:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
