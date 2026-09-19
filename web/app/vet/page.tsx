import React from "react";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getVetQueueAction, getVetDashboardMetricsAction } from "@/lib/actions/vet";
import { RiskBadge } from "@/components/ai/RiskBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDoctorName } from "@/lib/utils";
import { SurveillanceHeatmap } from "@/components/authority/SurveillanceHeatmap";
import type { MapMarkerData } from "@/components/authority/mapUtils";
import {
  Activity,
  Cpu,
  ArrowRight,
  Clock,
  AlertTriangle,
  ShieldCheck,
  CalendarCheck,
  RotateCcw,
  Thermometer,
  Radio,
  FileText,
  User,
  CheckCircle2,
  ChevronRight,
  Stethoscope,
  FlaskConical,
  Camera,
  MapPin,
} from "lucide-react";
import { CaseThumbnail } from "@/components/vet/CaseThumbnail";

function resolveFeaturedPhoto(photoUrl?: string | null, species?: string, caseId?: string): string {
  const fallback =
    species?.toUpperCase() === "GOAT"
      ? "/images/osmanabadi_goat.jpg"
      : "/images/buffalo_dairy_care.jpg";
  if (!photoUrl || typeof photoUrl !== "string") return fallback;
  const trimmed = photoUrl.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("data:")) return trimmed;
  if (
    trimmed.includes("mock-blob.vercel-storage.com") ||
    trimmed.includes("blob.vercel-storage.com") ||
    trimmed.startsWith("cases/")
  ) {
    return caseId ? `/api/media/photo/${caseId}` : fallback;
  }
  return trimmed;
}

function formatSymptomsList(symptoms: unknown, diagnosis?: string | null): string {
  if (diagnosis && typeof diagnosis === "string" && diagnosis.trim().length > 0) {
    return diagnosis;
  }
  if (!symptoms) return "Clinical observation under review";
  if (Array.isArray(symptoms)) {
    return symptoms.filter(Boolean).map((s) => String(s).trim()).join(" • ");
  }
  if (typeof symptoms === "string") {
    try {
      const parsed = JSON.parse(symptoms);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((s) => String(s).trim()).join(" • ");
      }
    } catch {
      // not JSON
    }
    return symptoms
      .replace(/([a-z0-9\)])([A-Z])/g, "$1 • $2")
      .replace(/•\s*•/g, "•")
      .trim();
  }
  return String(symptoms);
}

export default async function VetDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    risk?: string;
    villageId?: string;
    species?: string;
    scope?: "assigned" | "service_area";
    q?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params.status;
  const riskFilter = params.risk;
  const speciesFilter = params.species;
  const scopeFilter = (params.scope as "assigned" | "service_area") || "assigned";

  const [metrics, queue] = await Promise.all([
    getVetDashboardMetricsAction(),
    getVetQueueAction({
      status: statusFilter,
      riskLevel: riskFilter,
      species: speciesFilter,
      scope: scopeFilter,
    }),
  ]);

  // Featured critical lead (top item from queue or priority lead)
  const featuredCase = queue.find((c) => {
    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
    return analysis.overall_risk_level === "CRITICAL" || c.status === "PENDING_REVIEW";
  }) || queue[0];

  const featuredAnalysis = (featuredCase?.analysisResult as Record<string, unknown> | null) || {};
  const featuredTelemetry = (featuredCase?.iotTelemetry as Record<string, unknown> | null) || {};
  const featuredTemp = (featuredTelemetry.temperature as number) || (featuredTelemetry.temp as number) || 41.2;
  const featuredActivity = (featuredTelemetry.activity_index as number) || (featuredTelemetry.activity as number) || 24;
  const featuredScore = Number(featuredAnalysis.overall_risk_score || 94);
  const featuredLevel = (featuredAnalysis.overall_risk_level as string) || "CRITICAL";

  // Unique villages represented in the current queue
  const uniqueVillages = Array.from(
    new Set(queue.map((c) => c.animal.herd.farm.village.name).filter(Boolean))
  );

  // Real GIS Map Markers for District Spatial Surveillance
  const mapMarkers: MapMarkerData[] = queue.length > 0
    ? queue.map((c) => {
        const lat = c.gpsLat ?? c.animal.herd.farm.latitude ?? 18.5204;
        const lng = c.gpsLng ?? c.animal.herd.farm.longitude ?? 73.8567;
        const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
        const isCritical = analysis.overall_risk_level === "CRITICAL" || c.status === "PENDING_REVIEW";
        return {
          id: c.id,
          name: `Case #${c.caseNumber} · ${c.animal.species} (${c.animal.tag})`,
          blockName: `${c.animal.herd.farm.village.name} Village Cluster`,
          lat: Number(lat),
          lng: Number(lng),
          activeAlert: isCritical,
          diseaseName: c.vetDiagnosis || (Array.isArray(c.symptoms) ? c.symptoms.join(", ") : (c.symptoms as string)) || "Clinical Anomaly",
          caseCount: 1,
          highRiskCount: isCritical ? 1 : 0,
          confirmedCount: c.status === "UNDER_EXAMINATION" ? 1 : 0,
        };
      })
    : [
        {
          id: "vet-center-1",
          name: "District Veterinary Polyclinic",
          blockName: "District Clinical Scope",
          lat: 18.5204,
          lng: 73.8567,
          activeAlert: false,
          diseaseName: "Active Surveillance",
          caseCount: 0,
          highRiskCount: 0,
          confirmedCount: 0,
        },
      ];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 space-y-6 text-[#1D1C14] dark:text-[#F4EEE1]">
      {/* Eyebrow & Hero Title Unit (Compact & Refined) */}
      <section className="relative pt-1 pb-1 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3A2B]/10 backdrop-blur-md border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C1622D] opacity-85"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C1622D]"></span>
            </span>
            <span className="text-[11px] uppercase tracking-wider text-[#1E3A2B] font-bold">
              LIVE CLINICAL DISPATCH · DISTRICT HUB
            </span>
          </span>
          <span className="hidden sm:inline-flex items-center text-xs text-[#4A3324]/75 font-medium tracking-wide">
            Veterinary Clinical Priority Workstation
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1E3A2B] font-display">
              Triage with quiet clarity.
            </h1>
            <p className="text-xs sm:text-sm text-[#4A3324]/80 max-w-2xl mt-1 font-normal leading-relaxed">
              Real-time biomarker anomaly detection, autonomous diagnostic synthesis, and prioritized clinician workflows across rural livestock clusters.
            </p>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-end">
            <Link href={`/vet?scope=${scopeFilter}`}>
              <button
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  !riskFilter && !statusFilter
                    ? "liquid-button-primary"
                    : "liquid-button-glass"
                }`}
              >
                All Queues ({queue.length})
              </button>
            </Link>
            <Link href={`/vet?scope=${scopeFilter}&risk=CRITICAL`}>
              <button
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  riskFilter === "CRITICAL"
                    ? "liquid-button-primary"
                    : "liquid-button-glass"
                }`}
              >
                Critical ({metrics.criticalCount})
              </button>
            </Link>
            <Link href={`/vet?scope=${scopeFilter}&status=UNDER_EXAMINATION`}>
              <button
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  statusFilter === "UNDER_EXAMINATION"
                    ? "liquid-button-primary"
                    : "liquid-button-glass"
                }`}
              >
                Under Exam ({metrics.underExamCount})
              </button>
            </Link>
          </div>
        </div>

        {/* Scope Switcher: Assigned to Me vs Service Area */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex items-center gap-1 p-1 bg-white/70 backdrop-blur-md rounded-full border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
            <Link
              href={`/vet?scope=assigned${statusFilter ? `&status=${statusFilter}` : ""}${riskFilter ? `&risk=${riskFilter}` : ""}${speciesFilter ? `&species=${speciesFilter}` : ""}`}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                scopeFilter === "assigned"
                  ? "bg-[#1E3A2B] text-[#F4EEE1] shadow-sm font-semibold"
                  : "text-[#1E3A2B]/70 hover:text-[#1E3A2B]"
              }`}
            >
              Assigned to me ({metrics.myAssignedCount})
            </Link>
            <Link
              href={`/vet?scope=service_area${statusFilter ? `&status=${statusFilter}` : ""}${riskFilter ? `&risk=${riskFilter}` : ""}${speciesFilter ? `&species=${speciesFilter}` : ""}`}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                scopeFilter === "service_area"
                  ? "bg-[#1E3A2B] text-[#F4EEE1] shadow-sm font-semibold"
                  : "text-[#1E3A2B]/70 hover:text-[#1E3A2B]"
              }`}
            >
              In my service area
            </Link>
          </div>
          {(statusFilter || riskFilter || speciesFilter) && (
            <Link href={`/vet?scope=${scopeFilter}`}>
              <Button size="sm" variant="ghost" className="text-xs text-[#1E3A2B] gap-1 h-7 rounded-full cursor-pointer">
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Bento Mesh Section: 4 Compact Proportional Tiles (Balanced 6 + 2 + 2 + 2 Layout) */}
      <section className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        {/* Card 1: Priority Level 1 Anomaly Card */}
        <div className="sm:col-span-2 lg:col-span-6 relative overflow-hidden rounded-3xl liquid-glass-amber p-4 sm:p-5 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-0.5 min-h-[155px]">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#C1622D]/15 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] uppercase tracking-wider text-[#C1622D] font-bold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C1622D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C1622D] shadow-[0_0_10px_#C1622D]"></span>
              </span>
              PRIORITY LEVEL 1 ANOMALY
            </span>
            <span className="text-[10px] text-[#4A3324]/60 font-medium">Synchronized</span>
          </div>

          <div className="my-2.5 flex items-center gap-4 relative z-10">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1E3A2B] font-display shrink-0">
              {String(metrics.criticalCount).padStart(2, "0")}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-bold text-[#1E3A2B] leading-tight">
                Cases Requiring Immediate Clinical Intervention
              </span>
              <span className="text-[11px] text-[#4A3324]/75 mt-0.5 line-clamp-1 font-medium">
                {featuredCase
                  ? `${featuredCase.animal.species} (${featuredCase.animal.tag}) • ${featuredCase.vetDiagnosis || featuredCase.symptoms || "High Fever (41.2°C), Blisters on Tongue, Severe Lameness"}`
                  : "Rumen acidosis, peripartum recumbency, & acute tympany clusters"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#C1622D]/15 relative z-10 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                <div className="w-5 h-5 rounded-full bg-[#1E3A2B] text-[#F4EEE1] flex items-center justify-center text-[8px] font-bold shadow-xs">P1</div>
                <div className="w-5 h-5 rounded-full bg-[#3F6B4A] text-[#F4EEE1] flex items-center justify-center text-[8px] font-bold shadow-xs">P3</div>
                <div className="w-5 h-5 rounded-full bg-[#D9A441] text-[#1E3A2B] flex items-center justify-center text-[8px] font-bold shadow-xs">P7</div>
              </div>
              <span className="text-[11px] text-[#4A3324]/80 font-medium">
                {uniqueVillages.length} active village clusters
              </span>
            </div>
            {featuredCase && (
              <a href="#featured-dossier" className="text-[11px] font-bold text-[#C1622D] hover:text-[#1E3A2B] flex items-center gap-1 transition-colors">
                View Primary Lead ↓
              </a>
            )}
          </div>
        </div>

        {/* Card 2: Active Triage Queue */}
        <div className="sm:col-span-1 lg:col-span-2 rounded-3xl liquid-glass-card p-4 sm:p-4.5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 min-h-[155px]">
          <div className="flex items-center justify-between text-[#4A3324]/70">
            <div className="w-8 h-8 rounded-xl bg-[#3F6B4A]/12 text-[#3F6B4A] flex items-center justify-center shadow-xs">
              <Cpu className="h-4 w-4" />
            </div>
            <span className="text-[10px] text-[#3F6B4A] font-bold px-2 py-0.5 rounded-full bg-[#3F6B4A]/10">
              Active
            </span>
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display block">
              {metrics.pendingCount + metrics.underExamCount}
            </span>
            <span className="text-[10px] text-[#4A3324]/70 uppercase tracking-wider block font-bold mt-0.5">
              ACTIVE TRIAGE QUEUE
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-[#1E3A2B]/8 rounded-full overflow-hidden">
              <div className="h-full bg-[#3F6B4A] rounded-full" style={{ width: "72%" }} />
            </div>
            <span className="text-[9px] text-[#4A3324]/60 font-semibold block text-right">72% active load</span>
          </div>
        </div>

        {/* Card 3: Follow-ups Due */}
        <div className="sm:col-span-1 lg:col-span-2 rounded-3xl liquid-glass-card p-4 sm:p-4.5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 min-h-[155px]">
          <div className="flex items-center justify-between text-[#4A3324]/70">
            <div className="w-8 h-8 rounded-xl bg-[#D9A441]/15 text-[#D9A441] flex items-center justify-center shadow-xs">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <span className="text-[10px] text-[#8F6612] font-bold px-2 py-0.5 rounded-full bg-[#D9A441]/15">
              Rostered
            </span>
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display block">
              {metrics.followUpsDueCount}
            </span>
            <span className="text-[10px] text-[#4A3324]/70 uppercase tracking-wider block font-bold mt-0.5">
              FOLLOW-UPS DUE
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-[#1E3A2B]/8 rounded-full overflow-hidden">
              <div className="h-full bg-[#D9A441] rounded-full" style={{ width: "85%" }} />
            </div>
            <span className="text-[9px] text-[#4A3324]/60 font-semibold block text-right">Scheduled</span>
          </div>
        </div>

        {/* Card 4: Diagnostic Tests */}
        <div className="sm:col-span-2 lg:col-span-2 rounded-3xl liquid-glass-card p-4 sm:p-4.5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5 min-h-[155px]">
          <div className="flex items-center justify-between text-[#4A3324]/70">
            <div className="w-8 h-8 rounded-xl bg-[#1E3A2B]/10 text-[#1E3A2B] flex items-center justify-center shadow-xs">
              <FlaskConical className="h-4 w-4" />
            </div>
            <span className="text-[10px] text-[#F4EEE1] bg-[#1E3A2B] px-2 py-0.5 rounded-full font-bold">
              Lab
            </span>
          </div>
          <div className="my-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] font-display block">
              {metrics.labRefCount}
            </span>
            <span className="text-[10px] text-[#4A3324]/70 uppercase tracking-wider block font-bold mt-0.5">
              DIAGNOSTIC TESTS
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-[#1E3A2B]/8 rounded-full overflow-hidden">
              <div className="h-full bg-[#1E3A2B] rounded-full" style={{ width: "92%" }} />
            </div>
            <span className="text-[9px] text-[#4A3324]/60 font-semibold block text-right">Awaiting lab</span>
          </div>
        </div>
      </section>

      {/* Urgent Inspection Floating Glass Dossier (Stitch Liquid Ledger Specification) */}
      {featuredCase && (
        <section className="w-full my-6" id="featured-dossier">
          <div className="relative rounded-3xl liquid-glass-card p-6 sm:p-8 lg:p-9 overflow-hidden">
            {/* Subtle top specular edge glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />
            <div className="ambient-blob -bottom-28 -left-20 w-80 h-80 bg-[#C1622D]/10 blur-3xl pointer-events-none" />

            {/* Dossier Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-[#1E3A2B]/10">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/90 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_2px_8px_rgba(193,98,45,0.08)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C1622D] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C1622D]" />
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-[#C1622D] font-bold">
                    Critical Dispatch
                  </span>
                  <span className="text-stone-300 font-bold">•</span>
                  <span className="text-[11px] uppercase tracking-wider text-[#4A3324]/80 font-bold">
                    Priority 1
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#1E3A2B]">Case #{featuredCase.caseNumber}</span>
                <span className="text-stone-300">•</span>
                <span className="text-xs text-[#4A3324]/75">Reported {formatDateTime(featuredCase.reportedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/70 dark:bg-white/10 backdrop-blur-md border border-white/90 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(30,58,43,0.06)] text-[#1E3A2B]">
                  <MapPin className="h-3.5 w-3.5 text-[#3F6B4A]" />
                  <span className="text-xs font-semibold tracking-tight">
                    {featuredCase.animal.herd.farm.village.name} Village Cluster
                  </span>
                </div>
              </div>
            </div>

            {/* Dossier Stitch 4-Col / 8-Col Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-6">
              {/* Column 1 (4 cols): Physical Inspection & Custodian */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_12px_24px_rgba(30,58,43,0.18)] border border-white/80">
                  <img
                    className="w-full h-full object-cover"
                    src={resolveFeaturedPhoto(featuredCase.photoUrl, featuredCase.animal.species, featuredCase.id)}
                    alt={featuredCase.animal.tag}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E3A2B]/85 via-[#1E3A2B]/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-[#F4EEE1]">
                    <div>
                      <p className="text-xl font-bold leading-tight drop-shadow-sm font-display">
                        {featuredCase.animal.breed || featuredCase.animal.species}
                      </p>
                      <p className="text-xs text-[#AECEB9] mt-0.5 font-medium">
                        {featuredCase.animal.species} · Tag #{featuredCase.animal.tag}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-mono font-semibold text-[#F4EEE1] border border-white/25">
                      {featuredCase.animal.species}
                    </span>
                  </div>
                </div>

                {/* Custodian Micro Card */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] border border-white/80 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1E3A2B]/10 flex items-center justify-center text-[#1E3A2B] font-bold text-xs shadow-xs">
                      <User className="h-4 w-4 text-[#1E3A2B]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1E3A2B]">
                        {featuredCase.animal.herd.farm.name}
                      </p>
                      <p className="text-[11px] text-[#4A3324]/75">
                        {featuredCase.animal.herd.farm.village.name} Village Cluster
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-[#3F6B4A]" />
                </div>
              </div>

              {/* Column 2 (8 cols): Biometric Spline Curve, Clinical Synthesis, & Actions */}
              <div className="lg:col-span-8 flex flex-col justify-between gap-4">
                {/* Thermal Excursion & Inline SVG Spline Curve */}
                <div className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)] border border-white/80 dark:border-white/10 flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#C1622D] font-bold flex items-center gap-1.5">
                        <Thermometer className="h-3.5 w-3.5" />
                        Acute Thermal Excursion
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl sm:text-4xl font-bold text-[#C1622D] tracking-tight font-display">
                          {featuredTemp}°C
                        </span>
                        <span className="text-xs font-bold text-[#C1622D] bg-[#C1622D]/10 px-2.5 py-0.5 rounded-full border border-[#C1622D]/20">
                          +2.6°C Above Basal
                        </span>
                      </div>
                    </div>

                    {/* Differentiated Activity Index & Basal Telemetry */}
                    <div className="flex flex-wrap items-center sm:justify-end gap-2.5">
                      <span className="text-xs text-[#4A3324]/70 font-medium">
                        Basal Ref: <strong className="text-[#1E3A2B] font-mono">38.6°C</strong>
                      </span>
                      <span className="text-stone-300 hidden sm:inline">•</span>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_2px_8px_rgba(30,58,43,0.06)]">
                        <Activity className="h-3.5 w-3.5 text-[#C1622D]" />
                        <span className="text-[10px] uppercase tracking-wider text-[#4A3324]/70 font-bold">Activity</span>
                        <span className="text-xs font-bold text-[#1E3A2B] font-mono">{featuredActivity}/100</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-[#C1622D]/12 text-[#C1622D] text-[10px] font-bold tracking-tight">
                          {featuredActivity < 30 ? "Severe Slump" : "Attenuated"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inline SVG Spline Temperature Surge Chart */}
                  <div className="w-full h-24 sm:h-28 relative pt-2">
                    <svg className="w-full h-full overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 540 100">
                      <defs>
                        <linearGradient id="terracottaFade" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#C1622D" stopOpacity="0.32" />
                          <stop offset="100%" stopColor="#C1622D" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Reference Baseline (Nominal 38.6C) */}
                      <line stroke="#727973" strokeDasharray="4 4" strokeOpacity="0.4" strokeWidth="1" x1="0" x2="540" y1="78" y2="78" />
                      <text className="text-[10px]" fill="#727973" opacity="0.8" x="8" y="72">Nominal Baseline (38.6°C)</text>
                      {/* Shaded Area Under Spline */}
                      <path d="M0,80 C80,79 140,78 210,76 C280,74 330,68 390,42 C440,20 480,12 540,10 L540,95 L0,95 Z" fill="url(#terracottaFade)" />
                      {/* Spline Line Curve */}
                      <path d="M0,80 C80,79 140,78 210,76 C280,74 330,68 390,42 C440,20 480,12 540,10" stroke="#C1622D" strokeLinecap="round" strokeWidth="3" />
                      {/* Live Point Pulsing */}
                      <circle cx="540" cy="10" fill="#C1622D" r="5" />
                      <circle className="animate-ping" cx="540" cy="10" opacity="0.6" r="10" stroke="#C1622D" strokeWidth="1.5" />
                    </svg>
                    <div className="flex justify-between text-[10px] text-[#4A3324]/70 mt-1 font-medium">
                      <span>04:00 (Nominal)</span>
                      <span>06:30 (Milking)</span>
                      <span>08:15 (Thermal Drift)</span>
                      <span className="font-semibold text-[#C1622D]">Live (Anomaly Spike)</span>
                    </div>
                  </div>
                </div>

                {/* Automated Diagnostic Synthesis */}
                <div className="rounded-2xl bg-white/55 dark:bg-white/5 backdrop-blur-xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)] border border-white/80 dark:border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-[#1E3A2B]" />
                      <span className="text-[11px] uppercase tracking-wider text-[#1E3A2B] font-bold">
                        Automated Diagnostic Synthesis
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#4A3324]/80 font-medium">AI Confidence:</span>
                      <span className="text-xs font-bold text-[#1E3A2B] font-mono">{featuredScore}/100</span>
                      <RiskBadge level={featuredLevel} />
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#1D1C14] leading-relaxed mt-0.5">
                    “Acute biometric excursion detected. Presenting clinical signs:{" "}
                    <strong className="text-[#1E3A2B] font-bold">
                      {formatSymptomsList(featuredCase.symptoms, featuredCase.vetDiagnosis)}
                    </strong>
                    . Immediate clinical triage, physical isolation, and paravet verification protocol recommended.”
                  </p>

                  <div className="pt-2 border-t border-[#1E3A2B]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4A3324]/75">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#1E3A2B]" />
                      Assigned Veterinarian:{" "}
                      <strong className="text-[#1E3A2B] font-semibold">
                        {featuredCase.assignedVeterinarianUser
                          ? `Dr. ${featuredCase.assignedVeterinarianUser.name}`
                          : "Available for assignment in personal queue"}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Start Clinical Examination CTA (Shifted to Bottom Right) */}
                <div className="flex items-center justify-end pt-2">
                  <Link href={`/vet/cases/${featuredCase.id}`}>
                    <Button className="px-6 py-2.5 rounded-full bg-[#1E3A2B] text-[#F4EEE1] hover:bg-[#3F6B4A] font-semibold text-xs shadow-[0_12px_24px_rgba(30,58,43,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer h-10">
                      <span>Start Clinical Examination</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Triage Queue Station */}
      <section className="liquid-glass-card rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E3A2B]/10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1E3A2B] font-display">
              Active Triage Registry
            </h2>
            <p className="text-xs text-[#4A3324]/75 mt-0.5">
              {queue.length} clinical cases prioritized by urgency and reporting timeline
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(statusFilter || riskFilter || speciesFilter) && (
              <Link href={`/vet?scope=${scopeFilter}`}>
                <Button size="sm" variant="outline" className="liquid-button-glass text-xs h-8 px-2.5 gap-1 rounded-full text-[#C1622D]">
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Filters</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Queue Items */}
        {queue.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500 rounded-2xl bg-[#F4EEE1]/60 border border-white/60">
            <ShieldCheck className="h-10 w-10 text-[#3F6B4A] mx-auto mb-2" />
            <p className="font-bold text-[#1E3A2B] text-base">Triage Queue Clear</p>
            <p className="text-[#4A3324]/70 mt-1">No clinical cases currently match the selected criteria.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {queue.map((item) => {
              const analysis = (item.analysisResult as Record<string, unknown> | null) || {};
              const level = (analysis.overall_risk_level as string) || "UNKNOWN";
              const score = Number(analysis.overall_risk_score || 0);

              const isCritical = level === "CRITICAL" || item.status === "PENDING_REVIEW";
              const isAttention = level === "HIGH" || level === "MEDIUM";

              const formattedSymptoms = formatSymptomsList(item.symptoms, item.vetDiagnosis);

              return (
                <div
                  key={item.id}
                  className="relative rounded-2xl liquid-glass-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Animal Photo Thumbnail with resilient fallback */}
                    <CaseThumbnail
                      photoUrl={item.photoUrl}
                      caseId={item.id}
                      species={item.animal.species}
                      tag={item.animal.tag}
                      isCritical={isCritical}
                      isAttention={isAttention}
                    />

                    {/* Metadata */}
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base sm:text-lg font-bold text-[#1E3A2B] font-display">
                          Case #{item.caseNumber} · {item.animal.tag}
                        </span>
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/80 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_4px_rgba(193,98,45,0.12)] text-[#C1622D] text-[10px] font-bold tracking-wider uppercase">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C1622D] opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C1622D]" />
                            </span>
                            CRITICAL DISPATCH
                          </span>
                        ) : isAttention ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/80 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_4px_rgba(217,164,65,0.12)] text-[#8F6612] text-[10px] font-bold tracking-wider uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441]" />
                            ATTENTION • SOMATIC SURGE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/80 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_4px_rgba(63,107,74,0.10)] text-[#3F6B4A] text-[10px] font-bold tracking-wider uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B4A]" />
                            STABILIZED • SURVEILLANCE
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#4A3324]/80 mt-1 leading-relaxed">
                        {item.animal.species} • Farm: {item.animal.herd.farm.name} ({item.animal.herd.farm.village.name}) •{" "}
                        <strong className="text-[#1E3A2B] font-semibold">
                          {formattedSymptoms}
                        </strong>
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-[#4A3324]/70 mt-2 font-medium">
                        <span className="flex items-center gap-1 text-[#1E3A2B]">
                          <Activity className="h-3.5 w-3.5 text-[#3F6B4A]" /> AI Risk: {score || level}
                        </span>
                        <span>•</span>
                        <span className="text-[#4A3324]/70">
                          {formatDateTime(item.reportedAt)}
                        </span>
                        {item.assignedVeterinarianUser && (
                          <>
                            <span>•</span>
                            <span className="text-[#3F6B4A] font-semibold">
                              {formatDoctorName(item.assignedVeterinarianUser.name)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Hub */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <Link href={`/vet/cases/${item.id}`}>
                      <Button size="sm" className="rounded-full bg-[#1E3A2B] text-[#F4EEE1] hover:bg-[#3F6B4A] shadow-[0_6px_14px_rgba(30,58,43,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)] text-xs px-5 h-9 font-semibold cursor-pointer transition-all">
                        Review Dossier
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* District Surveillance Sector Visualizer & Clinical Operations Split */}
      <section className="w-full my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* District Sector Map Canvas */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          {/* Real Interactive GIS Spatial Map with OpenStreetMap */}
          <SurveillanceHeatmap
            markers={mapMarkers}
            districtName="District Triage Scope"
            mapHeight="h-[340px] sm:h-[380px]"
          />

          {/* Integrated Priority Leads Triage Ticker */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-white/80 shadow-xs">
              <p className="text-[11px] text-[#4A3324]/75 font-medium">Critical Leads</p>
              <p className="text-lg font-bold text-[#1E3A2B] font-display">
                {String(metrics.criticalCount).padStart(2, "0")}{" "}
                <span className="text-xs text-[#C1622D] font-bold">Urgent</span>
              </p>
            </div>
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-white/80 shadow-xs">
              <p className="text-[11px] text-[#4A3324]/75 font-medium">Under Review</p>
              <p className="text-lg font-bold text-[#1E3A2B] font-display">
                {String(metrics.pendingCount).padStart(2, "0")}{" "}
                <span className="text-xs text-[#D9A441] font-bold">Intake</span>
              </p>
            </div>
            <div className="p-3.5 rounded-2xl liquid-glass-card border border-white/80 shadow-xs">
              <p className="text-[11px] text-[#4A3324]/75 font-medium">Monitored Villages</p>
              <p className="text-lg font-bold text-[#1E3A2B] font-display">
                {String(uniqueVillages.length || 8).padStart(2, "0")}{" "}
                <span className="text-xs text-[#3F6B4A] font-bold">Active</span>
              </p>
            </div>
          </div>
        </div>

        {/* Clinician Directive Panel (Exact Stitch Tiles & Deep Pine Palette) */}
        <div className="lg:col-span-5 rounded-3xl bg-[#1E3A2B] text-[#F4EEE1] p-6 sm:p-7 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.3),0_24px_48px_rgba(30,58,43,0.2)] flex flex-col justify-between relative overflow-hidden">
          {/* Specular light catch & ambient glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#3F6B4A]/30 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs uppercase tracking-wider text-[#BDEEC5] font-semibold">
              Clinician Directive
            </span>
            <h3 className="text-2xl font-bold text-[#F4EEE1] tracking-tight font-display">
              Clinical Operations
            </h3>
            <p className="text-xs text-[#AECEB9] mt-1 leading-relaxed">
              Coordinate lab confirmations, scheduled field follow-ups, and frontline intake reports across local livestock networks.
            </p>
          </div>

          {/* Stitch-Style Operational Action Tiles */}
          <div className="my-6 flex flex-col gap-3.5 relative z-10">
            <Link href="/vet/samples" className="block group">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 hover:bg-white/[0.15] transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#BDEEC5]">
                      <FlaskConical className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold text-[#F4EEE1] group-hover:text-white transition-colors">
                      Review Lab Samples
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#BDEEC5] text-[10px] font-bold border border-white/10">
                    {metrics.labRefCount || 0} Pending
                  </span>
                </div>
                <p className="text-[11px] text-[#AECEB9] leading-relaxed">
                  Bacterial culture isolates, sensitivity tests, and confirmatory lab records awaiting review.
                </p>
              </div>
            </Link>

            <Link href="/vet/follow-ups" className="block group">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 hover:bg-white/[0.15] transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#F5D485]">
                      <CalendarCheck className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold text-[#F4EEE1] group-hover:text-white transition-colors">
                      Visits & Field Schedule
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#F5D485] text-[10px] font-bold border border-white/10">
                    {metrics.followUpsDueCount || 0} Due
                  </span>
                </div>
                <p className="text-[11px] text-[#AECEB9] leading-relaxed">
                  Rostered farm inspections, paravet verification rounds, and post-treatment recovery checks.
                </p>
              </div>
            </Link>
          </div>

          {/* Stitch-Style Action CTA */}
          <div className="relative z-10 pt-2">
            <Link href="/farmer/report" className="block">
              <button className="w-full py-3.5 px-5 rounded-full bg-[#F4EEE1] text-[#1E3A2B] font-semibold text-xs shadow-[0_8px_16px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:bg-white hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer">
                <Stethoscope className="h-4 w-4 text-[#1E3A2B]" />
                <span>Report Health Concern</span>
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
