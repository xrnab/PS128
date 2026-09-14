"use client";

import React, { useState } from "react";
import { AuthorityReportType, ExportFormat } from "@prisma/client";
import { generateAuthorityReportAction } from "@/lib/actions/authority-reports";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  FileText,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Activity,
  Syringe,
  BellRing,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface AuthorityReportsClientProps {
  districtName: string;
}

export function AuthorityReportsClient({
  districtName,
}: AuthorityReportsClientProps) {
  const t = useTranslations("authority");
  // Date range defaults: Last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const formatDateInput = (d: Date) => d.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState<string>(formatDateInput(thirtyDaysAgo));
  const [endDate, setEndDate] = useState<string>(formatDateInput(today));
  const [reportType, setReportType] = useState<AuthorityReportType>("CASE_SUMMARY");
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    filename: string;
    recordCount: number;
    format: ExportFormat;
  } | null>(null);

  // Quick preset helper
  const applyPreset = (preset: "7d" | "30d" | "month" | "ytd") => {
    const now = new Date();
    const endStr = formatDateInput(now);
    let startD = new Date();

    if (preset === "7d") {
      startD.setDate(now.getDate() - 7);
    } else if (preset === "30d") {
      startD.setDate(now.getDate() - 30);
    } else if (preset === "month") {
      startD = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === "ytd") {
      startD = new Date(now.getFullYear(), 0, 1);
    }

    setStartDate(formatDateInput(startD));
    setEndDate(endStr);
    setErrorMessage(null);
    setSuccessInfo(null);
  };

  const handleExport = async (format: ExportFormat) => {
    setErrorMessage(null);
    setSuccessInfo(null);
    setLoadingFormat(format);

    try {
      if (!startDate || !endDate) {
        throw new Error("Please select both start date and end date.");
      }

      if (new Date(startDate) > new Date(endDate)) {
        throw new Error("Start date must be before or equal to end date.");
      }

      const res = await generateAuthorityReportAction({
        reportType,
        startDate,
        endDate,
        format,
      });

      if (!res.success || !res.base64Data || !res.filename) {
        throw new Error(res.error || "Failed to generate report.");
      }

      // Convert Base64 data to Blob and trigger direct browser download
      const binaryString = atob(res.base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: res.mimeType || "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccessInfo({
        filename: res.filename,
        recordCount: res.recordCount ?? 0,
        format,
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An error occurred during report export.");
    } finally {
      setLoadingFormat(null);
    }
  };

  const reportOptions: {
    type: AuthorityReportType;
    title: string;
    marathiTitle: string;
    description: string;
    icon: React.ReactNode;
    colorClasses: {
      border: string;
      bg: string;
      iconBg: string;
      iconText: string;
    };
  }[] = [
    {
      type: "CASE_SUMMARY",
      title: "Case Summary",
      marathiTitle: "Case summary",
      description:
        "Comprehensive records of all clinical livestock health cases, disease symptoms, mortality counts, and veterinary assessments.",
      icon: <Activity className="h-5 w-5 text-emerald-700" />,
      colorClasses: {
        border: "border-emerald-300",
        bg: "bg-emerald-50/50",
        iconBg: "bg-emerald-100",
        iconText: "text-emerald-800",
      },
    },
    {
      type: "VACCINATION_COVERAGE",
      title: "Vaccination Coverage",
      marathiTitle: "Vaccination coverage",
      description:
        "Detailed immunization records, administered vaccines, target livestock species, booster schedules, and personnel logs.",
      icon: <Syringe className="h-5 w-5 text-purple-700" />,
      colorClasses: {
        border: "border-purple-300",
        bg: "bg-purple-50/50",
        iconBg: "bg-purple-100",
        iconText: "text-purple-800",
      },
    },
    {
      type: "OUTBREAK_ALERTS",
      title: "Outbreak & Alert Log",
      marathiTitle: "Outbreak and alert log",
      description:
        "Historical log of biosecurity cluster alerts, suspected epidemic hotspots, cluster time-windows, and notification records.",
      icon: <BellRing className="h-5 w-5 text-amber-700" />,
      colorClasses: {
        border: "border-amber-300",
        bg: "bg-amber-50/50",
        iconBg: "bg-amber-100",
        iconText: "text-amber-800",
      },
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      {/* Header & Jurisdiction Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E3A2B]/8 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display">
              {t("districtDataExports")}
            </h1>
            <Badge className="bg-[#3F6B4A]/12 text-[#1E3A2B] border border-white/60 text-xs font-semibold">
              {t("dataExportsReports")}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#4A3324]/75">
            {t("generateExportOfficial")}
          </p>
        </div>

        <div className="p-3 bg-white/65 backdrop-blur-md border border-white/80 shadow-xs rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-[#3F6B4A]/12 text-[#3F6B4A] rounded-xl">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <span className="text-[#4A3324]/60 block font-medium">Authorized Jurisdiction</span>
            <strong className="text-[#1E3A2B] font-bold text-sm">{districtName} District</strong>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#C1622D]/10 border border-[#C1622D]/20 text-[#C1622D] text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-[#C1622D] shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#C1622D] hover:text-[#933B18] font-bold text-xs p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Notification */}
      {successInfo && (
        <div className="p-4 rounded-2xl bg-[#3F6B4A]/12 border border-[#3F6B4A]/25 text-[#1E3A2B] text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-[#3F6B4A] shrink-0" />
            <div>
              <span className="font-bold block text-sm">
                {successInfo.format} Export Generated Successfully!
              </span>
              <span className="text-[#4A3324]/80">
                {t("downloadedFile")} <strong className="font-mono">{successInfo.filename}</strong> ({successInfo.recordCount} records).
              </span>
            </div>
          </div>
          <Badge className="bg-white/80 text-[#1E3A2B] border border-white/80 font-mono">
            {successInfo.recordCount} rows
          </Badge>
        </div>
      )}

      {/* Main Configuration Card */}
      <Card className="liquid-glass-card rounded-3xl overflow-hidden p-6 space-y-6">
        <div className="border-b border-[#1E3A2B]/8 pb-4">
          <div className="text-base text-[#1E3A2B] font-bold flex items-center gap-2 font-display">
            <FileSpreadsheet className="h-5 w-5 text-[#3F6B4A]" />
            <span>{t("reportParamsExportConfig")}</span>
          </div>
          <p className="text-xs text-[#4A3324]/70 mt-0.5">
            {t("configReportTypeDates")}
          </p>
        </div>

        <div className="space-y-6">
          {/* 1. Report Type Selector */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider block">
              1. Select report type
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {reportOptions.map((opt) => {
                const isSelected = reportType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setReportType(opt.type);
                      setSuccessInfo(null);
                    }}
                    className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#3F6B4A] bg-white/90 shadow-md ring-2 ring-[#3F6B4A]/20"
                        : "border-white/80 bg-white/55 hover:bg-white/80 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl ${opt.colorClasses.iconBg}`}>
                        {opt.icon}
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-emerald-700 bg-emerald-700" : "border-stone-400"
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="font-bold text-sm text-[#191F1C]">{opt.title}</div>
                    <div className="text-[11px] font-semibold text-stone-500 mb-1">
                      {opt.marathiTitle}
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Date Range Boundaries & Quick Presets */}
          <div className="space-y-3 pt-4 border-t border-[#E5E0D8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                2. Report date range
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-stone-500 uppercase font-semibold mr-1">
                  Presets:
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("7d")}
                  className="h-6 text-[10px] px-2 rounded-lg border-[#D9D3C7]"
                >
                  {t("last7Days")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("30d")}
                  className="h-6 text-[10px] px-2 rounded-lg border-[#D9D3C7]"
                >
                  {t("last30Days")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("month")}
                  className="h-6 text-[10px] px-2 rounded-lg border-[#D9D3C7]"
                >
                  {t("thisMonth")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("ytd")}
                  className="h-6 text-[10px] px-2 rounded-lg border-[#D9D3C7]"
                >
                  {t("yearToDate")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-xs text-stone-600 font-medium">
                  {t("startDate")}
                </Label>
                <div className="relative">
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 rounded-xl border-[#D9D3C7] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="text-xs text-stone-600 font-medium">
                  {t("endDate")}
                </Label>
                <div className="relative">
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 rounded-xl border-[#D9D3C7] text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Export Actions (CSV & PDF) */}
          <div className="pt-4 border-t border-[#E5E0D8] space-y-3">
            <Label className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
              3. Generate official export
            </Label>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => handleExport("CSV")}
                disabled={loadingFormat !== null}
                className="w-full sm:w-auto min-w-[180px] liquid-button-primary text-white font-bold rounded-full text-xs h-11 gap-2 shadow-md cursor-pointer flex items-center justify-center transition-all disabled:opacity-50"
              >
                {loadingFormat === "CSV" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("generatingCsv")}</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{t("downloadCsv")}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleExport("PDF")}
                disabled={loadingFormat !== null}
                className="w-full sm:w-auto min-w-[180px] bg-[#1E3A2B] hover:bg-[#15281E] text-white font-bold rounded-full text-xs h-11 gap-2 shadow-md cursor-pointer flex items-center justify-center transition-all disabled:opacity-50"
              >
                {loadingFormat === "PDF" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("generatingPdf")}</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>{t("downloadPdf")}</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-[#4A3324]/60 pt-1">
              • {t("exportsScopedAudit", { districtName })}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
