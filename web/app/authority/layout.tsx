import Link from "next/link";
import Image from "next/image";
import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Activity, BellRing, ShieldCheck, UserCheck, FileSpreadsheet } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";

export default async function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const authority = await requireDistrictAuthority();
  const t = await getTranslations("authority");
  const districtName = authority.district?.name || t("authorizedJurisdiction");

  return (
    <div className="min-h-screen bg-[#F3EFE5] text-[#20271F] flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-[#CFC6AF] bg-[#FBF9F3]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-sm bg-[#E1E6D6] border border-[#AEBB9D] overflow-hidden flex items-center justify-center shrink-0">
              <Image src="/images/maitri-livestock-logo.png" alt="Maitri" width={36} height={36} className="h-full w-full object-contain scale-125" priority />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-editorial font-semibold text-base sm:text-lg tracking-tight text-[#20271F] truncate">
                  {districtName} · {t("controlCenter")}
                </span>
                <Badge className="text-[9px] sm:text-[10px] border-emerald-200 text-emerald-800 px-1.5 sm:px-2 py-0.5 bg-emerald-50 shrink-0">
                  {t("authorizedJurisdiction")}
                </Badge>
              </div>
              <p className="text-[10px] sm:text-[11px] text-stone-500 hidden sm:block truncate">
                {t("surveillanceAnalytics")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Badge className="text-xs bg-stone-100 text-stone-700 border-stone-200 hidden md:flex items-center gap-1.5 py-1 px-2.5 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span>{authority.name}</span>
            </Badge>
            <UserButton />
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 border-t border-[#E5E0D8] flex items-center gap-1 overflow-x-auto no-scrollbar py-1.5 bg-[#FAF8F3] -mx-1 px-1">
          <Link href="/authority" className="shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 transition-colors cursor-pointer whitespace-nowrap">
              <Activity className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
              <span>{t("controlCenter")}</span>
            </button>
          </Link>

          <Link href="/authority/alerts" className="shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl hover:bg-red-50 text-stone-700 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap">
              <BellRing className="h-3.5 w-3.5 text-red-600 shrink-0" />
              <span>{t("alerts")}</span>
            </button>
          </Link>

          <Link href="/authority/approvals" className="shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl hover:bg-amber-50 text-stone-700 hover:text-amber-800 transition-colors cursor-pointer whitespace-nowrap">
              <UserCheck className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <span>{t("approvals")}</span>
            </button>
          </Link>

          <Link href="/authority/reports" className="shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl hover:bg-purple-50 text-stone-700 hover:text-purple-800 transition-colors cursor-pointer whitespace-nowrap">
              <FileSpreadsheet className="h-3.5 w-3.5 text-purple-700 shrink-0" />
              <span>{t("reportsTitle")}</span>
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
