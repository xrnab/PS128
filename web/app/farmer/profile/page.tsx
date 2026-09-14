import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import { getFarmerProfileAction } from "@/lib/actions/farmer";
import { getDistricts } from "@/lib/actions/geo";
import { FarmerProfileView } from "@/components/farmer/FarmerProfileView";
import { TelegramConnectCard } from "@/components/telegram/TelegramConnectCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "My Profile — Farmer Portal | Maitri",
  description: "View and edit your farmer profile, registered location, contact information, and farm infrastructure.",
};

export default async function FarmerProfilePage() {
  const t = await getTranslations("farmer");
  await requireFarmer();

  const [profile, districts] = await Promise.all([
    getFarmerProfileAction(),
    getDistricts(),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#3F6B4A] uppercase tracking-wide">
            <User className="h-3.5 w-3.5" />
            <span>{t("farmerAccountTerritory")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display mt-1">
            {t("myFarmerProfile")}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A3324]/75 mt-0.5">
            {t("farmerProfileLead")}
          </p>
        </div>

        <Link href="/farmer">
          <button
            type="button"
            className="h-9 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] gap-1.5 rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("farmerPortal")}</span>
          </button>
        </Link>
      </div>

      <FarmerProfileView
        initialProfile={profile}
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
      />

      <TelegramConnectCard />
    </div>
  );
}
