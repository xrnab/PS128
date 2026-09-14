import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { getGeographicHierarchyAction } from "@/lib/actions/authority";
import { GeographicDrilldown, GeoDistrict } from "@/components/authority/GeographicDrilldown";
import { getTranslations } from "next-intl/server";

export default async function AuthorityLocationsPage() {
  await requireDistrictAuthority();
  const hierarchy = await getGeographicHierarchyAction();
  const t = await getTranslations("authority");

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      <div className="border-b border-[#1E3A2B]/10 pb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display">{t("geoStructureHeader")}</h1>
        <p className="text-xs sm:text-sm text-[#1D1C14]/70 mt-1">
          {t("geoHierarchyTitle")}
        </p>
      </div>

      <GeographicDrilldown districts={hierarchy as unknown as GeoDistrict[]} />
    </div>
  );
}
