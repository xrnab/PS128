import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { getDictionary, Locale } from "@/lib/i18n";
import { cookies } from "next/headers";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronRight, ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function FarmerTalkAnimalSelectorPage() {
  const farmer = await requireFarmer();
  const localeCookie = (await cookies()).get("maitri-locale")?.value;
  const locale = (localeCookie === "bn" || localeCookie === "hi" || localeCookie === "mr" || localeCookie === "en"
    ? localeCookie
    : farmer.preferredLanguage) as Locale;
  const dict = getDictionary(locale);
  const t = await getTranslations("farmer");

  // Fetch all animals owned by farmer across their farms
  const animals = await prisma.animal.findMany({
    where: {
      herd: {
        farm: {
          farmerUserId: farmer.id,
        },
      },
    },
    include: {
      herd: {
        include: {
          farm: true,
        },
      },
      cases: {
        take: 1,
        orderBy: { reportedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3A2B]/8 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display">{dict.farmerTalk.title}</h1>
            <Badge className="text-[10px] bg-[#3F6B4A]/12 text-[#3F6B4A] border-white/60 font-semibold px-2.5 py-0.5 rounded-full">
              {t("livestockHealthTalk")}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#4A3324]/75 mt-1">
            {dict.farmerTalk.selectAnimalPrompt}
          </p>
        </div>

        <Link href="/farmer">
          <button
            type="button"
            className="h-9 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] gap-1.5 rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t("backToFarmerPortal")}</span>
          </button>
        </Link>
      </div>

      {animals.length === 0 ? (
        <Card className="liquid-glass-card p-12 text-center rounded-3xl space-y-3">
          <MessageSquare className="w-12 h-12 text-[#3F6B4A]/40 mx-auto" />
          <h3 className="text-lg font-bold text-[#1E3A2B]">{t("noRegisteredAnimalsFound")}</h3>
          <p className="text-xs text-[#4A3324]/60 max-w-sm mx-auto">
            {t("noAnimalsTalkDesc")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {animals.map((animal) => {
            const recentCase = animal.cases[0];
            const analysis = (recentCase?.analysisResult as Record<string, unknown> | null) || {};
            const riskLevel = (analysis.overall_risk_level as string) || null;
            const isHighRisk = riskLevel === "HIGH" || riskLevel === "CRITICAL";

            return (
              <Card key={animal.id} className="liquid-glass-card rounded-3xl p-6 flex flex-col justify-between overflow-hidden hover:scale-[1.01] transition-all space-y-4">
                <div className="flex flex-row items-start justify-between border-b border-[#1E3A2B]/8 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#1E3A2B] font-display">Tag: {animal.tag}</span>
                      <Badge className="text-[10px] bg-[#1E3A2B]/10 text-[#1E3A2B] border-white/60">
                        {animal.species}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#4A3324]/70 mt-1">
                      {animal.herd.farm.name} • Breed: {animal.breed || "Standard"} • Age: {animal.ageMonths ? `${animal.ageMonths} Months` : "Not recorded"}
                    </p>
                  </div>

                  {riskLevel && (
                    <span
                      className={`px-3 py-1 text-[10px] font-bold rounded-full border ${
                        isHighRisk
                          ? "bg-[#C1622D]/15 text-[#C1622D] border-[#C1622D]/30 font-mono"
                          : "bg-[#3F6B4A]/12 text-[#3F6B4A] border-[#3F6B4A]/25 font-mono"
                      }`}
                    >
                      {riskLevel}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-[#4A3324]/65">
                    {recentCase ? (
                      <span>Last Record: <strong className="text-[#1E3A2B]">{recentCase.status}</strong></span>
                    ) : (
                      <span>{t("routineCare")}</span>
                    )}
                  </div>

                  <Link href={`/farmer/talk/${animal.id}`}>
                    <button type="button" className="h-8 px-4 gap-1.5 text-xs liquid-button-primary text-white font-bold rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all hover:scale-[1.02]">
                      <span>{t("startHealthTalk")}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
