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
    <div className="workspace-page flex-1 flex flex-col w-full gap-6 text-[#20271F]">
      {/* Top Banner */}
      <div className="workspace-heading flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#20271F] tracking-tight">{t("fieldAgentWorkstation")}</h1>
            <Badge className="text-[10px] bg-amber-50 text-amber-900 border-amber-200 shrink-0">
              {t("jurisdiction")}: {jurisdictionName}
            </Badge>
          </div>
          <p className="text-stone-600 text-xs mt-1">
            {t("agentLead")}
          </p>
        </div>

        <Link href="/agent/report" className="w-full sm:w-auto">
          <Button size="sm" className="w-full sm:w-auto gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm min-h-[40px] rounded-xl cursor-pointer">
            <FilePlus2 className="h-4 w-4" />
            <span>{t("recordInspection")}</span>
          </Button>
        </Link>
      </div>

      {/* REAL DATABASE KPI METRICS */}
      <div className="metric-register grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-[#D7CFBB] border border-[#D7CFBB]">
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">{t("newRequestsKpi")}</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-950">{newRequestsCount}</span>
            <UserCheck className="h-5 w-5 text-amber-700" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider">{t("assignedVisitsKpi")}</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-sky-950">{myAssignedCount}</span>
            <Clock className="h-5 w-5 text-sky-700" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">{t("inProgressKpi")}</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-purple-950">{inProgressCount}</span>
            <Activity className="h-5 w-5 text-purple-700" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">{t("completedKpi")}</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-950">{completedCount}</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] shadow-2xs hover-lift flex flex-col justify-between">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{t("fieldCasesKpi")}</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-stone-900">{casesCreatedCount}</span>
            <FilePlus2 className="h-5 w-5 text-stone-700" />
          </div>
        </div>
      </div>

      {/* Offline Sync Banner */}
      <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-purple-950 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
            <WifiOff className="h-4 w-4 text-purple-700" />
          </div>
          <div>
            <span className="font-bold text-purple-900">{t("offlineSyncActive")}</span>
            <span className="ml-1.5 text-purple-900">
              {t("offlineSyncDesc")}
            </span>
          </div>
        </div>
        <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[11px] font-semibold whitespace-nowrap">
          {t("autoSyncEnabled")}
        </Badge>
      </div>

      {/* VILLAGE ASSISTANCE REQUESTS & SCHEDULED VISITS QUEUE */}
      <Card className="border-[#E5E0D8] bg-white rounded-3xl shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#E5E0D8]">
          <div>
            <CardTitle className="text-base font-bold text-[#191F1C] flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-700" />
              <span>{t("villageAssistanceTitle")}</span>
            </CardTitle>
            <CardDescription className="text-xs text-stone-500">
              {t("villageAssistanceDesc")}
            </CardDescription>
          </div>
          <Link href="/agent/report">
            <Button variant="ghost" size="sm" className="text-xs text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50">
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

      {/* Field Inspection Protocols Advisory */}
      <div className="p-4 rounded-2xl bg-white border border-[#E5E0D8] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h4 className="font-bold text-[#191F1C] text-sm">{t("fieldExamProtocolTitle")}</h4>
            <p className="text-stone-500 text-xs">
              {t("fieldExamProtocolDesc")}
            </p>
          </div>
        </div>
        <Link href="/agent/report">
          <Button size="sm" className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs whitespace-nowrap rounded-xl min-h-[36px]">
            {t("recordInspection")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
