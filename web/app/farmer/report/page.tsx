import { requireFarmer } from "@/lib/auth/permissions";
import { HealthReportForm } from "@/components/reporting/HealthReportForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getReportCopy } from "@/lib/i18n/report";
import { LocaleProvider } from "@/components/layout/LocaleProvider";
import { getServerLocale } from "@/lib/i18n/server";

export default async function FarmerReportPage() {
  await requireFarmer();
  const locale = await getServerLocale();
  const copy = getReportCopy(locale);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 text-[#1D1C14]">
      <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display">{copy.pageTitle}</h1>
          <p className="text-xs sm:text-sm text-[#4A3324]/75 mt-1">
            {copy.pageDescription}
          </p>
        </div>

        <Link href="/farmer">
          <button
            type="button"
            className="h-9 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] gap-1.5 rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{copy.farmerPortal}</span>
          </button>
        </Link>
      </div>

      <LocaleProvider initialLocale={locale}>
        <HealthReportForm mode="farmer" />
      </LocaleProvider>
    </div>
  );
}
