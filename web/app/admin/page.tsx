import React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/permissions";
import { getAdminDashboardMetricsAction } from "@/lib/actions/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  AlertTriangle,
  Clock,
  ScrollText,
  CheckCircle2,
  Building2,
  ChevronRight,
  MapPin,
  Flame,
} from "lucide-react";

import { formatDateTime } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const data = await getAdminDashboardMetricsAction();

  const roleOrder = ["ADMIN", "DISTRICT_AUTHORITY", "VETERINARIAN", "FIELD_AGENT", "FARMER"] as const;

  // Calculate totals by role
  const roleTotals = roleOrder.map((role) => {
    const active = data.userDistribution.find((d) => d.role === role && d.status === "ACTIVE")?.count || 0;
    const pending = data.userDistribution.find((d) => d.role === role && d.status === "PENDING_APPROVAL")?.count || 0;
    const rejected = data.userDistribution.find((d) => d.role === role && d.status === "REJECTED")?.count || 0;
    const total = active + pending + rejected;
    return { role, active, pending, rejected, total };
  });

  const grandTotalUsers = roleTotals.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14] dark:text-[#F4EEE1]">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3A2B]/10 pb-4">
        <div>
          <span className="text-xs font-bold text-[#3F6B4A] uppercase tracking-wide font-mono">
            {t("adminCockpit")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display mt-1">
            {t("platformOverview")}
          </h1>
          <p className="text-[#1D1C14]/70 text-xs sm:text-sm mt-0.5">
            {t("platformOverviewDesc")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/audit-log">
            <Button variant="outline" size="sm" className="rounded-full border-white/80 bg-white/60 hover:bg-white text-xs font-semibold gap-1.5 min-h-[38px] text-[#1E3A2B] shadow-xs cursor-pointer">
              <ScrollText className="h-3.5 w-3.5 text-[#D9A441]" />
              <span>{t("fullAuditLedger")}</span>
            </Button>
          </Link>
          <Link href="/admin/geography">
            <Button size="sm" className="liquid-button-primary rounded-full text-xs font-semibold gap-1.5 min-h-[38px] cursor-pointer">
              <MapPin className="h-3.5 w-3.5" />
              <span>{t("manageGeography")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. USER DISTRIBUTION BY ROLE & STATUS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-[#3F6B4A]" />
            <span>{t("userDistributionTitle", { count: grandTotalUsers })}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {roleTotals.map((r) => (
            <div
              key={r.role}
              className="liquid-glass-card p-4 rounded-3xl flex flex-col justify-between gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_24px_rgba(30,58,43,0.06)] hover:-translate-y-0.5 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E3A2B] truncate">
                    {r.role === "DISTRICT_AUTHORITY"
                      ? "District Authority"
                      : r.role === "FIELD_AGENT"
                      ? "Field Agent"
                      : r.role === "VETERINARIAN"
                      ? "Veterinarian"
                      : r.role === "FARMER"
                      ? "Farmer"
                      : "Admin"}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono border-white/80 bg-white/70 text-[#1E3A2B] rounded-full">
                    {r.total}
                  </Badge>
                </div>
                <div className="text-2xl font-black font-mono text-[#1E3A2B] mt-2 font-display">
                  {r.active}
                  <span className="text-xs font-normal text-[#1D1C14]/60 ml-1.5">{t("activeStatus")}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1E3A2B]/8 flex items-center justify-between text-[11px] text-[#1D1C14]/70 font-mono">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D9A441]" />
                  <span>{r.pending} {t("pendingStatus")}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C1622D]" />
                  <span>{r.rejected} {t("rejectedStatus")}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. OPERATIONAL GAPS & OVERDUE APPROVALS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: District Operational Gaps (0 Active Authorities) */}
        <div className="liquid-glass-card rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.08)] overflow-hidden">
          <div className="p-5 border-b border-[#1E3A2B]/8 bg-white/30 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-[#D9A441]/15 text-[#D9A441] border border-[#D9A441]/30 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E3A2B] font-display">
                  {t("districtGapsTitle", { count: data.districtsWithZeroAuthorities.length })}
                </h3>
                <p className="text-xs text-[#1D1C14]/60">
                  {t("zeroAuthoritiesDesc")}
                </p>
              </div>
            </div>
            <Badge className="bg-[#D9A441]/15 text-[#8F6612] border-[#D9A441]/30 text-[10px] rounded-full px-2.5 py-0.5 font-bold">
              {t("operationalWarning")}
            </Badge>
          </div>

          <div className="p-5">
            {data.districtsWithZeroAuthorities.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#1D1C14]/60 bg-white/40 rounded-2xl border border-white/70 flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="h-5 w-5 text-[#3F6B4A]" />
                <span className="font-semibold text-[#1E3A2B]">{t("allDistrictsCovered")}</span>
                <span className="text-[11px] text-[#1D1C14]/50">{t("noGapsDetected")}</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {data.districtsWithZeroAuthorities.map((gap) => (
                  <div
                    key={gap.districtId}
                    className="p-3.5 rounded-2xl bg-[#D9A441]/10 border border-[#D9A441]/25 flex items-center justify-between text-xs backdrop-blur-md"
                  >
                    <div>
                      <div className="font-bold text-[#1E3A2B] flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#D9A441]" />
                        <span>{gap.districtName}</span>
                      </div>
                      <span className="text-[11px] text-[#1D1C14]/60">
                        {t("personnelSummary", { vets: gap.totalVets, agents: gap.totalAgents, farmers: gap.totalFarmers })}
                      </span>
                    </div>

                    <Badge className="bg-[#C1622D]/15 text-[#C1622D] border-[#C1622D]/30 font-mono text-[10px] rounded-full">
                      {t("zeroAuthoritiesBadge")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card B: Pending Approvals Older than 48 Hours */}
        <div className="liquid-glass-card rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.08)] overflow-hidden">
          <div className="p-5 border-b border-[#1E3A2B]/8 bg-white/30 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-[#C1622D]/15 text-[#C1622D] border border-[#C1622D]/30 flex items-center justify-center">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E3A2B] font-display">
                  {t("overdueApprovalsTitle", { count: data.pendingApprovalsOverdue.length })}
                </h3>
                <p className="text-xs text-[#1D1C14]/60">
                  {t("overdueApprovalsDesc")}
                </p>
              </div>
            </div>
            <Badge className="bg-[#C1622D]/15 text-[#C1622D] border-[#C1622D]/30 text-[10px] rounded-full px-2.5 py-0.5 font-bold">
              {t("totalPendingBadge", { count: data.totalPendingApprovals })}
            </Badge>
          </div>

          <div className="p-5">
            {data.pendingApprovalsOverdue.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#1D1C14]/60 bg-white/40 rounded-2xl border border-white/70 flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="h-5 w-5 text-[#3F6B4A]" />
                <span className="font-semibold text-[#1E3A2B]">{t("noOverdueApprovals")}</span>
                <span className="text-[11px] text-[#1D1C14]/50">{t("allApprovalsUnder48")}</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {data.pendingApprovalsOverdue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#C1622D]/10 border border-[#C1622D]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs backdrop-blur-md"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1E3A2B]">{item.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono bg-white/80 border-white/80 rounded-full">
                          {item.role}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-[#1D1C14]/60 flex items-center gap-2 mt-0.5">
                        <span>{item.districtName || t("unassignedDistrict")}</span>
                        <span>•</span>
                        <span>{item.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[#C1622D] font-mono font-bold text-[11px] shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{t("hoursOverdue", { hours: item.hoursPending })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. RECENT AUDIT ACTIVITY (10 MOST RECENT ENTRIES) */}
      <div className="liquid-glass-card rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.08)] overflow-hidden">
        <div className="p-5 border-b border-[#1E3A2B]/8 bg-white/30 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-[#D9A441]/15 text-[#D9A441] border border-[#D9A441]/30 flex items-center justify-center">
              <ScrollText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E3A2B] font-display">
                {t("recentAuditActivity")}
              </h3>
              <p className="text-xs text-[#1D1C14]/60">
                {t("immutableLedgerEvents")}
              </p>
            </div>
          </div>

          <Link href="/admin/audit-log">
            <Button variant="ghost" size="sm" className="text-xs text-[#3F6B4A] hover:text-[#1E3A2B] hover:bg-white/60 gap-1 rounded-full font-semibold cursor-pointer">
              <span>{t("viewFullLog")}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="p-0">
          {data.recentAuditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#1D1C14]/60 bg-white/20">
              {t("noAuditRecords")}
            </div>
          ) : (
            <div className="divide-y divide-[#1E3A2B]/8 text-xs">
              {data.recentAuditLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-white/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-[#1E3A2B] text-white font-mono text-[10px] px-2.5 py-0.5 rounded-full">
                        {log.action}
                      </Badge>
                      <span className="text-[#1D1C14]/75 font-medium">
                        by <strong className="text-[#1E3A2B]">{log.actorName}</strong>
                        {log.actorRole && ` (${log.actorRole})`}
                      </span>
                      {log.targetName && (
                        <span className="text-[#1D1C14]/60">
                          &rarr; target: <strong className="text-[#1E3A2B]">{log.targetName}</strong>
                        </span>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-[#1D1C14]/60 italic pl-1">
                        Reason: {log.reason}
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-[#1D1C14]/60 shrink-0">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
