import React from "react";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/permissions";
import { getGeographyTreeAction } from "@/lib/actions/admin";
import { GeographyManager } from "@/components/admin/GeographyManager";

export default async function AdminGeographyPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const tree = await getGeographyTreeAction();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3A2B]/10 pb-4">
        <div>
          <span className="text-xs font-bold text-[#3F6B4A] uppercase tracking-wide font-mono">
            {t("adminMasterData")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display mt-1">
            {t("geographyManagement")}
          </h1>
          <p className="text-[#1D1C14]/70 text-xs sm:text-sm mt-0.5">
            {t("geographyManagementDesc")}
          </p>
        </div>
      </div>

      <GeographyManager initialDistricts={tree} />
    </div>
  );
}
