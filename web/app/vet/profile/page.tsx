import Link from "next/link";
import { requireVeterinarian } from "@/lib/auth/permissions";
import { getVetProfileAction } from "@/lib/actions/vet";
import { getDistricts } from "@/lib/actions/geo";
import { VetProfileView } from "@/components/vet/VetProfileView";
import { TelegramConnectCard } from "@/components/telegram/TelegramConnectCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "My Profile — Veterinary Portal | Maitri",
  description: "View and edit your veterinarian profile, registered service jurisdiction, contact details, and clinical activity.",
};

export default async function VetProfilePage() {
  await requireVeterinarian();
  const t = await getTranslations("vet");

  const [profile, districts] = await Promise.all([
    getVetProfileAction(),
    getDistricts(),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#3F6B4A] uppercase tracking-wide">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>{t("vetAccountServiceArea")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display mt-1">
            {t("vetMyProfile")}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A3324]/75 mt-0.5">
            {t("vetProfileLead")}
          </p>
        </div>

        <Link href="/vet">
          <button
            type="button"
            className="h-9 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] gap-1.5 rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("triageQueue")}</span>
          </button>
        </Link>
      </div>

      <VetProfileView
        initialProfile={profile}
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
      />

      <TelegramConnectCard />
    </div>
  );
}
