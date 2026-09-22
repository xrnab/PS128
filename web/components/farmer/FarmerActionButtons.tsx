import Link from "next/link";
import {
  MessageSquare,
  PhoneCall,
  HeartPulse,
  UserCheck,
  PlusCircle,
  ChevronRight,
} from "lucide-react";

interface FarmerActionButtonsProps {
  className?: string;
}

export function FarmerActionButtons({ className = "" }: FarmerActionButtonsProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 w-full">
        {/* 1. TALK TO AI */}
        <Link
          href="/farmer/talk"
          prefetch={true}
          className="group relative flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[20px] border border-white/80 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_16px_rgba(30,58,43,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-[#0D2218]/90 transition-all duration-200 cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#2D5A3C]/10 dark:bg-[#8EE6A3]/15 text-[#2D5A3C] dark:text-[#8EE6A3] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs sm:text-[13px] text-[#15271E] dark:text-[#F4EEE1] tracking-tight leading-tight truncate">
              Talk to AI
            </span>
            <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-[#8EAA97] leading-tight truncate mt-0.5">
              Ask about animal
            </span>
          </div>
        </Link>

        {/* 2. CALL FOR HELP */}
        <Link
          href="/farmer/ivr"
          prefetch={true}
          className="group relative flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[20px] border border-white/80 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_16px_rgba(30,58,43,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-[#0D2218]/90 transition-all duration-200 cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/10 dark:bg-sky-400/15 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <PhoneCall className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs sm:text-[13px] text-[#15271E] dark:text-[#F4EEE1] tracking-tight leading-tight truncate">
              Call for Help
            </span>
            <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-[#8EAA97] leading-tight truncate mt-0.5">
              Speak to someone
            </span>
          </div>
        </Link>

        {/* 3. ANIMAL HEALTH */}
        <Link
          href="/farmer/iot"
          prefetch={true}
          className="group relative flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[20px] border border-white/80 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_16px_rgba(30,58,43,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-[#0D2218]/90 transition-all duration-200 cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 dark:bg-rose-400/15 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <HeartPulse className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs sm:text-[13px] text-[#15271E] dark:text-[#F4EEE1] tracking-tight leading-tight truncate">
              Animal Health
            </span>
            <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-[#8EAA97] leading-tight truncate mt-0.5">
              Check condition
            </span>
          </div>
        </Link>

        {/* 4. CALL FIELD AGENT */}
        <Link
          href="/farmer/request-help"
          prefetch={true}
          className="group relative flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[20px] border border-white/80 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_16px_rgba(30,58,43,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-[#0D2218]/90 transition-all duration-200 cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#D9A441]/15 dark:bg-[#D9A441]/20 text-[#B87A1E] dark:text-[#E5A93C] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <UserCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs sm:text-[13px] text-[#15271E] dark:text-[#F4EEE1] tracking-tight leading-tight truncate">
              Call Field Agent
            </span>
            <span className="text-[10px] sm:text-[11px] text-stone-500 dark:text-[#8EAA97] leading-tight truncate mt-0.5">
              Get farm help
            </span>
          </div>
        </Link>

        {/* 5. REPORT SICK ANIMAL (Primary Action Card) */}
        <Link
          href="/farmer/report"
          prefetch={true}
          className="group col-span-2 sm:col-span-1 lg:col-span-1 relative flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-[#1E3A2B] via-[#244734] to-[#1E3A2B] dark:from-[#173826] dark:to-[#0F2A1C] text-white border border-white/20 dark:border-white/15 shadow-[0_6px_20px_rgba(30,58,43,0.22)] hover:shadow-[0_8px_24px_rgba(30,58,43,0.32)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 text-[#8EE6A3] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs sm:text-[13px] text-white tracking-tight leading-tight truncate">
                Report Sick Animal
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#AECEB9] leading-tight truncate mt-0.5">
                Tell us what is wrong
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 group-hover:text-white transition-all shrink-0" />
        </Link>
      </div>
    </div>
  );
}
