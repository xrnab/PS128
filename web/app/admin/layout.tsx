import React from "react";
import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, ScrollText, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const t = await getTranslations("admin");

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#191F1C] flex flex-col font-sans">
      {/* Admin Workspace Sub-Navigation Bar */}
      <div className="border-b border-[#E5E0D8] bg-white/80 backdrop-blur-sm shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <div className="h-7 w-7 rounded-sm bg-[#E1E6D6] border border-[#AEBB9D] overflow-hidden flex items-center justify-center shrink-0">
              <Image src="/images/maitri-livestock-logo.png" alt="Maitri" width={28} height={28} className="h-full w-full object-contain scale-125" priority />
            </div>
            <span className="font-bold text-xs tracking-wide text-stone-900 uppercase font-mono">
              {t("adminCockpit")}
            </span>
            <span className="text-stone-300">•</span>
            <Badge className="text-[10px] border-emerald-300 text-emerald-900 px-2 py-0 bg-emerald-50 font-mono shrink-0">
              {admin.name}
            </Badge>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto -mx-1 px-1">
            <Link href="/admin" className="shrink-0">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs whitespace-nowrap">
                <LayoutDashboard className="h-3.5 w-3.5 text-emerald-700" />
                <span>{t("dashboard")}</span>
              </button>
            </Link>

            <Link href="/admin/audit-log" className="shrink-0">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl hover:bg-blue-50 text-stone-700 hover:text-blue-800 transition-colors cursor-pointer whitespace-nowrap">
                <ScrollText className="h-3.5 w-3.5 text-blue-600" />
                <span>{t("auditLedger")}</span>
              </button>
            </Link>

            <Link href="/admin/geography" className="shrink-0">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl hover:bg-purple-50 text-stone-700 hover:text-purple-800 transition-colors cursor-pointer whitespace-nowrap">
                <MapPin className="h-3.5 w-3.5 text-purple-700" />
                <span>{t("geography")}</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
