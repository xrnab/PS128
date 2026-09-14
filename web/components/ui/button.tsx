import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F6B4A] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] cursor-pointer min-h-[36px]",
  {
    variants: {
      variant: {
        default:
          "text-[#F4EEE1] border border-white/20 dark:border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_rgba(30,58,43,0.22),0_1px_3px_rgba(30,58,43,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_16px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_20px_rgba(30,58,43,0.28)] [background:linear-gradient(180deg,#1E3A2B_0%,#3F6B4A_100%)] dark:[background:linear-gradient(180deg,#2D5842_0%,#3F6B4A_100%)]",
        destructive:
          "bg-[#C1622D] dark:bg-[#C1622D]/90 text-white hover:bg-[#A84F20] dark:hover:bg-[#A84F20] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_14px_rgba(193,98,45,0.3)] active:bg-[#8F3E14]",
        outline:
          "border border-white/70 dark:border-white/16 bg-[#F4EEE1]/80 dark:bg-white/10 text-[#1E3A2B] dark:text-[#F4EEE1] hover:bg-white dark:hover:bg-white/16 hover:text-[#162E22] dark:hover:text-[#F4EEE1] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_2px_8px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-xl hover:-translate-y-0.5",
        secondary:
          "bg-[#3F6B4A]/10 dark:bg-emerald-500/15 text-[#1E3A2B] dark:text-emerald-300 hover:bg-[#3F6B4A]/18 dark:hover:bg-emerald-500/25 border border-[#3F6B4A]/15 dark:border-emerald-500/25 shadow-sm",
        ghost:
          "text-[#1E3A2B]/75 dark:text-stone-300 hover:bg-[#1E3A2B]/8 dark:hover:bg-white/10 hover:text-[#1E3A2B] dark:hover:text-[#F4EEE1] shadow-none",
        link:
          "text-[#1E3A2B] dark:text-emerald-400 underline-offset-4 hover:underline shadow-none",
        emerald:
          "text-[#F4EEE1] border border-white/20 dark:border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_14px_rgba(30,58,43,0.22),0_1px_3px_rgba(30,58,43,0.12)] hover:-translate-y-0.5 [background:linear-gradient(180deg,#1E3A2B_0%,#3F6B4A_100%)] dark:[background:linear-gradient(180deg,#2D5842_0%,#3F6B4A_100%)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-7 text-sm font-semibold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
