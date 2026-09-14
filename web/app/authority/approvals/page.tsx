import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { listPendingApprovals } from "@/lib/actions/authority";
import { ApprovalButtons } from "../ApprovalButtons";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Clock, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function AuthorityApprovalsPage() {
  await requireDistrictAuthority();
  const pendingApprovals = await listPendingApprovals();
  const t = await getTranslations("authority");

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      <div className="border-b border-[#1E3A2B]/8 pb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display">{t("credentialApprovalsHeader")}</h1>
        <p className="text-[#4A3324]/75 text-xs sm:text-sm mt-1">
          {t("surveillanceAnalytics")}
        </p>
      </div>

      <Card className="liquid-glass-card rounded-3xl overflow-hidden p-6 space-y-6">
        <div className="flex flex-row items-center justify-between border-b border-[#1E3A2B]/8 pb-4">
          <div>
            <div className="text-base text-[#1E3A2B] flex items-center gap-2 font-bold font-display">
              <UserCheck className="h-5 w-5 text-[#D9A441]" />
              <span>{t("approvals")} ({pendingApprovals.length})</span>
            </div>
            <p className="text-xs text-[#4A3324]/70 mt-0.5">
              {t("credentialApprovalsHeader")}
            </p>
          </div>
        </div>

        <div>
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#4A3324]/60 bg-white/40 rounded-2xl border border-dashed border-[#1E3A2B]/15">
              {t("noAlertsFound")}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((user) => (
                <div
                  key={user.id}
                  className="p-4 rounded-2xl bg-white/65 backdrop-blur-md border border-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_16px_rgba(30,58,43,0.04)] hover:bg-white/85 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#1E3A2B] text-sm">{user.name}</h4>
                      <Badge className="text-[10px] bg-[#1E3A2B]/10 text-[#1E3A2B] border border-white/60">
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#4A3324]/70">
                      <span>{t("phone")}: <strong className="text-[#1E3A2B] font-mono">{user.phone}</strong></span>
                      <span className="flex items-center gap-1 text-[#3F6B4A] font-medium">
                        <MapPin className="h-3 w-3" />
                        {user.district?.name || t("authorizedJurisdiction")}
                        {user.block && ` • ${user.block.name}`}
                      </span>
                      <span className="flex items-center gap-1 text-[#4A3324]/50 font-mono">
                        <Clock className="h-3 w-3" />
                        {formatDate(user.createdAt, true)}
                      </span>
                    </div>
                  </div>

                  <ApprovalButtons userId={user.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
