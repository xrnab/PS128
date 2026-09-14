import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAnimalDetailHistoryAction } from "@/lib/actions/animal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/ai/RiskBadge";
import {
  ArrowLeft,
  HeartPulse,
  Syringe,
  Stethoscope,
  Pill,
  FlaskConical,
  Calendar,
  PlusCircle,
  Clock,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ animalId: string }>;
}) {
  const { animalId } = await params;
  const t = await getTranslations("farmer");
  const tCommon = await getTranslations("common");

  let animalDossier;
  try {
    animalDossier = await getAnimalDetailHistoryAction(animalId);
  } catch {
    notFound();
  }

  const { animal, activeCase, latestReport, timeline, allVaccinations, allTreatments } = animalDossier;

  // Helper for animal default image
  const getAnimalImage = (species: string) => {
    const s = species.toLowerCase();
    if (s.includes("buffalo") || s.includes("म्हैस")) return "/images/buffalo_dairy_care.jpg";
    if (s.includes("goat") || s.includes("sheep") || s.includes("शेळी") || s.includes("मेंढी")) return "/images/osmanabadi_goat.jpg";
    return "/images/vet_field_examination.jpg";
  };

  const activeRiskLevel = activeCase
    ? ((activeCase.analysisResult as Record<string, unknown> | null)?.overall_risk_level as string) || "PENDING"
    : "STABLE";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3A2B]/8 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/farmer">
            <button
              type="button"
              className="h-9 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] gap-1.5 rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("backToRegister")}</span>
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] tracking-tight font-display">
                {animal.species} • Ear Tag: {animal.tag}
              </h1>
              <Badge className={activeCase ? "bg-[#C1622D]/15 text-[#C1622D] border border-[#C1622D]/30 font-semibold" : "bg-[#3F6B4A]/12 text-[#3F6B4A] border border-white/60 font-semibold"}>
                {activeCase ? `Under Care (${activeCase.status})` : "Healthy / Stable"}
              </Badge>
            </div>
            <p className="text-xs text-[#4A3324]/75 mt-0.5">
              {t("passportTitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/farmer/iot?animalId=${animal.id}`}>
            <button
              type="button"
              className="h-8 px-3.5 text-xs gap-1.5 border border-white/80 text-[#3F6B4A] bg-white/80 hover:bg-white rounded-full font-semibold shadow-xs inline-flex items-center cursor-pointer transition-all"
            >
              <Cpu className="h-4 w-4 text-[#3F6B4A]" />
              <span>{t("iotVitals")}</span>
            </button>
          </Link>
          <Link href={`/farmer/request-help?animalId=${animal.id}`}>
            <button
              type="button"
              className="h-8 px-3.5 text-xs gap-1.5 border border-white/80 text-[#8F6612] bg-white/80 hover:bg-white rounded-full font-semibold shadow-xs inline-flex items-center cursor-pointer transition-all"
            >
              <UserCheck className="h-4 w-4 text-[#D9A441]" />
              <span>{t("requestAgent")}</span>
            </button>
          </Link>
          <Link href={`/farmer/report?animalId=${animal.id}`}>
            <button
              type="button"
              className="h-8 px-3.5 text-xs gap-1.5 liquid-button-primary text-white font-bold rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{t("reportHealthConcern")}</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Grid: Animal Profile & Current Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Animal Profile Card */}
        <Card className="liquid-glass-card rounded-3xl overflow-hidden p-0 shadow-xs">
          <div className="relative h-44 w-full bg-stone-100">
            <Image
              src={getAnimalImage(animal.species)}
              alt={animal.tag}
              fill
              className="object-cover"
            />
            <div className="absolute top-3 left-3">
              <Badge className="bg-white/90 text-stone-900 border-stone-300 backdrop-blur-xs font-mono font-bold text-xs">
                TAG: {animal.tag}
              </Badge>
            </div>
          </div>
          <CardContent className="p-5 space-y-3.5 text-xs">
            <div className="border-b border-[#E5E0D8] pb-3">
              <span className="text-[10px] font-bold uppercase text-stone-500 tracking-wider">{t("animalProfile")}</span>
              <h3 className="text-lg font-bold text-[#191F1C] mt-0.5">{animal.species}</h3>
              <p className="text-stone-600">Breed: {animal.breed || "Standard Indigenous"}</p>
            </div>

            <div className="space-y-2 text-stone-700">
              <div className="flex justify-between">
                <span className="text-stone-500">{tCommon("age")}:</span>
                <span className="font-semibold text-stone-900">{animal.ageMonths ? `${animal.ageMonths} Months` : "Recorded"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">IoT Collar ID:</span>
                <span className="font-mono text-stone-800">{animal.iotDeviceId || "None"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">{t("farmLocation")}:</span>
                <span className="font-medium text-stone-900">{animal.farm.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">{tCommon("village")}:</span>
                <span className="font-medium text-stone-900">{animal.farm.villageName}, {animal.farm.districtName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Owner:</span>
                <span className="font-medium text-stone-900">{animal.farm.ownerName}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Middle & Right: Current Clinical Status & Latest Doctor Report */}
        <div className="md:col-span-2 space-y-6">
          {/* Active Health Episode Banner */}
          <Card className={`border rounded-3xl p-5 shadow-xs ${activeCase ? "bg-amber-50/70 border-amber-200" : "bg-emerald-50/70 border-emerald-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    {t("currentHealthStatus")}
                  </span>
                  <RiskBadge level={activeRiskLevel} />
                </div>
                <h3 className="text-base font-bold text-[#191F1C]">
                  {activeCase ? `Active Episode #${activeCase.caseNumber}` : "No Active Disease Episodes"}
                </h3>
                <p className="text-xs text-stone-600">
                  {activeCase
                    ? `Observed symptoms: ${activeCase.symptoms.join(", ")} (${activeCase.durationDays} days duration)`
                    : "Livestock vitals within baseline. Up to date on scheduled health screenings."}
                </p>
              </div>

              {activeCase && (
                <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-xs font-semibold shrink-0">
                  {activeCase.status}
                </Badge>
              )}
            </div>

            {/* Scheduled Follow-up Banner if present */}
            {activeCase?.vetFollowUpDate && (
              <div className="mt-4 pt-3 border-t border-amber-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-semibold">
                  <Calendar className="h-4 w-4 text-amber-700" />
                  <span>Scheduled Clinical Follow-up:</span>
                  <span className="font-mono font-bold text-[#191F1C]">
                    {formatDate(activeCase.vetFollowUpDate, true)}
                  </span>
                </div>
                <Badge className="bg-amber-200 text-amber-950 border-amber-300 text-[10px]">
                  {t("doctorVisitDue")}
                </Badge>
              </div>
            )}
          </Card>

          {/* Latest Veterinary Clinical Report */}
          <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
            <CardHeader className="border-b border-[#E5E0D8] pb-3">
              <CardTitle className="text-sm font-bold text-[#191F1C] uppercase tracking-wider flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-emerald-700" />
                <span>{t("latestAssessment")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-3">
              {latestReport ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAF8F3] p-3 rounded-2xl border border-[#E5E0D8]">
                    <div>
                      <span className="text-[10px] text-stone-500 block">{t("doctorDiagnosis")}</span>
                      <strong className="text-sm font-bold text-emerald-950">{latestReport.diagnosis}</strong>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs font-bold self-start sm:self-center">
                      Action: {latestReport.action}
                    </Badge>
                  </div>

                  {latestReport.notes && (
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-stone-700 space-y-1">
                      <span className="font-bold text-stone-900 block">Doctor Guidelines & Instructions:</span>
                      <p className="leading-relaxed">{latestReport.notes}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-stone-500 text-[11px] pt-1 border-t border-[#E5E0D8]">
                    <span>Clinician: Dr. {latestReport.vetUser.name} ({latestReport.vetUser.phone})</span>
                    <div className="flex items-center gap-3">
                      <span>Reported: {formatDate(latestReport.createdAt, true)}</span>
                      {latestReport.caseId && (
                        <Link href={`/farmer/cases/${latestReport.caseId}`}>
                          <Button size="sm" className="h-6 text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-2.5">
                            View Full Report &rarr;
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-stone-500 space-y-1">
                  <ShieldCheck className="h-7 w-7 text-stone-400 mx-auto" />
                  <p className="font-semibold text-stone-700">{t("noVetReportsYet")}</p>
                  <p className="text-[11px]">{t("noVetReportsDesc")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERMANENT LONGITUDINAL HEALTH TIMELINE                                     */}
      {/* ========================================================================= */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
        <CardHeader className="border-b border-[#E5E0D8] pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-700" />
                <span>Complete Health & Treatment Timeline ({timeline.length} Events)</span>
              </CardTitle>
              <p className="text-xs text-stone-500">
                {t("permanentLedgerDesc")}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {timeline.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs">
              {t("noHistoricalEvents")}
            </div>
          ) : (
            <div className="relative border-l-2 border-emerald-200 ml-4 space-y-6 pb-2">
              {timeline.map((event) => (
                <div key={event.id} className="relative pl-6">
                  {/* Timeline Icon Node */}
                  <div className="absolute -left-[17px] top-1 h-8 w-8 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center shadow-xs">
                    {event.type === "HEALTH_SESSION" && <HeartPulse className="h-4 w-4 text-emerald-700" />}
                    {event.type === "VET_REPORT" && <Stethoscope className="h-4 w-4 text-emerald-700" />}
                    {event.type === "VACCINATION" && <Syringe className="h-4 w-4 text-amber-700" />}
                    {event.type === "TREATMENT" && <Pill className="h-4 w-4 text-purple-700" />}
                    {event.type === "SAMPLE" && <FlaskConical className="h-4 w-4 text-sky-700" />}
                    {event.type === "FOLLOW_UP" && <Calendar className="h-4 w-4 text-amber-700" />}
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-2 hover-lift transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#191F1C] text-sm">{event.title}</span>
                        {event.badge && (
                          <Badge className="text-[10px] bg-white text-stone-800 border-stone-300">
                            {event.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-stone-500">
                        {formatDate(event.date, true)}
                      </span>
                    </div>

                    {event.subtitle && (
                      <p className="text-xs text-stone-600 font-medium">{event.subtitle}</p>
                    )}

                    {event.type === "HEALTH_SESSION" && Array.isArray(event.details?.symptoms) && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(event.details.symptoms as string[]).map((s, idx) => (
                          <Badge key={idx} className="bg-amber-50 text-amber-900 border-amber-200 text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {event.type === "VET_REPORT" && typeof event.details?.notes === "string" && (
                      <div className="text-xs text-stone-700 bg-white p-2.5 rounded-xl border border-stone-200 mt-1">
                        <strong>Clinical Notes:</strong> {String(event.details.notes)}
                      </div>
                    )}

                    {typeof event.details?.caseId === "string" && (
                      <div className="pt-1.5 flex justify-end">
                        <Link href={`/farmer/cases/${event.details.caseId}`}>
                          <span className="text-[11px] font-semibold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer">
                            <span>{t("viewCaseReport")}</span>
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Summary Tables: Vaccinations & Treatments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vaccinations Record */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5E0D8]">
            <CardTitle className="text-sm font-bold text-[#191F1C] uppercase tracking-wider flex items-center gap-2">
              <Syringe className="h-4 w-4 text-amber-700" />
              <span>Vaccination History ({allVaccinations.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-xs">
            {allVaccinations.length === 0 ? (
              <p className="text-stone-500 italic p-3">{t("noImmunizationRecords")}</p>
            ) : (
              <div className="space-y-2">
                {allVaccinations.map((vac) => (
                  <div key={vac.id} className="p-2.5 bg-[#FAF8F3] rounded-xl border border-[#E5E0D8] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-stone-900">{vac.vaccineName}</div>
                      <span className="text-[10px] text-stone-500">By {vac.administeredByUser.name}</span>
                    </div>
                    <span className="font-mono text-stone-600">{formatDate(vac.dateGiven, true)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treatments Record */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5E0D8]">
            <CardTitle className="text-sm font-bold text-[#191F1C] uppercase tracking-wider flex items-center gap-2">
              <Pill className="h-4 w-4 text-purple-700" />
              <span>Treatment History ({allTreatments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-xs">
            {allTreatments.length === 0 ? (
              <p className="text-stone-500 italic p-3">{t("noTreatmentRecords")}</p>
            ) : (
              <div className="space-y-2">
                {allTreatments.map((t) => (
                  <div key={t.id} className="p-2.5 bg-[#FAF8F3] rounded-xl border border-[#E5E0D8] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-stone-900">{t.medication}</div>
                      <span className="text-[10px] text-stone-500">{t.notes || "Standard prescription"}</span>
                    </div>
                    <span className="font-mono text-stone-600">{formatDate(t.dateGiven, true)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
