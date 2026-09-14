"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { DistrictCommandCenterData } from "@/lib/authority/metrics";
import { getDistrictAuthorityCommandDataAction } from "@/lib/actions/authority";
import { AuthorityMetricsCards } from "./AuthorityMetricsCards";
import { DistrictCasePipeline } from "./DistrictCasePipeline";
import { SurveillanceHeatmap } from "./SurveillanceHeatmap";
import { AuthorityVisualCharts } from "./AuthorityVisualCharts";
import { PersonnelCoverageSection } from "./PersonnelCoverageSection";
import { VillageAnalysisTable } from "./VillageAnalysisTable";
import { RecentActivityFeed } from "./RecentActivityFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Filter,
  RotateCcw,
  BellRing,
  ShieldCheck,
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface DistrictCommandCenterProps {
  initialData: DistrictCommandCenterData;
  pendingApprovalsCount: number;
}

export function DistrictCommandCenter({
  initialData,
  pendingApprovalsCount,
}: DistrictCommandCenterProps) {
  const t = useTranslations("authority");
  const [data, setData] = useState<DistrictCommandCenterData>(initialData);
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "30d" | "90d" | "custom" | "all">(
    (initialData.activeFilters.timeRange as "today" | "7d" | "30d" | "90d" | "custom" | "all") || "30d"
  );
  const [blockId, setBlockId] = useState<string>(initialData.activeFilters.blockId || "");
  const [villageId, setVillageId] = useState<string>(initialData.activeFilters.villageId || "");
  const [customStart, setCustomStart] = useState<string>(initialData.activeFilters.startDate || "");
  const [customEnd, setCustomEnd] = useState<string>(initialData.activeFilters.endDate || "");
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Filter villages by selected block
  const availableVillages = blockId
    ? data.filterOptions.villages.filter((v) => v.blockId === blockId)
    : data.filterOptions.villages;

  // Execute database-driven filter update via server action
  const handleApplyFilters = (
    newTimeRange = timeRange,
    newBlockId = blockId,
    newVillageId = villageId,
    newStart = customStart,
    newEnd = customEnd
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        const refreshedData = await getDistrictAuthorityCommandDataAction({
          timeRange: newTimeRange,
          blockId: newBlockId ? newBlockId : null,
          villageId: newVillageId ? newVillageId : null,
          customStartDate: newTimeRange === "custom" ? newStart : null,
          customEndDate: newTimeRange === "custom" ? newEnd : null,
        });
        setData(refreshedData);
      } catch (err) {
        console.error("[District Command Center] Filter query failure:", err);
        setError("Unable to load district data.");
      }
    });
  };

  const handleResetFilters = () => {
    setTimeRange("30d");
    setBlockId("");
    setVillageId("");
    setCustomStart("");
    setCustomEnd("");
    handleApplyFilters("30d", "", "", "", "");
  };

  const activeAlertsCount = data.snapshot.currentActiveAlerts;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14] dark:text-[#F4EEE1]">
      {/* 1. TOP HEADER & COMMAND CENTER BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1E3A2B]/8 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display">
              {data.districtName} • District Command Center
            </h1>
            <span className="bg-[#3F6B4A]/15 text-[#3F6B4A] text-xs font-bold px-3 py-1 rounded-full border border-white/60">
              {t("epidemiologicalCockpit")}
            </span>
          </div>
          <p className="text-[#4A3324]/75 text-xs sm:text-sm mt-1">
            {t("epidemiologicalCockpitDesc")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/authority/alerts">
            <button
              className="px-4 py-2 text-xs rounded-full bg-[#C1622D] text-white font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_14px_rgba(193,98,45,0.3)] hover:bg-[#A84F20] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <BellRing className={`h-4 w-4 ${activeAlertsCount > 0 ? "animate-pulse text-[#FDF6E2]" : ""}`} />
              <span>Active Alerts ({activeAlertsCount})</span>
            </button>
          </Link>
          <Link href="/authority/approvals">
            <span className="text-xs bg-[#D9A441]/15 text-[#8F6612] border border-white/60 px-3.5 py-2 gap-1.5 cursor-pointer rounded-full hover:bg-[#D9A441]/25 transition-all font-bold inline-flex items-center shadow-xs">
              <ShieldCheck className="h-4 w-4 text-[#D9A441]" />
              <span>Pending Approvals: {pendingApprovalsCount}</span>
            </span>
          </Link>
        </div>
      </div>

      {/* 2. ERROR STATE BANNER */}
      {error && (
        <div className="p-5 rounded-3xl bg-[#C1622D]/10 border border-[#C1622D]/25 text-[#C1622D] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#C1622D]/20 text-[#C1622D] flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1E3A2B]">{t("unableToLoad")}</h3>
              <p className="text-xs text-[#4A3324]/80 mt-0.5">
                {t("databaseQueryFailed")}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleApplyFilters(timeRange, blockId, villageId, customStart, customEnd)}
            className="liquid-button-primary text-xs shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t("retryQuery")}</span>
          </Button>
        </div>
      )}

      {/* 3. LIVE QUERY FILTER CONTROLS */}
      <div className="p-5 rounded-3xl bg-[#F4EEE1]/85 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.08)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E3A2B]/8 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A2B]">
            <Filter className="h-4 w-4 text-[#3F6B4A]" />
            <span>Database Query Filters (Server-Side Filtered)</span>
            {isPending && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#3F6B4A] bg-[#3F6B4A]/12 px-2.5 py-0.5 rounded-full animate-pulse border border-[#3F6B4A]/20">
                <RotateCcw className="h-3 w-3 animate-spin" />
                {t("queryingDatabase")}
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetFilters}
            disabled={isPending}
            className="h-8 px-3 text-xs text-[#1E3A2B] hover:bg-[#1E3A2B]/8 rounded-full gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t("resetFilters")}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Time Range Filter Buttons */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-semibold text-[#4A3324]/70 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Time Window:</span>
            </label>
            <div className="flex flex-wrap items-center gap-1 bg-white/65 p-1 rounded-full border border-white/70 shadow-inner">
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "7d", label: "7 Days" },
                  { id: "30d", label: "30 Days" },
                  { id: "90d", label: "90 Days" },
                  { id: "all", label: "All Time" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTimeRange(t.id);
                    if (t.id !== "custom") {
                      handleApplyFilters(t.id, blockId, villageId);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    timeRange === t.id
                      ? "bg-[#1E3A2B] text-[#F4EEE1] shadow-sm"
                      : "text-[#4A3324]/70 hover:text-[#1E3A2B] hover:bg-white/60"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Block / Taluka Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3324]/70 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>Block / Taluka:</span>
            </label>
            <select
              value={blockId}
              onChange={(e) => {
                const newBlock = e.target.value;
                setBlockId(newBlock);
                setVillageId("");
                handleApplyFilters(timeRange, newBlock, "");
              }}
              className="w-full h-9 px-3 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[#1E3A2B]/25 focus:outline-none shadow-xs text-[#1E3A2B]"
            >
              <option value="">All Blocks ({data.filterOptions.blocks.length})</option>
              {data.filterOptions.blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.villageCount} villages)
                </option>
              ))}
            </select>
          </div>

          {/* Village Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3324]/70 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>Village:</span>
            </label>
            <select
              value={villageId}
              onChange={(e) => {
                const newVillage = e.target.value;
                setVillageId(newVillage);
                handleApplyFilters(timeRange, blockId, newVillage);
              }}
              className="w-full h-9 px-3 text-xs bg-white/80 border border-white/80 rounded-full focus:ring-2 focus:ring-[#1E3A2B]/25 focus:outline-none shadow-xs text-[#1E3A2B]"
            >
              <option value="">All Villages ({availableVillages.length})</option>
              {availableVillages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Selector (Shown when "Custom" is selected) */}
        {timeRange === "custom" && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8]">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-stone-600">Start Date:</span>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs bg-white rounded-xl max-w-[150px]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-stone-600">End Date:</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs bg-white rounded-xl max-w-[150px]"
              />
            </div>
            <Button
              size="sm"
              onClick={() => handleApplyFilters("custom", blockId, villageId, customStart, customEnd)}
              className="h-8 px-4 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl"
            >
              {t("applyCustomRange")}
            </Button>
          </div>
        )}
      </div>

      {/* 4. SUMMARY METRICS (Snapshot + Selected Period + Clinical Turnaround) */}
      <section className="space-y-3">
        <AuthorityMetricsCards
          snapshot={data.snapshot}
          periodMetrics={data.periodMetrics}
          metrics={data.kpis}
        />
      </section>

      {/* 5. DISTRICT CASE PIPELINE PROGRESSION */}
      <section>
        <DistrictCasePipeline pipeline={data.pipeline} />
      </section>

      {/* 6. GEOGRAPHIC SURVEILLANCE & GIS HEATMAP */}
      <section>
        <SurveillanceHeatmap
          mapLayers={data.mapLayers}
          districtName={data.districtName}
          onRefreshMap={() => handleApplyFilters(timeRange, blockId, villageId)}
        />
      </section>

      {/* 7. PUBLIC HEALTH SURVEILLANCE CHARTS (9 Real-Data Views) */}
      <section>
        <AuthorityVisualCharts charts={data.charts} />
      </section>

      {/* 8. PERSONNEL RESPONSIBILITY & COVERAGE */}
      <section>
        <PersonnelCoverageSection
          veterinarians={data.veterinarians}
          fieldAgents={data.fieldAgents}
        />
      </section>

      {/* 9. VILLAGE / SUB-DISTRICT BREAKDOWN */}
      <section>
        <VillageAnalysisTable villages={data.villageAnalysis} />
      </section>

      {/* 10. RECENT ACTIVITY FEED */}
      <section>
        <RecentActivityFeed activities={data.recentActivity} />
      </section>
    </div>
  );
}
