import React from "react";
import Link from "next/link";
import { getVetFollowUpsAction } from "@/lib/actions/vet";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function VetFollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = (params.category as "all" | "due_today" | "upcoming" | "overdue" | "completed") || "all";
  const followUps = await getVetFollowUpsAction(category);
  const today = new Date();
  const t = await getTranslations("vet");

  const tabs = [
    { label: t("allFollowUps"), key: "all" },
    { label: t("dueToday"), key: "due_today" },
    { label: t("upcoming"), key: "upcoming" },
    { label: t("overdue"), key: "overdue" },
    { label: t("completed"), key: "completed" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1E3A2B]/8 pb-4">
        <div>
          <Badge className="border-white/80 text-[#3F6B4A] bg-[#3F6B4A]/12 text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full">
            {t("clinicalWorkstationTitle")}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display mt-1">
            {t("followUpTrackerTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A3324]/75">
            {t("followUpLead")}
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap bg-white/65 backdrop-blur-md p-1 rounded-full border border-white/80 shadow-xs">
          {tabs.map((tab) => {
            const isActive = category === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.key === "all" ? "/vet/follow-ups" : `/vet/follow-ups?category=${tab.key}`}
              >
                <button
                  type="button"
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#1E3A2B] text-white shadow-xs"
                      : "text-[#4A3324]/70 hover:text-[#1E3A2B] hover:bg-white/60"
                  }`}
                >
                  {tab.label}
                </button>
              </Link>
            );
          })}
        </div>
      </div>

      <Card className="liquid-glass-card rounded-3xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#1E3A2B]/8 pb-4">
          <div className="p-1 rounded-lg bg-[#3F6B4A]/12 text-[#3F6B4A]">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="text-base font-bold text-[#1E3A2B] font-display">
            <span>{t("followUps")} ({followUps.length})</span>
          </div>
        </div>

        <div>
          {followUps.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#4A3324]/60 bg-white/40 rounded-2xl border border-dashed border-[#1E3A2B]/15 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-[#3F6B4A] mx-auto" />
              <p className="font-bold text-sm text-[#1E3A2B]">{t("noFollowUpsFound")}</p>
              <p>{t("noFollowUpsDesc")}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {followUps.map((item) => {
                const dueDate = new Date(item.followUpDate!);
                const isOverdue = dueDate < today && !item.followUpCompleted;
                const isCompleted = item.followUpCompleted;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                      isCompleted
                        ? "bg-white/40 backdrop-blur-md border-white/70"
                        : isOverdue
                        ? "bg-[#C1622D]/8 backdrop-blur-md border-[#C1622D]/30 shadow-[0_4px_16px_rgba(193,98,45,0.06)]"
                        : "bg-white/65 backdrop-blur-md border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_16px_rgba(30,58,43,0.04)]"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#1E3A2B] font-mono">Case #{item.case.caseNumber}</span>
                        <Badge className="text-[10px] bg-[#1E3A2B]/10 text-[#1E3A2B] border-white/60">
                          {item.case.status}
                        </Badge>
                        {isCompleted ? (
                          <Badge className="text-[10px] bg-[#3F6B4A]/15 text-[#3F6B4A] border border-[#3F6B4A]/30 flex items-center gap-1 font-mono font-bold">
                            <CheckCircle2 className="h-3 w-3" /> {t("statusCompleted")}
                          </Badge>
                        ) : isOverdue ? (
                          <Badge className="text-[10px] bg-[#C1622D]/15 text-[#C1622D] border border-[#C1622D]/30 flex items-center gap-1 font-bold">
                            <AlertCircle className="h-3 w-3" /> {t("statusOverdue")}
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-[#D9A441]/15 text-[#8F6612] border border-white/60 flex items-center gap-1 font-mono font-bold">
                            <Clock className="h-3 w-3" /> {t("statusScheduled")}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-[#4A3324]/75">
                        Animal: <strong className="text-[#1E3A2B] font-mono">{item.animal.tag} ({item.animal.species})</strong> • Farm: <strong className="text-[#1E3A2B]">{item.animal.herd.farm.name}</strong> ({item.animal.herd.farm.village.name})
                      </p>

                      <p className="text-xs text-[#3F6B4A] font-medium pt-0.5">
                        Clinical Assessment: {item.diagnosis} (Action: {item.action})
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-[10px] text-[#4A3324]/50 uppercase font-semibold block">{t("scheduledDateLabel")}</span>
                        <span className={`text-xs font-bold font-mono ${isCompleted ? "text-[#4A3324]/60" : isOverdue ? "text-[#C1622D]" : "text-[#1E3A2B]"}`}>
                          {formatDate(dueDate)}
                        </span>
                      </div>

                      <Link href={`/vet/cases/${item.case.id}`}>
                        <button type="button" className="text-xs h-8 px-3.5 liquid-button-primary text-white font-bold rounded-full gap-1 shadow-xs inline-flex items-center cursor-pointer transition-all hover:scale-[1.02]">
                          <span>{isCompleted ? t("viewCase") : t("performReview")}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
