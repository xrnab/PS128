"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecentActivityItem } from "@/lib/authority/metrics";
import { Activity, ClipboardList, Footprints, FileText, BellRing, ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface RecentActivityFeedProps {
  activities: RecentActivityItem[];
}

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const t = useTranslations("authority");
  const getActivityIcon = (type: RecentActivityItem["type"]) => {
    switch (type) {
      case "CASE":
        return <ClipboardList className="h-4 w-4 text-emerald-700" />;
      case "VISIT":
        return <Footprints className="h-4 w-4 text-blue-700" />;
      case "REPORT":
        return <FileText className="h-4 w-4 text-purple-700" />;
      case "ALERT":
        return <BellRing className="h-4 w-4 text-red-600 animate-pulse" />;
      default:
        return <Activity className="h-4 w-4 text-stone-600" />;
    }
  };

  return (
    <Card className="liquid-glass-card rounded-3xl overflow-hidden p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-4">
        <div>
          <div className="text-base font-bold text-[#1E3A2B] flex items-center gap-2 font-display">
            <Activity className="h-5 w-5 text-[#3F6B4A]" />
            <span>{t("recentActivityStream")}</span>
          </div>
          <p className="text-xs text-[#4A3324]/70 mt-0.5">
            {t("activityStreamDesc")}
          </p>
        </div>
        <Badge className="bg-[#1E3A2B]/10 text-[#1E3A2B] border border-white/60 text-xs font-medium">
          {t("liveStreamCount", { count: activities.length })}
        </Badge>
      </div>

      <div>
        {activities.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#4A3324]/60 bg-white/40 rounded-2xl border border-dashed border-[#1E3A2B]/15">
            {t("noActivityLogged")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-2xl bg-white/65 backdrop-blur-md border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_16px_rgba(30,58,43,0.04)] flex items-start justify-between gap-3 hover:bg-white/85 transition-all hover:scale-[1.01]"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/80 border border-white/90 shadow-xs shrink-0 mt-0.5">
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-[#1E3A2B]">{act.title}</span>
                      <Badge
                        className={`text-[10px] ${
                          act.statusVariant === "destructive"
                            ? "bg-[#C1622D]/15 text-[#C1622D] border-[#C1622D]/30"
                            : act.statusVariant === "secondary"
                            ? "bg-[#3F6B4A]/12 text-[#3F6B4A] border-[#3F6B4A]/30"
                            : "bg-[#1E3A2B]/8 text-[#1E3A2B] border-white/60"
                        }`}
                      >
                        {act.statusBadge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#4A3324]/75">{act.subtitle}</p>
                    <p className="text-[10px] text-[#4A3324]/50 font-mono">
                      {formatDateTime(act.timestamp, true)}
                    </p>
                  </div>
                </div>

                {act.linkUrl && (
                  <Link href={act.linkUrl} className="shrink-0">
                    <button className="p-1.5 rounded-full hover:bg-white/80 text-[#4A3324]/60 hover:text-[#1E3A2B] transition-colors cursor-pointer">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
