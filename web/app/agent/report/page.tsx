import { requireFieldAgent } from "@/lib/auth/permissions";
import { HealthReportForm } from "@/components/reporting/HealthReportForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AgentReportPage(props: {
  searchParams: Promise<{ requestId?: string; farmId?: string; animalId?: string; expectedUpdatedAt?: string }>;
}) {
  await requireFieldAgent();
  const searchParams = await props.searchParams;
  const t = await getTranslations("agent");

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 text-[#1D1C14]">
      <div className="flex items-center justify-between border-b border-[#1E3A2B]/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] tracking-tight font-display">{t("reportTitle")}</h1>
          <p className="text-xs text-[#1D1C14]/70 mt-0.5">
            {t("reportSubtitle")}
          </p>
        </div>

        <Link href="/agent">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-full border-white/80 bg-white/60 hover:bg-white text-[#1E3A2B] shadow-xs cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("fieldNotebook")}</span>
          </Button>
        </Link>
      </div>

      <HealthReportForm
        mode="agent"
        initialRequestId={searchParams.requestId}
        initialFarmId={searchParams.farmId}
        initialAnimalId={searchParams.animalId}
        expectedUpdatedAt={searchParams.expectedUpdatedAt}
      />
    </div>
  );
}
