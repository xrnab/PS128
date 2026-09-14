import Link from "next/link";
import { requireFieldAgent } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";
import { getFieldAgentAssistanceQueueAction } from "@/lib/actions/assistance";
import { AgentAssistanceQueue } from "@/components/agent/AgentAssistanceQueue";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import {
  FilePlus2,
  ShieldCheck,
  WifiOff,
  Clock,
  UserCheck,
  CheckCircle2,
  Activity,
  MapPin,
} from "lucide-react";

export default async function FieldAgentPage() {
  const agent = await requireFieldAgent();
  const t = await getTranslations("agent");

  const jurisdictionName = agent.village?.name
    ? `${agent.village.name} (${agent.block?.name || agent.district?.name})`
    : agent.block?.name || agent.district?.name || t("territory");

  const [requests, newRequestsCount, myAssignedCount, inProgressCount, completedCount, casesCreatedCount] =
    await Promise.all([
      getFieldAgentAssistanceQueueAction(),
      prisma.assistanceRequest.count({
        where: {
          status: "REQUESTED",
          village: {
            block: {
              districtId: agent.districtId || undefined,
            },
          },
        },
      }),
      prisma.assistanceRequest.count({
        where: {
          assignedFieldAgentUserId: agent.id,
          status: { in: ["ACCEPTED", "ASSIGNED"] },
        },
      }),
      prisma.assistanceRequest.count({
        where: {
          assignedFieldAgentUserId: agent.id,
          status: "IN_PROGRESS",
        },
      }),
      prisma.assistanceRequest.count({
        where: {
          assignedFieldAgentUserId: agent.id,
          status: "COMPLETED",
        },
      }),
      prisma.case.count({
        where: {
          createdByUserId: agent.id,
          reportSource: "FIELD_AGENT",
        },
      }),
    ]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14] dark:text-[#F4EEE1]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E3A2B]/8">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display">
              {t("fieldAgentWorkstation")}
            </h1>
            <span className="text-xs bg-[#D9A441]/15 text-[#8F6612] font-bold px-3 py-1 rounded-full border border-white/60 shrink-0">
              <MapPin className="h-3 w-3 inline mr-1 text-[#D9A441]" />
              {t("jurisdiction")}: {jurisdictionName}
            </span>
          </div>
          <p className="text-[#4A3324]/75 text-xs sm:text-sm mt-1">
            {t("agentLead")}
          </p>
        </div>

        <Link href="/agent/report" className="w-full sm:w-auto">
          <Button size="sm" className="liquid-button-primary w-full sm:w-auto gap-2 text-xs h-10 px-5">
            <FilePlus2 className="h-4 w-4" />
            <span>{t("recordInspection")}</span>
          </Button>
        </Link>
      </div>

      {/* REAL DATABASE KPI METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#C1622D] uppercase tracking-wider">{t("newRequestsKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#C1622D] font-display">{newRequestsCount}</span>
            <UserCheck className="h-5 w-5 text-[#C1622D]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider">{t("assignedVisitsKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#1E3A2B] font-display">{myAssignedCount}</span>
            <Clock className="h-5 w-5 text-[#1E3A2B]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#D9A441] uppercase tracking-wider">{t("inProgressKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#D9A441] font-display">{inProgressCount}</span>
            <Activity className="h-5 w-5 text-[#D9A441]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#3F6B4A] uppercase tracking-wider">{t("completedKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#3F6B4A] font-display">{completedCount}</span>
            <CheckCircle2 className="h-5 w-5 text-[#3F6B4A]" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_28px_rgba(30,58,43,0.08)] flex flex-col justify-between hover:-translate-y-1 transition-all">
          <span className="text-xs font-bold text-[#4A3324]/70 uppercase tracking-wider">{t("fieldCasesKpi")}</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-[#1E3A2B] font-display">{casesCreatedCount}</span>
            <FilePlus2 className="h-5 w-5 text-[#3F6B4A]" />
          </div>
        </div>
      </div>

      {/* Offline Sync Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#F4EEE1]/70 backdrop-blur-md border border-white/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#1E3A2B] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-[#3F6B4A]/15 text-[#3F6B4A]">
            <WifiOff className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-[#1E3A2B]">{t("offlineSyncActive")}</span>
            <span className="ml-2 text-[#4A3324]/75">
              {t("offlineSyncDesc")}
            </span>
          </div>
        </div>
        <span className="bg-[#3F6B4A]/15 text-[#3F6B4A] border border-white/60 text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
          {t("autoSyncEnabled")}
        </span>
      </div>

      {/* VILLAGE ASSISTANCE REQUESTS & SCHEDULED VISITS QUEUE */}
      <Card className="rounded-3xl bg-[#F4EEE1]/80 backdrop-blur-[24px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.10)]">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#1E3A2B]/8">
          <div>
            <CardTitle className="text-lg font-bold text-[#1E3A2B] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#3F6B4A]" />
              <span>{t("villageAssistanceTitle")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#4A3324]/70">
              {t("villageAssistanceDesc")}
            </CardDescription>
          </div>
          <Link href="/agent/report">
            <Button variant="ghost" size="sm" className="text-xs text-[#3F6B4A] hover:bg-[#3F6B4A]/10 font-bold rounded-full">
              {t("directInspection")} &rarr;
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          <AgentAssistanceQueue
            requests={requests}
            currentAgentId={agent.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
