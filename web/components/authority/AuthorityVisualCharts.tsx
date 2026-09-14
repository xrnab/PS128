"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartDataPoint } from "@/lib/authority/metrics";
import {
  PieChart as PieChartIcon,
  TrendingUp,
  MapPin,
  Stethoscope,
  ShieldCheck,
  PawPrint,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

interface AuthorityVisualChartsProps {
  charts: {
    casesByStatus: ChartDataPoint[];
    casesByRisk: ChartDataPoint[];
    casesOverTime: ChartDataPoint[];
    casesByVillage: ChartDataPoint[];
    vetWorkload: ChartDataPoint[];
    agentWorkload: ChartDataPoint[];
    speciesDistribution: ChartDataPoint[];
    alertsBySeverity: ChartDataPoint[];
    assistanceRequestStatus: ChartDataPoint[];
  };
}

// Clean Empty State Component
function ChartEmptyState({ message }: { message?: string }) {
  const t = useTranslations("authority");
  const msg = message || t("noActivityPeriod");
  return (
    <div className="h-44 w-full flex flex-col items-center justify-center text-center p-4 bg-white/40 backdrop-blur-sm rounded-2xl border border-dashed border-[#1E3A2B]/15 space-y-1">
      <p className="text-xs font-semibold text-[#1E3A2B]">{msg}</p>
      <p className="text-[11px] text-[#4A3324]/60">{t("recordsWillAppear")}</p>
    </div>
  );
}

// 1. Donut / Progress Distribution Visualizer
function DonutVisualizer({ data }: { data: ChartDataPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <ChartEmptyState message="No activity recorded during this period." />;

  return (
    <div className="space-y-3">
      {/* Top stacked progress bar */}
      <div className="h-3 w-full bg-white/70 rounded-full overflow-hidden flex border border-white/80 shadow-inner p-0.5">
        {data.map((item, idx) => {
          if (item.value === 0) return null;
          const pct = (item.value / total) * 100;
          return (
            <div
              key={idx}
              style={{ width: `${pct}%`, backgroundColor: item.color || "#3F6B4A" }}
              className="h-full rounded-full transition-all duration-300"
              title={`${item.label}: ${item.value} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Item legend grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {data.map((item, idx) => (
          <div key={idx} className="p-2.5 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate mr-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || "#3F6B4A" }} />
              <span className="text-[#1E3A2B] font-medium truncate">{item.label}</span>
            </div>
            <span className="font-mono font-bold text-[#1E3A2B]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Horizontal Ranked Bar Visualizer
function HorizontalRankedBarVisualizer({ data, emptyMsg = "No activity recorded during this period." }: { data: ChartDataPoint[]; emptyMsg?: string }) {
  const maxValue = Math.max(...data.map((d) => d.value), 0);
  if (maxValue === 0 || data.length === 0) return <ChartEmptyState message={emptyMsg} />;

  return (
    <div className="space-y-2.5">
      {data.map((item, idx) => {
        const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#1E3A2B] font-medium truncate max-w-[70%]">{item.label}</span>
              <span className="font-mono font-bold text-[#1E3A2B]">{item.value}</span>
            </div>
            <div className="h-2 w-full bg-white/70 rounded-full overflow-hidden border border-white/80 p-0.5">
              <div
                style={{ width: `${pct}%`, backgroundColor: item.color || "#3F6B4A" }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. Pure Responsive SVG Line/Area Temporal Chart
function TemporalLineVisualizer({ data }: { data: ChartDataPoint[] }) {
  const t = useTranslations("authority");
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0 || data.length === 0) {
    return <ChartEmptyState message={t("noActivityPeriod")} />;
  }

  // Single-day snapshot view (e.g. for "Today")
  if (data.length === 1) {
    const singlePoint = data[0];
    return (
      <div className="h-36 w-full flex flex-col items-center justify-center bg-white/55 backdrop-blur-md rounded-2xl border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3F6B4A] animate-pulse" />
          <span className="text-xs font-bold text-[#1E3A2B]">{singlePoint.label}</span>
        </div>
        <div className="text-3xl font-extrabold text-[#1E3A2B] font-mono">
          {singlePoint.value} {singlePoint.value === 1 ? t("caseSingular") : t("casesPlural")}
        </div>
        <span className="text-[11px] text-[#4A3324]/65 font-mono">
          {t("actualToday")}
        </span>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const width = 500;
  const height = 140;
  const padding = 20;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - (d.value / maxVal) * (height - 2 * padding);
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="space-y-2">
      <div className="w-full h-36 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Subtle grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(30,58,43,0.08)" strokeDasharray="3 3" />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="rgba(30,58,43,0.08)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="rgba(30,58,43,0.15)"
          />

          {/* Area Fill Gradient */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3F6B4A" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3F6B4A" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#areaGradient)" />

          {/* Main Trend Line */}
          <path d={pathD} fill="none" stroke="#1E3A2B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3.5"
              className="fill-white stroke-[#1E3A2B] stroke-2 hover:r-5 transition-all cursor-pointer"
            >
              <title>{`${p.label}: ${p.value} cases`}</title>
            </circle>
          ))}
        </svg>
      </div>

      {/* Axis Labels */}
      <div className="flex justify-between items-center text-[10px] text-[#4A3324]/60 font-mono px-1">
        <span>{points[0]?.label || ""}</span>
        <span>{points[Math.floor(points.length / 2)]?.label || ""}</span>
        <span>{points[points.length - 1]?.label || ""}</span>
      </div>
    </div>
  );
}

// 4. Comparison Workload Bar Visualizer
function WorkloadComparisonVisualizer({ data, emptyMsg }: { data: ChartDataPoint[]; emptyMsg?: string }) {
  const t = useTranslations("authority");
  if (data.length === 0) return <ChartEmptyState message={emptyMsg || t("noPersonnelFound")} />;

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="p-3 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#1E3A2B]">{item.label}</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[#C1622D] font-semibold font-mono">{t("activeLabel")} {item.value}</span>
              {item.secondaryValue !== undefined && (
                <span className="text-[#4A3324]/60 font-mono">{t("totalLabel")} {item.secondaryValue}</span>
              )}
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/80 rounded-full overflow-hidden border border-white/80 p-0.5">
            <div
              style={{
                width: `${Math.min(100, Math.max(5, item.value * 12))}%`,
                backgroundColor: item.color || "#3F6B4A",
              }}
              className="h-full rounded-full"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuthorityVisualCharts({ charts }: AuthorityVisualChartsProps) {
  const t = useTranslations("authority");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-3">
        <div>
          <h2 className="text-xl font-bold text-[#1E3A2B] tracking-tight font-display">{t("surveillanceAnalytics")}</h2>
          <p className="text-xs text-[#4A3324]/70">
            {t("surveillanceAnalyticsDesc")}
          </p>
        </div>
      </div>

      {/* Grid: 9 Graphical Surveillance Views */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CHART 1: Cases by Status */}
        <Card className="liquid-glass-card rounded-3xl p-5 space-y-3">
          <div className="border-b border-[#1E3A2B]/6 pb-2.5">
            <div className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#3F6B4A]/12 text-[#3F6B4A]">
                <PieChartIcon className="h-4 w-4" />
              </div>
              <span>{t("casesByClinicalStatus")}</span>
            </div>
            <p className="text-[11px] text-[#4A3324]/65 mt-0.5">{t("casesByClinicalStatusDesc")}</p>
          </div>
          <div>
            <DonutVisualizer data={charts.casesByStatus} />
          </div>
        </Card>

        {/* CHART 2: Cases by Severity / Risk */}
        <Card className="liquid-glass-card rounded-3xl p-5 space-y-3">
          <div className="border-b border-[#1E3A2B]/6 pb-2.5">
            <div className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#C1622D]/15 text-[#C1622D]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <span>{t("casesBySeverityRisk")}</span>
            </div>
            <p className="text-[11px] text-[#4A3324]/65 mt-0.5">{t("casesBySeverityRiskDesc")}</p>
          </div>
          <div>
            <DonutVisualizer data={charts.casesByRisk} />
          </div>
        </Card>

        {/* CHART 3: Cases Over Time (Temporal Trend) */}
        <Card className="liquid-glass-card rounded-3xl p-5 space-y-3">
          <div className="border-b border-[#1E3A2B]/6 pb-2.5">
            <div className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#3F6B4A]/12 text-[#3F6B4A]">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span>{t("casesOverTime")}</span>
            </div>
            <p className="text-[11px] text-[#4A3324]/65 mt-0.5">{t("casesOverTimeDesc")}</p>
          </div>
          <div>
            <TemporalLineVisualizer data={charts.casesOverTime} />
          </div>
        </Card>

        {/* CHART 4: Cases by Village / Locality */}
        <Card className="liquid-glass-card rounded-3xl p-5 space-y-3">
          <div className="border-b border-[#1E3A2B]/6 pb-2.5">
            <div className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#3F6B4A]/12 text-[#3F6B4A]">
                <MapPin className="h-4 w-4" />
              </div>
              <span>{t("topVillageHotspots")}</span>
            </div>
            <p className="text-[11px] text-[#4A3324]/65 mt-0.5">{t("topVillageHotspotsDesc")}</p>
          </div>
          <div>
            <HorizontalRankedBarVisualizer
              data={charts.casesByVillage}
              emptyMsg={t("noHotspotsPeriod")}
            />
          </div>
        </Card>

        {/* CHART 5: Veterinarian Workload */}
        <Card className="liquid-glass-card rounded-3xl p-5 space-y-3">
          <div className="border-b border-[#1E3A2B]/6 pb-2.5">
            <div className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#1E3A2B]/10 text-[#1E3A2B]">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span>{t("vetCaseloadWorkload")}</span>
            </div>
            <p className="text-[11px] text-[#4A3324]/65 mt-0.5">{t("vetCaseloadWorkloadDesc")}</p>
          </div>
          <div>
            <WorkloadComparisonVisualizer
              data={charts.vetWorkload}
              emptyMsg={t("noVetsAssigned")}
            />
          </div>
        </Card>

        {/* CHART 6: Field-Agent Workload */}
        <Card className="liquid-glass-card rounded-3xl p-5 space-y-3">
          <div className="border-b border-[#1E3A2B]/6 pb-2.5">
            <div className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#3F6B4A]/12 text-[#3F6B4A]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span>{t("fieldAgentRequestVolume")}</span>
            </div>
            <p className="text-[11px] text-[#4A3324]/65 mt-0.5">{t("fieldAgentRequestVolumeDesc")}</p>
          </div>
          <div>
            <WorkloadComparisonVisualizer
              data={charts.agentWorkload}
              emptyMsg={t("noAgentsAssigned")}
            />
          </div>
        </Card>

        {/* CHART 7: Species Distribution */}
        <Card className="liquid-glass-card rounded-3xl p-5 space-y-3">
          <div className="border-b border-[#1E3A2B]/6 pb-2.5">
            <div className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#D9A441]/20 text-[#8F6612]">
                <PawPrint className="h-4 w-4" />
              </div>
              <span>{t("animalSpeciesDistribution")}</span>
            </div>
            <p className="text-[11px] text-[#4A3324]/65 mt-0.5">{t("animalSpeciesDistributionDesc")}</p>
          </div>
          <div>
            <DonutVisualizer data={charts.speciesDistribution} />
          </div>
        </Card>

        {/* CHART 8: Alerts by Severity */}
        <Card className="liquid-glass-card rounded-3xl p-5 space-y-3">
          <div className="border-b border-[#1E3A2B]/6 pb-2.5">
            <div className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#C1622D]/15 text-[#C1622D]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <span>{t("outbreakAlertsByDisease")}</span>
            </div>
            <p className="text-[11px] text-[#4A3324]/65 mt-0.5">{t("outbreakAlertsByDiseaseDesc")}</p>
          </div>
          <div>
            <HorizontalRankedBarVisualizer
              data={charts.alertsBySeverity}
              emptyMsg={t("noAlertsHistorical")}
            />
          </div>
        </Card>

        {/* CHART 9: Assistance Request Status */}
        <Card className="liquid-glass-card rounded-3xl p-5 space-y-3">
          <div className="border-b border-[#1E3A2B]/6 pb-2.5">
            <div className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2">
              <div className="p-1 rounded-lg bg-[#3F6B4A]/12 text-[#3F6B4A]">
                <ClipboardList className="h-4 w-4" />
              </div>
              <span>{t("assistanceRequestStatus")}</span>
            </div>
            <p className="text-[11px] text-[#4A3324]/65 mt-0.5">{t("assistanceRequestStatusDesc")}</p>
          </div>
          <div>
            <DonutVisualizer data={charts.assistanceRequestStatus} />
          </div>
        </Card>
      </div>
    </div>
  );
}
