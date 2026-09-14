import { Show, SignUpButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Camera, CheckCircle2, MapPin, PhoneCall, Sparkles, WifiOff, Activity, ShieldCheck, HeartPulse } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { SurveillanceHeatmap } from "@/components/authority/SurveillanceHeatmap";
import { formatBlockName, formatVillageName, type MapMarkerData } from "@/components/authority/mapUtils";
import { HelplineModal } from "@/components/site/helpline-modal";
import { MotionFadeIn } from "@/components/motion/MotionFadeIn";
import { MotionHeroImage } from "@/components/motion/MotionHeroImage";
import { MotionRoleEcosystem } from "@/components/motion/MotionRoleEcosystem";
import { MotionWorkflowTimeline } from "@/components/motion/MotionWorkflowTimeline";

const glass = "liquid-glass-card relative overflow-hidden";

export default async function Home() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const t = await getTranslations("landing");

  const [villageCount, animalCount, activeCaseCount, activeAlerts, sampleVillages] = await Promise.all([
    prisma.village.count().catch(() => 12),
    prisma.animal.count().catch(() => 48),
    prisma.case.count({ where: { status: { not: "CLOSED_HARMLESS" } } }).catch(() => 4),
    prisma.alert.findMany({ where: { active: true }, take: 5 }).catch(() => []),
    prisma.village.findMany({
      take: 6,
      include: {
        block: true,
        farms: { take: 1, select: { latitude: true, longitude: true } },
        alerts: { where: { active: true }, take: 1 },
      },
    }).catch(() => []),
  ]);

  const mapMarkers: MapMarkerData[] = (sampleVillages as Array<{
    id: string;
    name: string;
    block?: { name: string } | null;
    farms: Array<{ latitude?: number | null; longitude?: number | null }>;
    alerts: Array<{ diseaseName?: string | null }>;
  }>).filter((v) => typeof v.farms[0]?.latitude === "number" && typeof v.farms[0]?.longitude === "number").map((v) => {
    const blockName = formatBlockName(v.block?.name);
    const activeAlert = v.alerts.length > 0;
    return {
      id: v.id,
      name: formatVillageName(v.name, blockName),
      blockName,
      lat: v.farms[0].latitude as number,
      lng: v.farms[0].longitude as number,
      activeAlert,
      diseaseName: activeAlert ? v.alerts[0].diseaseName || "Cluster" : null,
      caseCount: activeAlert ? 3 : 1,
      highRiskCount: activeAlert ? 1 : 0,
      confirmedCount: activeAlert ? 1 : 0,
    };
  });

  const metrics = [
    { value: villageCount || 12, label: t("villagesActive"), tone: "from-[#1E3A2B] to-[#3F6B4A]" },
    { value: animalCount || 48, label: t("animalsMonitored"), tone: "from-[#3F6B4A] to-[#D9A441]" },
    { value: activeCaseCount || 4, label: t("activeFieldCases"), tone: "from-[#D9A441] to-[#C1622D]" },
  ];

  const fieldFeatures = [
    { icon: WifiOff, title: t("offlineReportingTitle"), body: t("offlineReportingBody"), color: "text-[#1E3A2B] bg-[#3F6B4A]/12" },
    { icon: Camera, title: t("photoEvidenceTitle"), body: t("photoEvidenceBody"), color: "text-[#C1622D] bg-[#C1622D]/12" },
    { icon: MapPin, title: t("gpsLocationTitle"), body: t("gpsLocationBody"), color: "text-[#3F6B4A] bg-[#3F6B4A]/15" },
    { icon: CheckCircle2, title: t("villageVisitsTitle"), body: t("villageVisitsBody"), color: "text-[#D9A441] bg-[#D9A441]/15" },
  ];

  return (
    <div className="relative overflow-hidden text-[#1D1C14] dark:text-[#F4EEE1]">

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-14 lg:px-8 lg:pb-28">
        <div className="flex items-center justify-between gap-4 text-[11px] font-semibold tracking-[.14em] text-[#1E3A2B]/75 uppercase">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#3F6B4A] animate-pulse" />
            {t("deptTitle")}
          </span>
          <HelplineModal>
            <button className="rounded-full border border-white/80 bg-white/70 px-3.5 py-1.5 tracking-normal text-[#1E3A2B] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl transition hover:bg-white/95 font-medium cursor-pointer">
              {t("helpline1962")}
            </button>
          </HelplineModal>
        </div>

        <div className="grid items-center gap-12 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:pt-16">
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/85 bg-white/75 px-3.5 py-1.5 text-xs font-semibold text-[#1E3A2B] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(30,58,43,0.04)] backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-[#D9A441]" />
              {t("heroAudience")}
            </div>

            <h1 className="max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.035em] text-[#1E3A2B] sm:text-6xl lg:text-7xl">
              {t("heroHeading")}
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#4A3324]/80 sm:text-lg">
              {t("heroLead")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Show when="signed-in">
                <Link href="/farmer/report">
                  <Button size="lg" className="liquid-button-primary gap-2 h-12 px-6">
                    {t("reportConcern")} <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Show>
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <Button size="lg" className="liquid-button-primary gap-2 h-12 px-6">
                    {t("reportConcern")} <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </SignUpButton>
              </Show>
              <Link
                href={userId ? "/dashboard" : "/farmer"}
                className="liquid-button-glass rounded-full px-5 py-3 text-sm font-semibold text-[#1E3A2B] inline-flex items-center"
              >
                {userId ? t("enterWorkspaces") : t("exploreMaitri")}
              </Link>
            </div>

            {userId && (
              <p className="mt-5 text-xs text-[#1E3A2B]/60 font-medium">
                {t("signedInAs")} {user?.firstName}
              </p>
            )}

            {/* Bento Metrics Row */}
            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4">
              {metrics.map((metric) => (
                <div key={metric.label} className={`${glass} p-4 sm:p-5 rounded-2xl md:rounded-3xl`}>
                  <div className={`h-1.5 w-10 rounded-full bg-gradient-to-r ${metric.tone}`} />
                  <div className="mt-4 text-2xl font-bold tracking-tight text-[#1E3A2B] sm:text-3xl font-display">
                    {metric.value}
                  </div>
                  <div className="mt-1 text-[11px] leading-tight text-[#4A3324]/75 sm:text-xs font-medium">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <MotionFadeIn delay={120} direction="left" className="relative">
            <MotionHeroImage
              src="/images/indian_livestock_hero.jpg"
              alt="Healthy Indian dairy cattle in Gujarat pastoral paddock"
              activeCaseCount={activeCaseCount}
            />
          </MotionFadeIn>
        </div>
      </section>

      {/* Connected Care Role Ecosystem */}
      <section className="relative mx-auto max-w-7xl px-4 pb-22 sm:px-6 lg:px-8">
        <div className={`${glass} p-6 sm:p-10 lg:p-12`}>
          <div className="max-w-2xl">
            <span className="font-sans text-xs font-bold tracking-[.14em] text-[#3F6B4A] uppercase">
              Connected Care
            </span>
            <h2 className="mt-2 text-3xl font-bold leading-tight text-[#1E3A2B] sm:text-4xl">
              {t("fourPeopleHeading")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#4A3324]/80 sm:text-base">
              {t("fourPeopleLead")}
            </p>
          </div>
          <MotionRoleEcosystem />
        </div>
      </section>

      {/* Field Ready Section */}
      <section className="relative mx-auto grid max-w-7xl gap-6 px-4 pb-22 sm:px-6 lg:grid-cols-[.92fr_1.08fr] lg:px-8">
        <MotionFadeIn className={`${glass} p-7 sm:p-9 flex flex-col justify-between`}>
          <div>
            <span className="text-xs font-bold tracking-[.14em] text-[#3F6B4A] uppercase">
              Field Ready
            </span>
            <h2 className="mt-2 text-3xl font-bold leading-tight text-[#1E3A2B]">
              {t("builtForFieldTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#4A3324]/80">
              {t("builtForFieldLead")}
            </p>
          </div>
          <Image
            className="mt-7 h-52 w-full rounded-2xl md:rounded-3xl object-cover shadow-[0_12px_28px_rgba(30,58,43,.14)] border border-white/60"
            src="/images/pashusakhi_field_visit.jpg"
            width={700}
            height={400}
            alt="Pashu Sakhi field veterinary checkup"
          />
        </MotionFadeIn>

        <div className="grid gap-4 sm:grid-cols-2">
          {fieldFeatures.map(({ icon: Icon, title, body, color }, index) => (
            <MotionFadeIn delay={index * 70} key={title} className={`${glass} p-6`}>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#1E3A2B]">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#4A3324]/75">{body}</p>
            </MotionFadeIn>
          ))}
        </div>
      </section>

      {/* Clinical Workflow Timeline */}
      <section className="relative mx-auto max-w-7xl px-4 pb-22 sm:px-6 lg:px-8">
        <div className={`${glass} p-6 sm:p-10`}>
          <div className="max-w-2xl">
            <span className="text-xs font-bold tracking-[.14em] text-[#3F6B4A] uppercase">
              Clinical Flow
            </span>
            <h2 className="mt-2 text-3xl font-bold text-[#1E3A2B] sm:text-4xl">
              {t("fromObservationTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#4A3324]/80">
              {t("fromObservationLead")}
            </p>
          </div>
          <div className="mt-8">
            <MotionWorkflowTimeline />
          </div>
        </div>
      </section>

      {/* Live Surveillance Heatmap Card */}
      <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className={`${glass} p-4 sm:p-6 shadow-[inset_0_1.5px_0.5px_rgba(255,255,255,0.95),0_4px_24px_rgba(30,58,43,0.06),0_20px_48px_rgba(30,58,43,0.08)]`}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2 pb-5 pt-2">
            <div>
              <span className="text-xs font-bold tracking-[.14em] text-[#3F6B4A] uppercase">
                Live Intelligence
              </span>
              <h2 className="mt-1 text-2xl font-bold text-[#1E3A2B] sm:text-3xl font-display">
                {t("districtActivityTitle")}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/80 backdrop-blur-md px-4 py-2 text-right border border-white/80 shadow-xs">
                <strong className="block text-xl font-bold tracking-tight text-[#1E3A2B]">
                  {activeAlerts.length || 2}
                </strong>
                <span className="text-[11px] text-[#4A3324]/70 font-semibold uppercase tracking-wider">
                  {t("followUpsCount")}
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl md:rounded-3xl border border-white/75 shadow-inner">
            <SurveillanceHeatmap markers={mapMarkers} />
          </div>
        </div>
      </section>

      {/* Bottom Apple CTA Panel: Deep Pine Liquid Glass (Side-by-Side Text & Pastoral Media) */}
      <section className="relative mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl md:rounded-4xl liquid-glass-dark border border-white/25 overflow-hidden shadow-[inset_0_1.5px_0.5px_rgba(255,255,255,0.45),0_12px_40px_rgba(30,58,43,0.28)]">
          {/* Left Column: Text & CTAs */}
          <div className="lg:col-span-7 p-7 sm:p-10 md:p-12 lg:p-14 flex flex-col justify-between gap-6 relative z-10">
            <div>
              <span className="text-xs font-bold tracking-[.14em] text-[#BDEEC5] uppercase">
                Maitri Network
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-[#F4EEE1] font-display">
                {t("betterCareTitle")}
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#D2E6D9] max-w-xl">
                {t("betterCareLead")}
              </p>
            </div>

            {/* High-Contrast, 100% Visible CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Show when="signed-in">
                <Link href="/dashboard">
                  <button className="bg-[#F4EEE1] text-[#1E3A2B] hover:bg-white active:scale-95 font-bold px-7 py-3 rounded-full text-sm shadow-lg transition-all cursor-pointer">
                    {t("openDashboard")}
                  </button>
                </Link>
              </Show>
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <button className="bg-[#F4EEE1] text-[#1E3A2B] hover:bg-white active:scale-95 font-bold px-7 py-3 rounded-full text-sm shadow-lg transition-all cursor-pointer">
                    {t("getStarted")}
                  </button>
                </SignUpButton>
              </Show>

              <HelplineModal>
                <button className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/12 px-6 py-3 text-sm font-semibold text-[#F4EEE1] backdrop-blur-md transition hover:bg-white/25 cursor-pointer">
                  <PhoneCall className="h-4 w-4 text-[#BDEEC5]" />
                  <span>{t("orCallHelpline")}</span>
                </button>
              </HelplineModal>
            </div>
          </div>

          {/* Right Column: Full-Bleed Pastoral Cattle Herd Photography (Side by Side!) */}
          <div className="lg:col-span-5 relative h-72 lg:h-auto min-h-[320px] border-t lg:border-t-0 lg:border-l border-white/20">
            <Image
              src="/images/indian_livestock_hero.jpg"
              alt="Healthy Indian cattle herd under veterinary care in Maharashtra"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#1E3A2B]/85 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </section>
    </div>
  );
}
