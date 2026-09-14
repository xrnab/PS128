import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl md:rounded-3xl border border-white/65 dark:border-white/14 bg-[#F4EEE1]/80 dark:bg-[#101E17]/80 text-[#1D1C14] dark:text-[#F4EEE1] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_1px_2px_rgba(30,58,43,0.05),0_12px_32px_rgba(30,58,43,0.10),0_4px_10px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1.5px_0.5px_rgba(255,255,255,0.20),inset_0_-1px_0_rgba(0,0,0,0.5),0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-[24px] p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_20px_40px_rgba(30,58,43,0.14)] dark:hover:shadow-[inset_0_1.5px_0.5px_rgba(255,255,255,0.28),0_20px_48px_rgba(0,0,0,0.6)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-3 border-b border-[#1E3A2B]/8 dark:border-white/10 mb-3", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-sans text-xl font-bold tracking-tight text-[#1E3A2B] dark:text-[#F5EFE6]", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm text-[#1E3A2B]/70 dark:text-[#C8BBAA] leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-3 border-t border-[#1E3A2B]/8 dark:border-white/10 mt-3", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
