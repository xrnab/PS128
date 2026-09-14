"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Calendar, MapPin, ShieldAlert, ShieldCheck, Search, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface AlertWithLocation {
  id: string;
  villageId: string;
  diseaseName: string | null;
  caseCount: number;
  windowStart: Date;
  windowEnd: Date;
  active: boolean;
  createdAt: Date;
  village: {
    name: string;
    block: {
      name: string;
      district: {
        name: string;
      };
    };
  };
}

interface AlertsListProps {
  alerts: AlertWithLocation[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const t = useTranslations("authority");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "historical">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeAlerts = alerts.filter((a) => a.active);
  const historicalAlerts = alerts.filter((a) => !a.active);

  const displayedAlerts = alerts.filter((a) => {
    if (filterTab === "active" && !a.active) return false;
    if (filterTab === "historical" && a.active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        a.village.name.toLowerCase().includes(q) ||
        a.village.block.name.toLowerCase().includes(q) ||
        (a.diseaseName && a.diseaseName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white/65 backdrop-blur-md border border-white/80 p-1 rounded-full shadow-xs">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              filterTab === "all"
                ? "bg-[#1E3A2B] text-white shadow-xs"
                : "text-[#4A3324]/70 hover:text-[#1E3A2B] hover:bg-white/60"
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilterTab("active")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              filterTab === "active"
                ? "bg-[#C1622D] text-white shadow-xs"
                : "text-[#4A3324]/70 hover:text-[#C1622D] hover:bg-white/60"
            }`}
          >
            Active ({activeAlerts.length})
          </button>
          <button
            onClick={() => setFilterTab("historical")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              filterTab === "historical"
                ? "bg-[#3F6B4A] text-white shadow-xs"
                : "text-[#4A3324]/70 hover:text-[#3F6B4A] hover:bg-white/60"
            }`}
          >
            Historical ({historicalAlerts.length})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#4A3324]/40" />
          <Input
            type="text"
            placeholder={t("searchVillageDisease")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-9 text-xs bg-white/80 border-white/80 rounded-full shadow-inner text-[#1E3A2B] placeholder:text-[#4A3324]/40 w-full"
          />
        </div>
      </div>

      {/* Active Alerts Section */}
      <Card className="liquid-glass-card liquid-glow-urgent rounded-3xl overflow-hidden p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E3A2B]/8 pb-4">
          <div>
            <div className="text-base text-[#1E3A2B] flex items-center gap-2 font-bold font-display">
              <ShieldAlert className="h-5 w-5 text-[#C1622D]" />
              <span>Active District Outbreak Alerts ({activeAlerts.length})</span>
            </div>
            <p className="text-xs text-[#4A3324]/70 mt-0.5">
              {t("clusterAlertRule")}
            </p>
          </div>
          <Badge className="text-xs bg-[#C1622D]/15 text-[#C1622D] border border-[#C1622D]/30 font-semibold w-fit">
            {t("automatedAlertBadge")}
          </Badge>
        </div>

        <div>
          {displayedAlerts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/40 border border-dashed border-[#1E3A2B]/15 text-center text-xs text-[#4A3324]/65 flex flex-col items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-[#3F6B4A]" />
              <span>{t("noAlertsFound")}</span>
            </div>
          ) : (
            <div className="space-y-3.5">
              {displayedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    alert.active
                      ? "bg-white/70 backdrop-blur-md border-[#C1622D]/30 shadow-[0_4px_20px_rgba(193,98,45,0.08)]"
                      : "bg-white/50 backdrop-blur-md border-white/80"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#1E3A2B] text-sm flex items-center gap-1.5">
                        <AlertTriangle className={`h-4 w-4 ${alert.active ? "text-[#C1622D] animate-pulse" : "text-[#4A3324]/40"}`} />
                        <span>{alert.diseaseName || "Suspected Outbreak Cluster"}</span>
                      </h4>
                      <Badge
                        className={`text-[10px] px-2 py-0.5 ${
                          alert.active
                            ? "bg-[#C1622D]/15 text-[#C1622D] border-[#C1622D]/30 font-bold"
                            : "bg-[#1E3A2B]/10 text-[#1E3A2B] border-white/60"
                        }`}
                      >
                        {alert.caseCount} Affected Animals
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#4A3324]/70">
                      <span className="flex items-center gap-1 text-[#1E3A2B] font-medium">
                        <MapPin className="h-3.5 w-3.5 text-[#3F6B4A]" />
                        {alert.village.name}, {alert.village.block.name}
                      </span>
                      <span className="flex items-center gap-1 text-[#4A3324]/60 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-[#4A3324]/40" />
                        Window: {formatDate(alert.windowStart, true)} — {formatDate(alert.windowEnd, true)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Link href="/authority">
                      <button className="h-8 px-3.5 text-xs rounded-full border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] font-semibold gap-1.5 shadow-xs flex items-center cursor-pointer transition-all">
                        <span>{t("viewOnMap")}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

