import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { getDistrictAlertsAction } from "@/lib/actions/authority";
import { AlertsList } from "@/components/authority/AlertsList";
import { AlertWithLocation } from "@/components/authority/AlertsList";
import { getTranslations } from "next-intl/server";

export default async function AuthorityAlertsPage() {
  await requireDistrictAuthority();
  const alerts = await getDistrictAlertsAction();
  const t = await getTranslations("authority");

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      <div className="border-b border-[#1E3A2B]/8 pb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display">{t("districtAlertsHeader")}</h1>
        <p className="text-[#4A3324]/75 text-xs sm:text-sm mt-1">
          {t("surveillanceAnalytics")}
        </p>
      </div>

      <AlertsList alerts={alerts as unknown as AlertWithLocation[]} />
    </div>
  );
}
