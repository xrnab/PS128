import Link from "next/link";
import Image from "next/image";
import { requireFarmer } from "@/lib/auth/permissions";
import { getFarmerDashboardMetricsAction } from "@/lib/actions/farmer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MotionFadeIn } from "@/components/motion/MotionFadeIn";
import { formatDateTime } from "@/lib/utils";
import {
  PlusCircle,
  MessageSquare,
  PhoneCall,
  ChevronRight,
  Stethoscope,
  HeartPulse,
  Activity,
  CalendarCheck,
  UserCheck,
  User,
  MapPin,
  Cpu,
} from "lucide-react";
import { DeleteAnimalButton } from "@/components/farmer/DeleteAnimalButton";
import { getTranslations } from "next-intl/server";

export default async function FarmerPortalPage() {
  const farmer = await requireFarmer();
  const t = await getTranslations("farmer");
  const tCommon = await getTranslations("common");
  const tReporting = await getTranslations("reporting");
  const tIvr = await getTranslations("ivr");

  const {
    metrics,
    allAnimals,
    activeCases,
    assistanceRequests,
  } = await getFarmerDashboardMetricsAction();

  // Determine greeting based on local time
  const currentHour = new Date().getHours();
  const greetingTime = currentHour < 12 ? t("goodMorning") : currentHour < 17 ? t("goodAfternoon") : t("goodEvening");
  const farmerDisplayName = farmer.name || (farmer as unknown as { firstName?: string }).firstName || "Farmer";

  // Helper for animal default image based on species
  const getAnimalImage = (species: string) => {
    const s = species.toLowerCase();
    if (s.includes("buffalo") || s.includes("म्हैस")) return "/images/buffalo_dairy_care.jpg";
    if (s.includes("goat") || s.includes("sheep") || s.includes("शेळी") || s.includes("मेंढी")) return "/images/osmanabadi_goat.jpg";
    return "/images/vet_field_examination.jpg";
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14] dark:text-[#F4EEE1]">
      {/* Top Banner & Opening Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/8 dark:border-white/10">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#2D5A3C] dark:text-[#8EE6A3] font-bold">
            {t("farmerAccountTerritory")}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#15271E] dark:text-[#F4EEE1] tracking-tight mt-1 font-display">
            {greetingTime}, {farmerDisplayName}.
          </h1>
          <p className="text-stone-600 dark:text-[#AECEB9] text-xs sm:text-sm mt-1 flex flex-wrap items-center gap-1.5">
            <span>{t("farmerDashboardLead")}</span>
            {farmer.village?.name && (
              <Link
                href="/farmer/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#15271E] dark:text-[#BDEEC5] bg-[#EAF3EC] dark:bg-[#3F6B4A]/30 px-2.5 py-0.5 rounded-full border border-[#1E3A2B]/10 dark:border-white/15 hover:scale-102 transition-transform"
                title={t("viewEditLocation")}
              >
                <MapPin className="h-3 w-3 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                <span>{farmer.village.name}, {farmer.block?.name || ""}, {farmer.district?.name || ""}</span>
              </Link>
            )}
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          <Link href="/farmer/talk">
            <Button variant="outline" size="sm" className="liquid-button-glass gap-1.5 text-xs h-9 px-3.5 rounded-full">
              <MessageSquare className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
              <span>{t("farmerTalkAi")}</span>
            </Button>
          </Link>
          <Link href="/farmer/ivr">
            <Button variant="outline" size="sm" className="liquid-button-glass gap-1.5 text-xs h-9 px-3.5 rounded-full">
              <PhoneCall className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
              <span>{tIvr("title")}</span>
            </Button>
          </Link>
          <Link href="/farmer/iot">
            <Button variant="outline" size="sm" className="liquid-button-glass gap-1.5 text-xs h-9 px-3.5 rounded-full">
              <Cpu className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
              <span>{t("iotVitals")}</span>
            </Button>
          </Link>
          <Link href="/farmer/request-help">
            <Button size="sm" variant="outline" className="liquid-button-glass gap-1.5 text-xs h-9 px-3.5 rounded-full">
              <UserCheck className="h-3.5 w-3.5 text-[#B87A1E] dark:text-[#E5A93C]" />
              <span>{t("requestFieldAgent")}</span>
            </Button>
          </Link>
          <Link href="/farmer/report">
            <Button size="sm" className="liquid-button-primary gap-1.5 text-xs h-9 px-4 rounded-full">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{t("reportHealthConcern")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Bento Metrics Showcase (Apple Liquid Glass) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-[24px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[24px] border border-white/80 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <span className="text-[11px] font-bold text-stone-500 dark:text-[#8EAA97] uppercase tracking-wider">{t("myAnimalsKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#15271E] dark:text-[#F4EEE1] font-display">{metrics.myAnimalsCount}</span>
            <HeartPulse className="h-5 w-5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-[24px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[24px] border border-white/80 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <span className="text-[11px] font-bold text-[#C1622D] uppercase tracking-wider">{t("activeCasesKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#C1622D] font-display">{metrics.activeCasesCount}</span>
            <Activity className="h-5 w-5 text-[#C1622D]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-[24px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[24px] border border-white/80 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <span className="text-[11px] font-bold text-[#15271E] dark:text-[#F4EEE1] uppercase tracking-wider">{t("fieldRequestsKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#15271E] dark:text-[#F4EEE1] font-display">{metrics.assistanceRequestsCount}</span>
            <UserCheck className="h-5 w-5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-[24px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[24px] border border-white/80 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <span className="text-[11px] font-bold text-[#2D5A3C] dark:text-[#8EE6A3] uppercase tracking-wider">{t("vetReportsKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#2D5A3C] dark:text-[#8EE6A3] font-display">{metrics.vetReportsCount}</span>
            <Stethoscope className="h-5 w-5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-[24px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[24px] border border-white/80 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between hover:-translate-y-0.5 transition-all">
          <span className="text-[11px] font-bold text-[#B87A1E] dark:text-[#E5A93C] uppercase tracking-wider">{t("followUpsDueKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#B87A1E] dark:text-[#E5A93C] font-display">{metrics.upcomingFollowUpsCount}</span>
            <CalendarCheck className="h-5 w-5 text-[#B87A1E] dark:text-[#E5A93C]" />
          </div>
        </div>
      </div>

      {/* 1. HORIZONTAL ANIMAL GALLERY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#15271E] dark:text-[#F4EEE1] tracking-tight font-display">
              {t("myAnimalsHeading")}
            </h2>
            <span className="text-xs text-stone-500 dark:text-[#8EAA97]">{t("registeredLivestockTotal", { count: allAnimals.length })}</span>
          </div>
          <Link href="/farmer/report" className="text-xs font-bold text-[#2D5A3C] dark:text-[#8EE6A3] hover:underline">
            {t("registerNewAnimalLink")} →
          </Link>
        </div>

        {allAnimals.length === 0 ? (
          <div className="p-8 rounded-[28px] bg-white/70 dark:bg-[#0A1A12]/70 backdrop-blur-md border border-white/80 dark:border-white/10 text-center space-y-3">
            <HeartPulse className="h-8 w-8 text-[#2D5A3C] dark:text-[#8EE6A3] mx-auto" />
            <p className="font-bold text-[#15271E] dark:text-[#F4EEE1] text-sm">{t("noRegisteredAnimalsFound")}</p>
            <p className="text-xs text-stone-500 dark:text-[#8EAA97] max-w-sm mx-auto">
              {t("noRegisteredAnimalsLead")}
            </p>
            <Link href="/farmer/report">
              <Button size="sm" className="liquid-button-primary text-xs rounded-full">
                {t("registerFirstAnimal")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
            {allAnimals.map((animal, idx) => {
              const recentCase = animal.cases[0];
              const isUnderCare = recentCase && recentCase.status !== "CLOSED_HARMLESS";
              return (
                <MotionFadeIn key={animal.id} delay={idx * 50} direction="right">
                  <div className="min-w-72 sm:min-w-[320px] max-w-72 rounded-[28px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-[24px] border border-white/80 dark:border-white/10 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_40px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-all group flex flex-col justify-between shrink-0 snap-start h-full">
                    <Link href={`/farmer/animals/${animal.id}`} className="block">
                      <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                        <Image
                          src={getAnimalImage(animal.species)}
                          alt={animal.tag}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute top-3 right-3">
                          {isUnderCare ? (
                            <Badge className="bg-[#C1622D]/90 text-white border-0 text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                              <span>{t("underCare", { status: recentCase.status })}</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-[#2D5A3C]/90 text-white border-0 text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              <span>{t("stable")}</span>
                            </Badge>
                          )}
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <span className="text-[11px] font-mono font-bold bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/20">
                            #{animal.tag}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-1">
                        <h3 className="text-lg font-bold text-[#15271E] dark:text-[#F4EEE1] group-hover:text-[#2D5A3C] dark:group-hover:text-[#8EE6A3] transition-colors">
                          {animal.species}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-[#8EAA97]">
                          Breed: {animal.breed || "Standard"} • Age: {animal.ageMonths ? `${animal.ageMonths}m` : "Recorded"}
                        </p>
                      </div>
                    </Link>

                    <div className="px-5 pb-5 pt-2 border-t border-black/5 dark:border-white/8 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link href={`/farmer/animals/${animal.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs liquid-button-glass gap-1 px-3 rounded-full">
                            <span>{t("healthPassport")}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/farmer/iot?animalId=${animal.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs liquid-button-glass gap-1 px-2.5 rounded-full">
                            <Cpu className="w-3.5 h-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                            <span>IoT</span>
                          </Button>
                        </Link>
                      </div>
                      <DeleteAnimalButton animalId={animal.id} tag={animal.tag} />
                    </div>
                  </div>
                </MotionFadeIn>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. MY ACTIVE REPORTS & REQUESTS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/8 dark:border-white/10 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#15271E] dark:text-[#F4EEE1] tracking-tight font-display">
              {t("activeReportsHeading")}
            </h2>
            <p className="text-xs text-stone-500 dark:text-[#8EAA97]">{t("activeReportsLead")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/farmer/report">
              <Button size="sm" variant="outline" className="liquid-button-glass text-xs h-8 px-3 rounded-full">
                {t("selfReportCaseBtn")}
              </Button>
            </Link>
            <Link href="/farmer/request-help">
              <Button size="sm" variant="outline" className="liquid-button-glass text-xs h-8 px-3 rounded-full">
                {t("fieldAgentVisitBtn")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Health Cases */}
          <div className="p-6 sm:p-7 rounded-[28px] bg-white/75 dark:bg-[#0A1A12]/75 backdrop-blur-[24px] border border-white/80 dark:border-white/10 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#C1622D]" />
                <div>
                  <h3 className="font-bold text-[#15271E] dark:text-[#F4EEE1] text-sm">{t("activeHealthCases", { count: activeCases.length })}</h3>
                  <span className="text-[11px] text-stone-500 dark:text-[#8EAA97]">{t("routedToVets")}</span>
                </div>
              </div>
              <Badge className="bg-[#C1622D]/15 text-[#C1622D] text-[10px] font-bold">
                {t("underVetReview")}
              </Badge>
            </div>

            {activeCases.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 dark:text-[#8EAA97] bg-black/[0.02] dark:bg-white/[0.03] rounded-2xl border border-black/5 dark:border-white/8">
                {t("noActiveCases")}
              </div>
            ) : (
              <div className="space-y-3">
                {activeCases.slice(0, 5).map((c) => {
                  const farmLoc = c.animal?.herd?.farm?.village;
                  const locText = farmLoc ? `${farmLoc.name}, ${farmLoc.block?.name || ""}` : "Territory";

                  return (
                    <div key={c.id} className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 space-y-2.5 hover:-translate-y-0.5 transition-all shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#15271E] dark:text-[#F4EEE1]">#{c.caseNumber}</span>
                          <span className="text-xs font-semibold text-stone-800 dark:text-[#F4EEE1]">
                            {c.animal?.tag} ({c.animal?.species})
                          </span>
                        </div>
                        <Badge className="bg-[#D9A441]/20 text-[#8F6612] dark:text-[#E5A93C] text-[10px] font-bold">
                          {c.status}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 text-stone-600 dark:text-[#8EAA97] bg-white/70 dark:bg-white/[0.04] p-3 rounded-xl border border-black/5 dark:border-white/8">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400 dark:text-stone-500">{t("destinationVet")}</span>
                          {c.assignedVeterinarianUser ? (
                            <span className="font-bold text-[#15271E] dark:text-[#F4EEE1]">Dr. {c.assignedVeterinarianUser.name}</span>
                          ) : (
                            <span className="text-[#C1622D] font-medium italic">{t("awaitingVetAssignment")}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400 dark:text-stone-500">{tReporting("location")}:</span>
                          <span className="text-[#15271E] dark:text-[#F4EEE1]">{locText}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400 dark:text-stone-500">{tCommon("symptoms")}:</span>
                          <span className="text-[#15271E] dark:text-[#F4EEE1] truncate max-w-100">{c.symptoms.join(", ")}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500">
                          {formatDateTime(c.reportedAt)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link href={`/farmer/cases/${c.id}`}>
                            <Button size="sm" className="liquid-button-primary text-xs h-8 px-3 rounded-full">
                              {c.veterinaryReports && c.veterinaryReports.length > 0 ? t("viewVetReportBtn") : t("caseDetailsBtn")}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Field Assistance Requests */}
          <div className="p-6 sm:p-7 rounded-[28px] bg-white/75 dark:bg-[#0A1A12]/75 backdrop-blur-[24px] border border-white/80 dark:border-white/10 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                <div>
                  <h3 className="font-bold text-[#15271E] dark:text-[#F4EEE1] text-sm">{t("fieldAssistanceRequestsTitle", { count: assistanceRequests.length })}</h3>
                  <span className="text-[11px] text-stone-500 dark:text-[#8EAA97]">{t("doorstepVisitsSub")}</span>
                </div>
              </div>
              <Badge className="bg-[#2D5A3C]/15 text-[#2D5A3C] dark:text-[#8EE6A3] text-[10px] font-bold">
                {t("onSiteVisitsBadge")}
              </Badge>
            </div>

            {assistanceRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 dark:text-[#8EAA97] bg-black/[0.02] dark:bg-white/[0.03] rounded-2xl border border-black/5 dark:border-white/8">
                {t("noFieldRequests")}
              </div>
            ) : (
              <div className="space-y-3">
                {assistanceRequests.slice(0, 5).map((req) => {
                  const reqLoc = req.village || req.farm?.village;
                  const locText = reqLoc ? `${reqLoc.name}, ${reqLoc.block?.name || ""}` : "Territory";

                  return (
                    <div key={req.id} className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 space-y-2.5 hover:-translate-y-0.5 transition-all shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-stone-400 dark:text-stone-500">REQ-{req.id.slice(-6).toUpperCase()}</span>
                          {req.animal && (
                            <span className="text-xs font-semibold text-[#15271E] dark:text-[#F4EEE1]">
                              {req.animal.tag} ({req.animal.species})
                            </span>
                          )}
                        </div>
                        <Badge className="bg-[#2D5A3C]/15 text-[#2D5A3C] dark:text-[#8EE6A3] text-[10px] font-bold">
                          {req.status}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 text-stone-600 dark:text-[#8EAA97] bg-white/70 dark:bg-white/[0.04] p-3 rounded-xl border border-black/5 dark:border-white/8">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400 dark:text-stone-500">{t("assignedAgentLabel")}</span>
                          {req.assignedFieldAgentUser ? (
                            <span className="font-bold text-[#15271E] dark:text-[#F4EEE1]">{req.assignedFieldAgentUser.name}</span>
                          ) : (
                            <span className="text-[#B87A1E] dark:text-[#E5A93C] font-medium italic">{t("waitingForAgent")}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400 dark:text-stone-500">{tReporting("location")}:</span>
                          <span className="text-[#15271E] dark:text-[#F4EEE1]">{locText}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400 dark:text-stone-500">{t("reasonForHelp")}:</span>
                          <span className="text-[#15271E] dark:text-[#F4EEE1] truncate max-w-60">{req.reason}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-stone-400 dark:text-stone-500">
                        <span>{t("requestedDate", { date: formatDateTime(req.requestedAt) })}</span>
                        <span className="text-[#2D5A3C] dark:text-[#8EE6A3] font-bold">{req.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Line Demo (IVR) Showcase Card */}
      <div className="p-6 sm:p-7 rounded-[28px] bg-white/75 dark:bg-[#0A1A12]/75 backdrop-blur-[24px] border border-white/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_24px_rgba(30,58,43,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_16px_40px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-800 text-emerald-100 flex items-center justify-center shrink-0 shadow-md">
            <PhoneCall className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-[#15271E] dark:text-[#F4EEE1] text-base font-display">
                {tIvr("farmerDashboardCardTitle")}
              </h4>
              <Badge className="text-[10px] bg-emerald-700/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-semibold px-2 py-0.5 rounded-full">
                Interactive Demo
              </Badge>
            </div>
            <p className="text-stone-600 dark:text-[#AECEB9] text-xs mt-0.5 max-w-2xl">
              {tIvr("farmerDashboardCardDesc")}
            </p>
          </div>
        </div>
        <Link href="/farmer/ivr">
          <Button size="sm" className="liquid-button-primary gap-1.5 text-xs h-9 px-4 rounded-full">
            <PhoneCall className="h-3.5 w-3.5" />
            <span>{tIvr("tryVoiceLine")}</span>
          </Button>
        </Link>
      </div>

      {/* Emergency Veterinary Guidance (Apple Liquid Card) */}
      <div className="p-6 sm:p-7 rounded-[28px] bg-gradient-to-r from-[#1E3A2B] via-[#244734] to-[#1E3A2B] dark:from-[#0A1A12] dark:to-[#122A1D] border border-white/20 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-white/15 text-[#8EE6A3] flex items-center justify-center shrink-0 shadow-inner">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base font-display">{t("helpline1962Title")}</h4>
            <p className="text-[#AECEB9] text-xs mt-0.5">
              {t("helpline1962Notice")}
            </p>
          </div>
        </div>
        <Link href="/farmer/report">
          <button className="bg-white text-[#1E3A2B] hover:bg-[#F4EEE1] font-bold text-xs px-5 py-2.5 rounded-full shadow-md transition-all cursor-pointer hover:scale-102 active:scale-98">
            {t("reportHealthConcern")}
          </button>
        </Link>
      </div>
    </div>
  );
}
