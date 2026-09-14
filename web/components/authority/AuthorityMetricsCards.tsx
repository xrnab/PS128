"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { DistrictSnapshotMetrics, SelectedPeriodMetrics, KpiSummaryMetrics } from "@/lib/authority/metrics";
import { MotionCountUp } from "@/components/motion/MotionCountUp";
import {
  Users,
  Home,
  Activity,
  ClipboardList,
  Clock,
  Eye,
  TestTube,
  CheckCircle2,
  ShieldCheck,
  LifeBuoy,
  Footprints,
  Stethoscope,
  ShieldAlert,
  BellRing,
  Calendar,
  Syringe,
  Pill,
  Sparkles,
  CalendarDays,
  Timer,
} from "lucide-react";

interface AuthorityMetricsCardsProps {
  snapshot?: DistrictSnapshotMetrics;
  periodMetrics?: SelectedPeriodMetrics;
  metrics?: KpiSummaryMetrics;
}

const glassCard =
  "p-4 sm:p-4.5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_1px_2px_rgba(30,58,43,0.06),0_10px_28px_rgba(30,58,43,0.08)] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(30,58,43,0.12)] transition-all duration-300 flex flex-col justify-between";

const urgentGlassCard =
  "p-4 sm:p-4.5 rounded-3xl bg-[#F4EEE1]/90 backdrop-blur-[24px] border border-[#C1622D]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_1px_2px_rgba(30,58,43,0.06),0_12px_32px_rgba(30,58,43,0.10),0_0_28px_rgba(193,98,45,0.22)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between";

const attentionGlassCard =
  "p-4 sm:p-4.5 rounded-3xl bg-[#F4EEE1]/90 backdrop-blur-[24px] border border-[#D9A441]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08),0_0_24px_rgba(217,164,65,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between";

const safeGlassCard =
  "p-4 sm:p-4.5 rounded-3xl bg-[#F4EEE1]/90 backdrop-blur-[24px] border border-[#3F6B4A]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between";

export function AuthorityMetricsCards({
  snapshot,
  periodMetrics,
  metrics,
}: AuthorityMetricsCardsProps) {
  const t = useTranslations("authority");

  const snap: DistrictSnapshotMetrics = snapshot || {
    totalFarmers: metrics?.totalFarmers || 0,
    totalFarms: metrics?.totalFarms || 0,
    totalAnimals: metrics?.totalAnimals || 0,
    currentActiveCases: metrics?.activeCases || 0,
    currentPendingReviews: metrics?.pendingReviews || 0,
    currentUnderExam: metrics?.underExamination || 0,
    currentLabReferrals: metrics?.labReferrals || 0,
    currentConfirmedCases: metrics?.confirmedCases || 0,
    currentClosedHarmless: metrics?.closedHarmlessCases || 0,
    currentActiveVisits: metrics?.activeFieldVisits || 0,
    currentActiveRequests: metrics?.activeAssistanceRequests || 0,
    totalVeterinarians: metrics?.totalVeterinarians || 0,
    totalFieldAgents: metrics?.totalFieldAgents || 0,
    currentActiveAlerts: metrics?.activeAlerts || 0,
    currentFollowUpsDue: metrics?.followUpsDue || 0,
  };

  const period: SelectedPeriodMetrics = periodMetrics || {
    periodLabel: "Selected Period",
    periodSubLabel: "Active filter window",
    timeRange: "30d",
    startDate: null,
    endDate: null,
    casesReported: metrics?.activeCases || 0,
    assistanceRequests: metrics?.activeAssistanceRequests || 0,
    fieldVisits: metrics?.activeFieldVisits || 0,
    veterinaryReports: 0,
    alertsCreated: metrics?.activeAlerts || 0,
    vaccinationsRecorded: 0,
    treatmentsRecorded: 0,
    casesConfirmed: metrics?.confirmedCases || 0,
    casesReviewed: 0,
    avgTimeToReviewHours: metrics?.avgTimeToReviewHours ?? null,
    avgTimeToConfirmationHours: metrics?.avgTimeToConfirmationHours ?? null,
  };

  return (
    <div className="space-y-8 text-[#1D1C14]">
      {/* ========================================================================= */}
      {/* SECTION 1: CURRENT DISTRICT STATUS (LIVE SNAPSHOT)                       */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#1E3A2B]/8 pb-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-[#1E3A2B] tracking-tight uppercase font-display">
              {t("currentDistrictStatus")}
            </h3>
            <span className="bg-[#3F6B4A]/15 text-[#3F6B4A] border border-[#3F6B4A]/25 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {t("liveDistrictSnapshot")}
            </span>
          </div>
          <span className="text-xs text-[#4A3324]/70 font-mono">
            {t("ongoingCapacity")}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4">
          {/* 1. Total Farmers */}
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("totalFarmers")}</span>
              <Users className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.totalFarmers} duration={800} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("registeredFarmersDesc")}</div>
            </div>
          </div>

          {/* 2. Total Farms */}
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("totalFarms")}</span>
              <Home className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.totalFarms} duration={800} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("shedsLocations")}</div>
            </div>
          </div>

          {/* 3. Total Animals */}
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("totalAnimals")}</span>
              <Activity className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.totalAnimals} duration={900} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("monitoredLivestock")}</div>
            </div>
          </div>

          {/* 4. Active Health Cases (Urgent Glow) */}
          <div className={urgentGlassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#C1622D] font-bold uppercase">{t("activeCases")}</span>
              <ClipboardList className="h-4 w-4 text-[#C1622D]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#C1622D] font-display">
                <MotionCountUp value={snap.currentActiveCases} duration={800} />
              </div>
              <div className="text-[11px] text-[#C1622D]/85 mt-0.5 font-medium">{t("activeCasesDesc")}</div>
            </div>
          </div>

          {/* 5. Pending Vet Reviews */}
          <div className={attentionGlassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8F6612] font-bold">{t("pendingReviews")}</span>
              <Clock className="h-4 w-4 text-[#D9A441]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.currentPendingReviews} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("awaitingTriage")}</div>
            </div>
          </div>

          {/* 6. Cases Under Examination */}
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("underExam")}</span>
              <Eye className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.currentUnderExam} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("clinicalExamDesc")}</div>
            </div>
          </div>

          {/* 7. Lab Referrals */}
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("labReferrals")}</span>
              <TestTube className="h-4 w-4 text-[#D9A441]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.currentLabReferrals} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("diagnosticsPending")}</div>
            </div>
          </div>

          {/* 8. Cumulative Confirmed Cases (Urgent) */}
          <div className={urgentGlassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#C1622D] font-bold">{t("confirmedCases")}</span>
              <CheckCircle2 className="h-4 w-4 text-[#C1622D]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#C1622D] font-display">
                <MotionCountUp value={snap.currentConfirmedCases} duration={800} />
              </div>
              <div className="text-[11px] text-[#C1622D]/85 mt-0.5 font-medium">{t("clinicallyVerified")}</div>
            </div>
          </div>

          {/* 9. Cumulative Closed / Harmless */}
          <div className={safeGlassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#3F6B4A] font-bold">{t("closedHarmless")}</span>
              <ShieldCheck className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#3F6B4A] font-display">
                <MotionCountUp value={snap.currentClosedHarmless} duration={800} />
              </div>
              <div className="text-[11px] text-[#3F6B4A]/80 mt-0.5 font-medium">{t("resolvedCases")}</div>
            </div>
          </div>

          {/* 10. Active Assistance Requests */}
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("activeRequests")}</span>
              <LifeBuoy className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.currentActiveRequests} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("openFarmerRequestsDesc")}</div>
            </div>
          </div>

          {/* 11. Active Field Visits */}
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("activeVisits")}</span>
              <Footprints className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.currentActiveVisits} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("inProgressPending")}</div>
            </div>
          </div>

          {/* 12. Total Veterinarians */}
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("totalVets")}</span>
              <Stethoscope className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.totalVeterinarians} duration={600} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("clinicalOfficers")}</div>
            </div>
          </div>

          {/* 13. Total Field Agents */}
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("fieldAgents")}</span>
              <ShieldAlert className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.totalFieldAgents} duration={600} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("pashuSakhisDesc")}</div>
            </div>
          </div>

          {/* 14. Active Alerts (Urgent) */}
          <div className={urgentGlassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#C1622D] font-bold">{t("activeAlerts")}</span>
              <BellRing className="h-4 w-4 text-[#C1622D] animate-pulse" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#C1622D] font-display">
                <MotionCountUp value={snap.currentActiveAlerts} duration={600} />
              </div>
              <div className="text-[11px] text-[#C1622D]/85 mt-0.5 font-medium">{t("activeOutbreaks")}</div>
            </div>
          </div>

          {/* 15. Follow-ups Due */}
          <div className={attentionGlassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#8F6612] font-bold">{t("followUpsDue")}</span>
              <Calendar className="h-4 w-4 text-[#D9A441]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={snap.currentFollowUpsDue} duration={600} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("clinicalReviewsDueDesc")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: SELECTED PERIOD ACTIVITY (TIME-FILTERED)                     */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#1E3A2B]/8 pb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-[#1E3A2B] tracking-tight uppercase flex items-center gap-2 font-display">
              <CalendarDays className="h-4 w-4 text-[#3F6B4A]" />
              <span>{t("selectedPeriodActivity", { period: period.periodLabel })}</span>
            </h3>
            <span className="bg-[#1E3A2B]/10 text-[#1E3A2B] border border-white/60 text-xs font-bold px-3 py-0.5 rounded-full">
              {period.periodSubLabel}
            </span>
          </div>
          <span className="text-xs text-[#4A3324]/70 font-mono">
            {t("filteredExclusively", { period: period.periodLabel })}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("casesReported")}</span>
              <ClipboardList className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={period.casesReported} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("intakesInPeriod")}</div>
            </div>
          </div>

          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("assistanceRequests")}</span>
              <LifeBuoy className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={period.assistanceRequests} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("requestsLogged")}</div>
            </div>
          </div>

          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("fieldVisits")}</span>
              <Footprints className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={period.fieldVisits} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("visitsConducted")}</div>
            </div>
          </div>

          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("vetReports")}</span>
              <Stethoscope className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={period.veterinaryReports} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("reportsSubmitted")}</div>
            </div>
          </div>

          <div className={urgentGlassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#C1622D] font-bold">{t("alertsCreated")}</span>
              <BellRing className="h-4 w-4 text-[#C1622D]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#C1622D] font-display">
                <MotionCountUp value={period.alertsCreated} duration={700} />
              </div>
              <div className="text-[11px] text-[#C1622D]/85 mt-0.5 font-medium">{t("clusterAlertsTriggered")}</div>
            </div>
          </div>

          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("vaccinations")}</span>
              <Syringe className="h-4 w-4 text-[#3F6B4A]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={period.vaccinationsRecorded} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("dosesAdministered")}</div>
            </div>
          </div>

          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("treatments")}</span>
              <Pill className="h-4 w-4 text-[#D9A441]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={period.treatmentsRecorded} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("medicationsGiven")}</div>
            </div>
          </div>

          <div className={urgentGlassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#C1622D] font-bold">{t("confirmedInPeriod")}</span>
              <CheckCircle2 className="h-4 w-4 text-[#C1622D]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#C1622D] font-display">
                <MotionCountUp value={period.casesConfirmed} duration={700} />
              </div>
              <div className="text-[11px] text-[#C1622D]/85 mt-0.5 font-medium">{t("diagnosesFinalizedDesc")}</div>
            </div>
          </div>

          <div className={glassCard}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#4A3324]/75 font-semibold">{t("casesReviewedInPeriod")}</span>
              <Sparkles className="h-4 w-4 text-[#D9A441]" />
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display">
                <MotionCountUp value={period.casesReviewed} duration={700} />
              </div>
              <div className="text-[11px] text-[#4A3324]/70 mt-0.5">{t("clinicalTriagesCompleted")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: CLINICAL PERFORMANCE & TURNAROUND (Selected Period)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-[#F4EEE1]/85 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[#4A3324]/80 font-bold">
              <Timer className="h-4 w-4 text-[#D9A441]" />
              <span>{t("avgTimeToReview")}</span>
            </div>
            <div className="text-2xl font-bold text-[#1E3A2B] font-display">
              {period.avgTimeToReviewHours !== null
                ? `${period.avgTimeToReviewHours} ${t("hoursUnit")}`
                : t("noReviewsInPeriod")}
            </div>
            <div className="text-xs text-[#4A3324]/70">{t("intakeToTriage")}</div>
          </div>
          <span className="text-xs bg-[#D9A441]/15 text-[#8F6612] font-bold px-3 py-1 rounded-full border border-white/60">
            {t("speedMetric")}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-[#F4EEE1]/85 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[#4A3324]/80 font-bold">
              <Clock className="h-4 w-4 text-[#3F6B4A]" />
              <span>{t("avgTimeToConfirmation")}</span>
            </div>
            <div className="text-2xl font-bold text-[#1E3A2B] font-display">
              {period.avgTimeToConfirmationHours !== null
                ? `${period.avgTimeToConfirmationHours} ${t("hoursUnit")}`
                : t("noConfirmationsInPeriod")}
            </div>
            <div className="text-xs text-[#4A3324]/70">{t("intakeToConfirmation")}</div>
          </div>
          <span className="text-xs bg-[#3F6B4A]/15 text-[#3F6B4A] font-bold px-3 py-1 rounded-full border border-white/60">
            {t("diagnosticSpeed")}
          </span>
        </div>
      </div>
    </div>
  );
}
