import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireVeterinarian } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";
import { RiskBadge } from "@/components/ai/RiskBadge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Prisma } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

function renderStatusPill(status: string) {
  switch (status) {
    case "PENDING_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_3px_rgba(30,58,43,0.06)] text-[10px] font-semibold text-[#1E3A2B] tracking-wide whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441]" />
          <span>Pending Review</span>
        </span>
      );
    case "UNDER_EXAMINATION":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_3px_rgba(30,58,43,0.06)] text-[10px] font-semibold text-[#1E3A2B] tracking-wide whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2B] animate-pulse" />
          <span>In Examination</span>
        </span>
      );
    case "CONFIRMED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_4px_rgba(63,107,74,0.10)] text-[10px] font-semibold text-[#3F6B4A] tracking-wide whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B4A]" />
          <span>Confirmed</span>
        </span>
      );
    case "LAB_REFERRAL":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_3px_rgba(30,58,43,0.06)] text-[10px] font-semibold text-[#1E3A2B] tracking-wide whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2B]" />
          <span>Lab Referral</span>
        </span>
      );
    case "CLOSED_RESOLVED":
    case "CLOSED_HARMLESS":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_3px_rgba(30,58,43,0.06)] text-[10px] font-semibold text-[#4A3324]/70 tracking-wide whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
          <span>Resolved</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/75 backdrop-blur-md border border-white/85 text-[10px] font-semibold text-[#4A3324]/70 tracking-wide whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
          <span>{status.replace(/_/g, " ")}</span>
        </span>
      );
  }
}

export default async function VetCasesPage() {
  const vet = await requireVeterinarian();
  const t = await getTranslations("vet");

  const whereClause: Prisma.CaseWhereInput = {};
  if (vet.districtId) {
    whereClause.OR = [
      { assignedVeterinarianUserId: vet.id },
      {
        animal: {
          herd: {
            farm: {
              village: {
                block: {
                  districtId: vet.districtId,
                },
              },
            },
          },
        },
      },
    ];
  } else {
    whereClause.assignedVeterinarianUserId = vet.id;
  }

  const cases = await prisma.case.findMany({
    where: whereClause,
    include: {
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  village: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { reportedAt: "desc" },
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      <div className="flex justify-between items-center border-b border-[#1E3A2B]/8 pb-4">
        <div>
          <Badge className="border-white/80 text-[#3F6B4A] bg-[#3F6B4A]/12 text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full">
            {t("clinicalRepoTitle")}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display mt-1">
            {t("allLivestockCasesTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A3324]/75">
            {t("allCasesLead")}
          </p>
        </div>
      </div>

      <Card className="liquid-glass-card rounded-3xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#1E3A2B]/8 pb-4">
          <div className="p-1 rounded-lg bg-[#3F6B4A]/12 text-[#3F6B4A]">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="text-base font-bold text-[#1E3A2B] font-display">
            <span>{t("districtClinicalRepo")} ({cases.length})</span>
          </div>
        </div>

        <div>
          {cases.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#4A3324]/60 bg-white/40 rounded-2xl border border-dashed border-[#1E3A2B]/15">
              {t("noCasesJurisdiction")}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/80 bg-white/50 backdrop-blur-md">
              <table className="w-full text-xs text-left text-[#1E3A2B]">
                <thead className="bg-white/60 text-[#1E3A2B] font-semibold uppercase tracking-wider border-b border-[#1E3A2B]/8">
                  <tr>
                    <th className="p-3.5">{t("statusHeader")}</th>
                    <th className="p-3.5">{t("caseNumberCol")}</th>
                    <th className="p-3.5">{t("animalHeader")}</th>
                    <th className="p-3.5">{t("farmVillageHeader")}</th>
                    <th className="p-3.5">{t("riskHeader")}</th>
                    <th className="p-3.5">{t("reportedHeader")}</th>
                    <th className="p-3.5 text-right">{t("actionHeader")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3A2B]/8">
                  {cases.map((c) => {
                    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
                    const level = (analysis.overall_risk_level as string) || "UNKNOWN";

                    return (
                      <tr key={c.id} className="hover:bg-white/70 transition-colors">
                        <td className="p-3.5">
                          {renderStatusPill(c.status)}
                        </td>
                        <td className="p-3.5 font-bold text-[#1E3A2B] font-mono">#{c.caseNumber}</td>
                        <td className="p-3.5">
                          <span className="font-semibold text-[#1E3A2B]">{c.animal.tag}</span>{" "}
                          <span className="text-[#4A3324]/60 font-medium">({c.animal.species})</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-medium text-[#1E3A2B]">{c.animal.herd.farm.name}</span>{" "}
                          <span className="text-[#4A3324]/60">({c.animal.herd.farm.village.name})</span>
                        </td>
                        <td className="p-3.5">
                          <RiskBadge level={level} />
                        </td>
                        <td className="p-3.5 text-[#4A3324]/75 font-mono text-[11px]">{formatDateTime(c.reportedAt)}</td>
                        <td className="p-3.5 text-right">
                          <Link href={`/vet/cases/${c.id}`}>
                            <button
                              type="button"
                              className="h-8 px-4 text-xs bg-[#1E3A2B] text-[#F4EEE1] hover:bg-[#3F6B4A] font-semibold rounded-full gap-1.5 shadow-[0_4px_10px_rgba(30,58,43,0.18),inset_0_1px_1px_rgba(255,255,255,0.35)] inline-flex items-center cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <span>{t("reviewBtn")}</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
