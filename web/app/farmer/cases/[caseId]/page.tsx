import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFarmerCaseDetailAction } from "@/lib/actions/farmer";
import { CasePhotoViewer } from "@/components/media/CasePhotoViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Stethoscope,
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  UserCheck,
  Phone,
  ShieldCheck,
  ChevronRight,
  Activity,
  FlaskConical,
  Pill,
} from "lucide-react";
import { formatDateTime, formatDate, formatDoctorName } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function FarmerCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const t = await getTranslations("farmer");

  let healthCase;
  try {
    healthCase = await getFarmerCaseDetailAction(caseId);
  } catch {
    notFound();
  }

  const { animal, veterinaryReports, fieldVisit, samples, treatments } = healthCase;
  const latestReport = veterinaryReports[0] || null;

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "ISOLATE":
        return "bg-red-100 text-red-900 border-red-300";
      case "TREAT":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "REFER_LAB":
        return "bg-sky-100 text-sky-900 border-sky-300";
      case "MONITOR":
        return "bg-amber-100 text-amber-900 border-amber-300";
      default:
        return "bg-stone-100 text-stone-900 border-stone-300";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      {/* Top Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3A2B]/8 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/farmer">
            <button
              type="button"
              className="h-9 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] rounded-full gap-1.5 shadow-xs inline-flex items-center cursor-pointer transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("farmerPortal")}</span>
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A2B] tracking-tight font-display">
                Case #{healthCase.caseNumber}
              </h1>
              <Badge className="bg-[#D9A441]/15 text-[#8F6612] border border-white/60 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {healthCase.status}
              </Badge>
            </div>
            <p className="text-xs text-[#4A3324]/75 mt-0.5">
              Animal: {animal.tag} ({animal.species}) • Reported:{" "}
              {formatDateTime(healthCase.reportedAt, true)}
            </p>
          </div>
        </div>

        <Link href={`/farmer/animals/${animal.id}`}>
          <button
            type="button"
            className="h-9 px-4 text-xs font-semibold border border-white/80 text-[#3F6B4A] bg-white/80 hover:bg-white rounded-full gap-1.5 shadow-xs inline-flex items-center cursor-pointer transition-all"
          >
            <span>{t("viewPassport")}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 1. PROMINENT VETERINARY CLINICAL REPORT SECTION                           */}
      {/* ========================================================================= */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-r from-emerald-900 to-emerald-950 text-white p-5 border-b border-emerald-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs text-emerald-200 border border-white/20">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white tracking-tight">
                  {t("officialVetReport")}
                </CardTitle>
                <p className="text-xs text-emerald-200">
                  {t("licensedDirectives")}
                </p>
              </div>
            </div>

            {latestReport ? (
              <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-400/40 text-xs px-3 py-1 font-semibold self-start sm:self-center">
                ✓ Report Submitted
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/40 text-xs px-3 py-1 font-semibold self-start sm:self-center">
                {t("reviewPending")}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {latestReport ? (
            <div className="space-y-6">
              {/* Top Banner: Diagnosis & Recommendation */}
              <div className="p-5 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E0D8] pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-500 tracking-wider block">
                      {t("doctorClinicalDiagnosis")}
                    </span>
                    <h3 className="text-lg font-bold text-emerald-950 mt-0.5">
                      {latestReport.diagnosis}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">Recommended Action:</span>
                    <Badge
                      className={`text-xs font-bold px-3 py-1 ${getActionBadgeClass(
                        latestReport.action
                      )}`}
                    >
                      {latestReport.action}
                    </Badge>
                  </div>
                </div>

                {/* Clinician Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-stone-700 bg-white p-3 rounded-xl border border-[#E5E0D8]">
                    <UserCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="text-[10px] text-stone-500 block">{t("examiningVet")}</span>
                      <strong className="text-stone-900">{formatDoctorName(latestReport.vetUser.name)}</strong>
                    </div>
                  </div>

                  {latestReport.vetUser.phone && (
                    <div className="flex items-center gap-2 text-stone-700 bg-white p-3 rounded-xl border border-[#E5E0D8]">
                      <Phone className="h-4 w-4 text-emerald-700 shrink-0" />
                      <div>
                        <span className="text-[10px] text-stone-500 block">{t("veterinaryContact")}</span>
                        <a
                          href={`tel:${latestReport.vetUser.phone}`}
                          className="font-semibold text-emerald-800 hover:underline"
                        >
                          {latestReport.vetUser.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions & Treatment Advice */}
              {latestReport.instructions && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-emerald-700" />
                    <span>{t("instructionsGuidelines")}</span>
                  </span>
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-950 leading-relaxed">
                    {latestReport.instructions}
                  </div>
                </div>
              )}

              {/* Clinical Notes */}
              {latestReport.notes && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-amber-700" />
                    <span>{t("clinicalNotesAdvice")}</span>
                  </span>
                  <div className="p-4 rounded-2xl bg-stone-50 border border-[#E5E0D8] text-xs text-stone-800 leading-relaxed">
                    {latestReport.notes}
                  </div>
                </div>
              )}

              {/* Scheduled Follow-Up */}
              {latestReport.followUpDate && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-bold text-amber-950 block">{t("scheduledFollowUp")}</span>
                      <span className="text-stone-600">
                        Date:{" "}
                        <strong className="text-stone-900">
                          {formatDate(latestReport.followUpDate, true)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {latestReport.followUpCompleted ? (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-xs font-semibold gap-1 py-1 px-3">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{t("followUpCompleted")}</span>
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-200 text-amber-950 border-amber-400 text-xs font-semibold py-1 px-3">
                      {t("actionRequiredVisitDue")}
                    </Badge>
                  )}
                </div>
              )}

              {/* Follow-up Notes (if completed) */}
              {latestReport.followUpNotes && (
                <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200 text-xs text-stone-700">
                  <strong className="text-emerald-950 block mb-1">Follow-up Outcome:</strong>
                  {latestReport.followUpNotes}
                </div>
              )}

              {/* Multiple Historical Reports Accordion/Stack */}
              {veterinaryReports.length > 1 && (
                <div className="pt-4 border-t border-[#E5E0D8] space-y-3">
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                    Complete Report History ({veterinaryReports.length} Updates)
                  </span>
                  <div className="space-y-2.5">
                    {veterinaryReports.slice(1).map((r, idx) => (
                      <div
                        key={r.id}
                        className="p-3.5 bg-[#FAF8F3] rounded-xl border border-[#E5E0D8] text-xs space-y-1.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-stone-900">
                            Update #{veterinaryReports.length - idx - 1}: {r.diagnosis}
                          </span>
                          <span className="text-[11px] font-mono text-stone-500">
                            {formatDate(r.createdAt, true)}
                          </span>
                        </div>
                        {r.notes && <p className="text-stone-600">{r.notes}</p>}
                        <div className="text-[11px] text-stone-500">
                          By {formatDoctorName(r.vetUser.name)} • Action: {r.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Pending State */
            <div className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                <Clock className="h-8 w-8 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-[#191F1C]">
                  {t("vetReviewPending")}
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {t("vetReviewPendingDesc")}
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] text-xs text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Assigned Clinician:</span>
                  {healthCase.assignedVeterinarianUser ? (
                    <span className="font-bold text-emerald-950">
                      {formatDoctorName(healthCase.assignedVeterinarianUser.name)}
                      {healthCase.assignmentLevel && (
                        <span className="ml-1 text-[10px] font-normal text-emerald-800 uppercase">
                          ({healthCase.assignmentLevel})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-amber-800 font-medium italic">
                      {t("queuedInTriage")}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-600 border-t border-[#E5E0D8] pt-2">
                  {t("inAppNotificationDesc")}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 2. CASE EPISODE & REPORTED SYMPTOMS                                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reported Episode Details */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="border-b border-[#E5E0D8] pb-3">
            <CardTitle className="text-sm font-bold text-[#191F1C] uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-700" />
              <span>{t("reportedSymptoms")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="space-y-1.5">
              <span className="text-stone-500 block font-medium">Observed Symptoms:</span>
              <div className="flex flex-wrap gap-1.5">
                {healthCase.symptoms.map((s, idx) => (
                  <Badge key={idx} className="bg-amber-50 text-amber-900 border-amber-200 text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-stone-700">
              <div className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8]">
                <span className="text-stone-500 block text-[10px]">Symptom Duration:</span>
                <strong className="text-stone-900 text-sm">{healthCase.durationDays} Days</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8]">
                <span className="text-stone-500 block text-[10px]">Affected Animals:</span>
                <strong className="text-stone-900 text-sm">{healthCase.affectedCount}</strong>
              </div>
            </div>

            {healthCase.photoUrl && (
              <div className="space-y-1.5 pt-2">
                <span className="text-stone-500 block font-medium">Submitted Lesion / Animal Photo:</span>
                <CasePhotoViewer
                  caseId={healthCase.id}
                  photoUrl={healthCase.photoUrl}
                  alt="Submitted lesion photo"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doorstep Field Inspection (if field agent assisted) */}
        <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
          <CardHeader className="border-b border-[#E5E0D8] pb-3">
            <CardTitle className="text-sm font-bold text-[#191F1C] uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-amber-700" />
              <span>{t("doorstepExamAgent")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            {fieldVisit ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-950">
                      Inspected by Agent {fieldVisit.fieldAgentUser.name}
                    </span>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                      {t("visitCompleted")}
                    </Badge>
                  </div>
                  {fieldVisit.fieldAgentUser.phone && (
                    <span className="text-stone-600 block text-[11px]">
                      Contact: {fieldVisit.fieldAgentUser.phone}
                    </span>
                  )}
                </div>

                {fieldVisit.observations && (
                  <div className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-1 text-stone-700">
                    <strong className="text-stone-900 block text-[11px]">Field Agent Observations:</strong>
                    <p>{fieldVisit.observations}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-stone-500 space-y-2">
                <ShieldCheck className="h-6 w-6 text-stone-400 mx-auto" />
                <p className="font-semibold text-stone-700">{t("selfReportedConcern")}</p>
                <p className="text-[11px]">
                  {t("selfReportedDesc")}
                </p>
              </div>
            )}

            {/* Administered Treatments (if any) */}
            {treatments.length > 0 && (
              <div className="pt-3 border-t border-[#E5E0D8] space-y-2">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-purple-700" />
                  <span>Administered Treatments ({treatments.length})</span>
                </span>
                {treatments.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <strong className="text-purple-950">{t.medication}</strong>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {formatDate(t.dateGiven, true)}
                      </span>
                    </div>
                    {t.notes && <p className="text-stone-700 text-[11px]">{t.notes}</p>}
                    <span className="text-[10px] text-stone-500 block">
                      By {t.administeredByUser.name} ({t.administeredByUser.role})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Diagnostic Samples & Lab Referrals (if any) */}
            {samples.length > 0 && (
              <div className="pt-3 border-t border-[#E5E0D8] space-y-2">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4 text-sky-700" />
                  <span>Lab Samples ({samples.length})</span>
                </span>
                {samples.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-sky-50/60 border border-sky-200 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <strong className="text-sky-950">{s.labName || "Diagnostic Lab"}</strong>
                      <Badge className="bg-sky-100 text-sky-900 border-sky-300 text-[10px]">
                        {s.status}
                      </Badge>
                    </div>
                    {s.resultSummary && (
                      <p className="text-stone-700 text-[11px] pt-1">
                        <strong>Result:</strong> {s.resultSummary}
                      </p>
                    )}
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
