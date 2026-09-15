import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, PhoneCall, Sparkles } from "lucide-react";
import { IvrCallSimulator } from "@/components/farmer/IvrCallSimulator";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Automated Voice Line Demo | Maitri Farmer Portal",
  description:
    "Simulated Interactive Voice Response (IVR) phone line for feature-phone livestock farmers.",
};

export default async function FarmerIvrPage() {
  await requireFarmer();
  const t = await getTranslations("ivr");

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 text-[#1D1C14] dark:text-[#F4EEE1]">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/8 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/farmer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Farmer Hub</span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5 mt-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-md">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#15271E] dark:text-[#F4EEE1] font-display">
                  {t("title")}
                </h1>
                <Badge className="text-[10px] bg-emerald-700/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-semibold px-2.5 py-0.5 rounded-full">
                  Simulated Line
                </Badge>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs text-neutral-600 dark:text-neutral-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Multi-Turn Voice & DTMF</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Call Simulator */}
      <IvrCallSimulator />
    </div>
  );
}
