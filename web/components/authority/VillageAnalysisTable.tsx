"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VillageAnalysisRow } from "@/lib/authority/metrics";
import { recommendVaccinationDriveAction } from "@/lib/actions/authority";
import {
  Building2,
  Search,
  MapPin,
  Syringe,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface VillageAnalysisTableProps {
  villages: VillageAnalysisRow[];
}

export function VillageAnalysisTable({ villages }: VillageAnalysisTableProps) {
  const t = useTranslations("authority");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPriorityOnly, setShowPriorityOnly] = useState(false);
  const [dispatchingMap, setDispatchingMap] = useState<Record<string, boolean>>({});
  const [dispatchedMap, setDispatchedMap] = useState<Record<string, boolean>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<{
    villageId: string;
    text: string;
    type: "success" | "error";
  } | null>(null);

  const priorityVillagesCount = villages.filter((v) => v.priorityFlag).length;

  let filtered = villages.filter((v) => {
    if (showPriorityOnly && !v.priorityFlag) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return v.villageName.toLowerCase().includes(q) || v.blockName.toLowerCase().includes(q);
  });

  if (showPriorityOnly) {
    filtered = [...filtered].sort((a, b) => {
      if (b.gapPriorityScore !== a.gapPriorityScore) {
        return b.gapPriorityScore - a.gapPriorityScore;
      }
      return b.activeCases - a.activeCases;
    });
  }

  const handleRecommendDrive = async (villageId: string, villageName: string) => {
    setDispatchingMap((prev) => ({ ...prev, [villageId]: true }));
    setFeedbackMessage(null);
    try {
      const res = await recommendVaccinationDriveAction({ villageId });
      if (res.success) {
        setDispatchedMap((prev) => ({ ...prev, [villageId]: true }));
        setFeedbackMessage({
          villageId,
          text: res.message || `${t("driveSuccess")} (${villageName})`,
          type: "success",
        });
      } else {
        setFeedbackMessage({
          villageId,
          text: res.error || "Failed to broadcast vaccination drive recommendation.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("[Recommend Vaccination Drive Error]:", err);
      setFeedbackMessage({
        villageId,
        text: "Error broadcasting vaccination drive recommendation.",
        type: "error",
      });
    } finally {
      setDispatchingMap((prev) => ({ ...prev, [villageId]: false }));
    }
  };

  return (
    <Card className="liquid-glass-card rounded-3xl overflow-hidden p-0">
      <div className="p-6 border-b border-[#1E3A2B]/8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-[#1E3A2B] flex items-center gap-2 font-display">
              <Building2 className="h-5 w-5 text-[#3F6B4A]" />
              <span>{t("villageAnalysisTitle")}</span>
            </div>
            <p className="text-xs text-[#4A3324]/70 mt-0.5">
              {t("villageMatrixDesc")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            {/* Priority Villages Overlay Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={showPriorityOnly}
              onClick={() => setShowPriorityOnly((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                showPriorityOnly
                  ? "bg-[#C1622D] text-white border-[#C1622D] shadow-sm"
                  : "bg-white/70 text-[#1E3A2B] border-white/80 hover:bg-white"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  showPriorityOnly ? "bg-white animate-pulse" : "bg-[#C1622D]"
                }`}
              />
              <span>{t("showPriorityOnly")}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  showPriorityOnly ? "bg-white/25 text-white" : "bg-[#1E3A2B]/10 text-[#1E3A2B]"
                }`}
              >
                {priorityVillagesCount}
              </span>
            </button>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#4A3324]/40" />
              <Input
                type="text"
                placeholder={t("filterVillageBlock")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-9 text-xs bg-white/80 border-white/80 rounded-full shadow-inner text-[#1E3A2B] placeholder:text-[#4A3324]/40"
              />
            </div>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between ${
              feedbackMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-red-50 text-red-900 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {feedbackMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-stone-400 hover:text-stone-600 text-xs px-1"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F3] border-b border-[#E5E0D8] text-stone-600 font-semibold">
                <th className="py-3 px-4">{t("villageName")}</th>
                <th className="py-3 px-3">{t("blockTaluka")}</th>
                <th className="py-3 px-3 text-center">{t("farmers")}</th>
                <th className="py-3 px-3 text-center">{t("farms")}</th>
                <th className="py-3 px-3 text-center">{t("monitoredLivestock")}</th>
                <th className="py-3 px-3 text-center">{t("totalCasesHeader")}</th>
                <th className="py-3 px-3 text-center text-amber-800">{t("activeCases")}</th>
                <th className="py-3 px-3 text-center">{t("alerts")}</th>
                <th className="py-3 px-4 text-center">{t("riskLevel")}</th>
                <th className="py-3 px-3 text-center">{t("vaccinationCoverage")}</th>
                <th className="py-3 px-4 text-center">{t("priorityAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-stone-500 bg-stone-50/50">
                    {showPriorityOnly ? t("noPriorityVillages") : t("noVillagesMatchQuery")}
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const isDispatching = !!dispatchingMap[v.villageId];
                  const isDispatched = !!dispatchedMap[v.villageId];

                  return (
                    <tr
                      key={v.villageId}
                      className={`hover:bg-emerald-50/20 transition-colors ${
                        v.priorityFlag ? "bg-red-50/15" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-[#191F1C]">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          <span>{v.villageName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-stone-600 font-medium">{v.blockName}</td>
                      <td className="py-3 px-3 text-center font-mono">{v.farmersCount}</td>
                      <td className="py-3 px-3 text-center font-mono">{v.farmsCount}</td>
                      <td className="py-3 px-3 text-center font-mono font-semibold">{v.animalsCount}</td>
                      <td className="py-3 px-3 text-center font-mono">{v.totalCases}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-800 bg-amber-50/40">
                        {v.activeCases}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {v.activeAlerts > 0 ? (
                          <Badge className="bg-red-100 text-red-900 border-red-200 text-[10px] font-bold">
                            🚨 {v.activeAlerts} Active
                          </Badge>
                        ) : (
                          <span className="text-stone-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          className={`text-[10px] font-bold ${
                            v.highestRisk === "CRITICAL"
                              ? "bg-red-100 text-red-900 border-red-200"
                              : v.highestRisk === "HIGH"
                              ? "bg-orange-100 text-orange-900 border-orange-200"
                              : v.highestRisk === "ELEVATED"
                              ? "bg-amber-100 text-amber-900 border-amber-200"
                              : v.highestRisk === "LOW"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                              : "bg-stone-100 text-stone-600 border-stone-200"
                          }`}
                        >
                          {v.highestRisk}
                        </Badge>
                      </td>

                      {/* 1. Vaccination Coverage % Column */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono font-bold text-xs ${
                              v.vaccinationCoveragePercent < 60
                                ? "text-red-700"
                                : v.vaccinationCoveragePercent < 80
                                ? "text-amber-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {v.vaccinationCoveragePercent}%
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            ({v.vaccinatedAnimalsCount}/{v.animalsCount})
                          </span>
                        </div>
                      </td>

                      {/* 2. Priority Action Column */}
                      <td className="py-3 px-4 text-center">
                        {v.priorityFlag ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <Badge className="bg-red-100 text-red-900 border-red-200 text-[10px] font-bold shadow-xs inline-flex items-center gap-1">
                              <span>{t("vaccinationGapBadge")}</span>
                            </Badge>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isDispatching || isDispatched}
                              onClick={() => handleRecommendDrive(v.villageId, v.villageName)}
                              className={`h-6 px-2 text-[10px] font-semibold rounded-lg flex items-center gap-1 transition-all ${
                                isDispatched
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-xs"
                              }`}
                            >
                              {isDispatching ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin text-amber-700" />
                                  <span>Broadcasting...</span>
                                </>
                              ) : isDispatched ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                  <span>{t("driveRecommended")}</span>
                                </>
                              ) : (
                                <>
                                  <Syringe className="h-3 w-3 text-amber-700" />
                                  <span>{t("recommendDrive")}</span>
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-stone-400 font-mono text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

