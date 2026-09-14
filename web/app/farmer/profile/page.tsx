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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#15271E] dark:text-[#F4EEE1]">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex items-center justify-between border-b border-black/8 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#2D5A3C] dark:text-[#8EE6A3] uppercase tracking-wider">
            <User className="h-3.5 w-3.5" />
            <span>{t("farmerAccountTerritory")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#15271E] dark:text-[#F4EEE1] tracking-tight font-display mt-1">
            {t("myFarmerProfile")}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-[#AECEB9] mt-1">
            {t("farmerProfileLead")}
          </p>
        </div>

        <Link href="/farmer">
          <button
            type="button"
            className="h-9 px-4 text-xs font-semibold border border-black/8 dark:border-white/15 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-[#15271E] dark:text-[#F4EEE1] gap-2 rounded-full shadow-[0_2px_8px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl inline-flex items-center cursor-pointer transition-all hover:scale-102 active:scale-98"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
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
