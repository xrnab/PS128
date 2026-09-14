"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DistrictPipelineStage } from "@/lib/authority/metrics";
import { Clock, Eye, TestTube, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface DistrictCasePipelineProps {
  pipeline: DistrictPipelineStage[];
}

export function DistrictCasePipeline({ pipeline }: DistrictCasePipelineProps) {
  const t = useTranslations("authority");
  const totalCases = pipeline.reduce((sum, p) => sum + p.count, 0);

  const getStageIcon = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "UNDER_EXAMINATION":
        return <Eye className="h-4 w-4 text-orange-600" />;
      case "LAB_REFERRAL":
        return <TestTube className="h-4 w-4 text-purple-600" />;
      case "CONFIRMED":
        return <CheckCircle2 className="h-4 w-4 text-red-600" />;
      case "CLOSED_HARMLESS":
        return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
      default:
        return <Clock className="h-4 w-4 text-stone-500" />;
    }
  };

  return (
    <Card className="liquid-glass-card rounded-3xl overflow-hidden p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E3A2B]/8 pb-4">
        <div>
          <div className="text-base font-bold text-[#1E3A2B] flex items-center gap-2 font-display">
            <span>{t("districtCasePipeline")}</span>
          </div>
          <p className="text-xs text-[#4A3324]/70 mt-0.5">
            Live case triage stages across the authorized jurisdiction • {totalCases} total cases tracked
          </p>
        </div>
        <Badge className="bg-[#1E3A2B]/10 text-[#1E3A2B] border border-white/60 text-xs w-fit font-medium">
          5 Prisma Case Stages
        </Badge>
      </div>

      <div className="space-y-5">
        {/* Progress Bar Ribbon */}
        <div className="w-full h-3 bg-white/70 rounded-full overflow-hidden flex shadow-inner border border-white/80 p-0.5">
          {pipeline.map((stage) => {
            if (stage.percentage <= 0 && stage.count === 0) return null;
            return (
              <div
                key={stage.status}
                style={{
                  width: totalCases > 0 ? `${(stage.count / totalCases) * 100}%` : "20%",
                  backgroundColor: stage.color,
                }}
                className="h-full rounded-full transition-all duration-500"
                title={`${stage.label}: ${stage.count} cases (${stage.percentage}%)`}
              />
            );
          })}
        </div>

        {/* Stage Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {pipeline.map((stage, idx) => (
            <div
              key={stage.status}
              className="p-4 rounded-2xl bg-white/65 backdrop-blur-md border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_16px_rgba(30,58,43,0.04)] flex flex-col justify-between space-y-3 relative hover:bg-white/85 hover:scale-[1.02] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-lg bg-white/80 shadow-xs">
                    {getStageIcon(stage.status)}
                  </div>
                  <span className="text-xs font-bold text-[#1E3A2B]">{stage.label}</span>
                </div>
                {idx < pipeline.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-[#1E3A2B]/20 hidden lg:block absolute -right-2 top-5 z-10" />
                )}
              </div>

              <div>
                <div className="text-2xl font-bold font-mono tracking-tight" style={{ color: stage.color }}>
                  {stage.count}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#4A3324]/65 mt-1 font-medium">
                  <span>{t("shareOfTotal")}</span>
                  <span className="font-semibold text-[#1E3A2B] font-mono">{stage.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
