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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E3A2B]/8">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#3F6B4A] font-bold">
            {t("farmerAccountTerritory")}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1E3A2B] tracking-tight mt-1 font-display">
            {greetingTime}, {farmerDisplayName}.
          </h1>
          <p className="text-[#4A3324]/80 text-xs sm:text-sm mt-1 flex flex-wrap items-center gap-1.5">
            <span>{t("farmerDashboardLead")}</span>
            {farmer.village?.name && (
              <Link
                href="/farmer/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A2B] bg-[#3F6B4A]/12 px-2.5 py-0.5 rounded-full border border-white/60 hover:bg-[#3F6B4A]/20 transition-colors"
                title={t("viewEditLocation")}
              >
                <MapPin className="h-3 w-3 text-[#3F6B4A]" />
                <span>{farmer.village.name}, {farmer.block?.name || ""}, {farmer.district?.name || ""}</span>
              </Link>
            )}
          </p>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          <Link href="/farmer/talk">
            <Button variant="outline" size="sm" className="liquid-button-glass gap-1.5 text-xs h-9 px-3.5">
              <MessageSquare className="h-3.5 w-3.5 text-[#3F6B4A]" />
              <span>{t("farmerTalkAi")}</span>
            </Button>
          </Link>
          <Link href="/farmer/iot">
            <Button variant="outline" size="sm" className="liquid-button-glass gap-1.5 text-xs h-9 px-3.5">
              <Cpu className="h-3.5 w-3.5 text-[#3F6B4A]" />
              <span>{t("iotVitals")}</span>
            </Button>
          </Link>
          <Link href="/farmer/request-help">
            <Button size="sm" variant="outline" className="liquid-button-glass gap-1.5 text-xs h-9 px-3.5">
              <UserCheck className="h-3.5 w-3.5 text-[#D9A441]" />
              <span>{t("requestFieldAgent")}</span>
            </Button>
          </Link>
          <Link href="/farmer/report">
            <Button size="sm" className="liquid-button-primary gap-1.5 text-xs h-9 px-4">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{t("reportHealthConcern")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Bento Metrics Showcase */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#4A3324]/70 uppercase tracking-wider">{t("myAnimalsKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#1E3A2B] font-display">{metrics.myAnimalsCount}</span>
            <HeartPulse className="h-5 w-5 text-[#3F6B4A]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#C1622D] uppercase tracking-wider">{t("activeCasesKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#C1622D] font-display">{metrics.activeCasesCount}</span>
            <Activity className="h-5 w-5 text-[#C1622D]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider">{t("fieldRequestsKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#1E3A2B] font-display">{metrics.assistanceRequestsCount}</span>
            <UserCheck className="h-5 w-5 text-[#3F6B4A]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#3F6B4A] uppercase tracking-wider">{t("vetReportsKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#3F6B4A] font-display">{metrics.vetReportsCount}</span>
            <Stethoscope className="h-5 w-5 text-[#3F6B4A]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#D9A441] uppercase tracking-wider">{t("followUpsDueKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#D9A441] font-display">{metrics.upcomingFollowUpsCount}</span>
            <CalendarCheck className="h-5 w-5 text-[#D9A441]" />
          </div>
        </div>
      </div>

      {/* 1. HORIZONTAL ANIMAL GALLERY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1E3A2B] tracking-tight font-display">
              {t("myAnimalsHeading")}
            </h2>
            <span className="text-xs text-[#4A3324]/70">{t("registeredLivestockTotal", { count: allAnimals.length })}</span>
          </div>
          <Link href="/farmer/report" className="text-xs font-bold text-[#3F6B4A] hover:underline">
            {t("registerNewAnimalLink")} →
          </Link>
        </div>

        {allAnimals.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#F4EEE1]/70 backdrop-blur-md border border-white/60 text-center space-y-3">
            <HeartPulse className="h-8 w-8 text-[#3F6B4A] mx-auto" />
            <p className="font-bold text-[#1E3A2B] text-sm">{t("noRegisteredAnimalsFound")}</p>
            <p className="text-xs text-[#4A3324]/70 max-w-sm mx-auto">
              {t("noRegisteredAnimalsLead")}
            </p>
            <Link href="/farmer/report">
              <Button size="sm" className="liquid-button-primary text-xs">
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
                  <div className="min-w-72 sm:min-w-[320px] max-w-72 rounded-3xl bg-[#F4EEE1]/85 backdrop-blur-[24px] border border-white/70 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.10)] hover:-translate-y-1 transition-all group flex flex-col justify-between shrink-0 snap-start h-full">
                    <Link href={`/farmer/animals/${animal.id}`} className="block">
                      <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                        <Image
                          src={getAnimalImage(animal.species)}
                          alt={animal.tag}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        <div className="absolute top-3 right-3">
                          {isUnderCare ? (
                            <Badge className="bg-[#C1622D]/90 text-white border-0 text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                              <span>{t("underCare", { status: recentCase.status })}</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-[#3F6B4A]/90 text-white border-0 text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              <span>{t("stable")}</span>
                            </Badge>
                          )}
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-[#F4EEE1]">
                          <span className="text-[11px] font-mono font-bold bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md">
                            #{animal.tag}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-1">
                        <h3 className="text-lg font-bold text-[#1E3A2B] group-hover:text-[#3F6B4A] transition-colors">
                          {animal.species}
                        </h3>
                        <p className="text-xs text-[#4A3324]/75">
                          Breed: {animal.breed || "Standard"} • Age: {animal.ageMonths ? `${animal.ageMonths}m` : "Recorded"}
                        </p>
                      </div>
                    </Link>

                    <div className="px-5 pb-5 pt-2 border-t border-[#1E3A2B]/8 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link href={`/farmer/animals/${animal.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs liquid-button-glass gap-1 px-3">
                            <span>{t("healthPassport")}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/farmer/iot?animalId=${animal.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs liquid-button-glass gap-1 px-2.5">
                            <Cpu className="w-3.5 h-3.5 text-[#3F6B4A]" />
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E3A2B]/8 pb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1E3A2B] tracking-tight font-display">
              {t("activeReportsHeading")}
            </h2>
            <p className="text-xs text-[#4A3324]/70">{t("activeReportsLead")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/farmer/report">
              <Button size="sm" variant="outline" className="liquid-button-glass text-xs h-8 px-3">
                {t("selfReportCaseBtn")}
              </Button>
            </Link>
            <Link href="/farmer/request-help">
              <Button size="sm" variant="outline" className="liquid-button-glass text-xs h-8 px-3">
                {t("fieldAgentVisitBtn")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Health Cases */}
          <div className="p-6 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.08)]">
            <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#C1622D]" />
                <div>
                  <h3 className="font-bold text-[#1E3A2B] text-sm">{t("activeHealthCases", { count: activeCases.length })}</h3>
                  <span className="text-[11px] text-[#4A3324]/70">{t("routedToVets")}</span>
                </div>
              </div>
              <Badge className="bg-[#C1622D]/15 text-[#C1622D] text-[10px] font-bold">
                {t("underVetReview")}
              </Badge>
            </div>

            {activeCases.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#4A3324]/70 bg-white/60 rounded-2xl border border-white/60">
                {t("noActiveCases")}
              </div>
            ) : (
              <div className="space-y-3">
                {activeCases.slice(0, 5).map((c) => {
                  const farmLoc = c.animal?.herd?.farm?.village;
                  const locText = farmLoc ? `${farmLoc.name}, ${farmLoc.block?.name || ""}` : "Territory";

                  return (
                    <div key={c.id} className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/70 space-y-2.5 hover:-translate-y-0.5 transition-all shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#1E3A2B]">#{c.caseNumber}</span>
                          <span className="text-xs font-semibold text-[#4A3324]">
                            {c.animal?.tag} ({c.animal?.species})
                          </span>
                        </div>
                        <Badge className="bg-[#D9A441]/20 text-[#8F6612] text-[10px] font-bold">
                          {c.status}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 text-[#4A3324]/80 bg-white/80 p-3 rounded-xl border border-white/80">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#4A3324]/60">{t("destinationVet")}</span>
                          {c.assignedVeterinarianUser ? (
                            <span className="font-bold text-[#1E3A2B]">Dr. {c.assignedVeterinarianUser.name}</span>
                          ) : (
                            <span className="text-[#C1622D] font-medium italic">{t("awaitingVetAssignment")}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#4A3324]/60">{tReporting("location")}:</span>
                          <span className="text-[#1E3A2B]">{locText}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#4A3324]/60">{tCommon("symptoms")}:</span>
                          <span className="text-[#1E3A2B] truncate max-w-100">{c.symptoms.join(", ")}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] font-mono text-[#4A3324]/60">
                          {formatDateTime(c.reportedAt)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Link href={`/farmer/cases/${c.id}`}>
                            <Button size="sm" className="liquid-button-primary text-xs h-8 px-3">
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
          <div className="p-6 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.08)]">
            <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#3F6B4A]" />
                <div>
                  <h3 className="font-bold text-[#1E3A2B] text-sm">{t("fieldAssistanceRequestsTitle", { count: assistanceRequests.length })}</h3>
                  <span className="text-[11px] text-[#4A3324]/70">{t("doorstepVisitsSub")}</span>
                </div>
              </div>
              <Badge className="bg-[#3F6B4A]/15 text-[#3F6B4A] text-[10px] font-bold">
                {t("onSiteVisitsBadge")}
              </Badge>
            </div>

            {assistanceRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#4A3324]/70 bg-white/60 rounded-2xl border border-white/60">
                {t("noFieldRequests")}
              </div>
            ) : (
              <div className="space-y-3">
                {assistanceRequests.slice(0, 5).map((req) => {
                  const reqLoc = req.village || req.farm?.village;
                  const locText = reqLoc ? `${reqLoc.name}, ${reqLoc.block?.name || ""}` : "Territory";

                  return (
                    <div key={req.id} className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/70 space-y-2.5 hover:-translate-y-0.5 transition-all shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[#4A3324]/60">REQ-{req.id.slice(-6).toUpperCase()}</span>
                          {req.animal && (
                            <span className="text-xs font-semibold text-[#1E3A2B]">
                              {req.animal.tag} ({req.animal.species})
                            </span>
                          )}
                        </div>
                        <Badge className="bg-[#3F6B4A]/15 text-[#3F6B4A] text-[10px] font-bold">
                          {req.status}
                        </Badge>
                      </div>

                      <div className="text-xs space-y-1 text-[#4A3324]/80 bg-white/80 p-3 rounded-xl border border-white/80">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#4A3324]/60">{t("assignedAgentLabel")}</span>
                          {req.assignedFieldAgentUser ? (
                            <span className="font-bold text-[#1E3A2B]">{req.assignedFieldAgentUser.name}</span>
                          ) : (
                            <span className="text-[#D9A441] font-medium italic">{t("waitingForAgent")}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#4A3324]/60">{tReporting("location")}:</span>
                          <span className="text-[#1E3A2B]">{locText}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#4A3324]/60">{t("reasonForHelp")}:</span>
                          <span className="text-[#1E3A2B] truncate max-w-60">{req.reason}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-[#4A3324]/60">
                        <span>{t("requestedDate", { date: formatDateTime(req.requestedAt) })}</span>
                        <span className="text-[#3F6B4A] font-bold">{req.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency Veterinary Guidance */}
      <div className="p-6 rounded-3xl liquid-glass-dark flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-lg">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-white/15 text-[#BDEEC5] flex items-center justify-center shrink-0">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-[#F4EEE1] text-base">{t("helpline1962Title")}</h4>
            <p className="text-[#AECEB9] text-xs mt-0.5">
              {t("helpline1962Notice")}
            </p>
          </div>
        </div>
        <Link href="/farmer/report">
          <button className="bg-[#F4EEE1] text-[#1E3A2B] hover:bg-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md transition-all cursor-pointer">
            {t("reportHealthConcern")}
          </button>
        </Link>
      </div>
    </div>
  );
}
