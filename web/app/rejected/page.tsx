import { getCurrentAppUser } from "@/lib/auth/session";
import { SignOutButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XCircle, ShieldX, LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function RejectedPage() {
  const appUser = await getCurrentAppUser();
  const t = await getTranslations("auth");

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[#FBF8F3] text-[#1D1C14] overflow-hidden">
      {/* Ambient background light blobs */}
      <div className="ambient-blob -top-24 -left-20 h-96 w-96 bg-[#C1622D]/15 blur-3xl pointer-events-none" />
      <div className="ambient-blob top-1/2 -right-28 h-96 w-96 bg-[#3F6B4A]/10 blur-3xl pointer-events-none [animation-delay:-5s]" />

      <div className="liquid-glass-card max-w-md w-full relative z-10 text-center rounded-3xl overflow-hidden p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Header Icon & Status */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C1622D]/15 border border-[#C1622D]/30 text-[#C1622D] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <XCircle className="h-8 w-8" />
          </div>

          <Badge className="bg-[#C1622D]/15 text-[#C1622D] border-[#C1622D]/30 text-xs font-semibold px-3 py-1 rounded-full">
            {t("accessRejected")}
          </Badge>

          <h1 className="text-2xl font-bold tracking-tight text-[#1E3A2B]">{t("applicationRejected")}</h1>
          <p className="text-xs text-[#1D1C14]/70 leading-relaxed max-w-xs">{t("rejectedDesc")}</p>
        </div>

        {/* User Details Bento */}
        {appUser && (
          <div className="space-y-3 text-left">
            <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/80 text-xs space-y-2.5 shadow-xs">
              <div className="flex justify-between items-center border-b border-[#1E3A2B]/10 pb-2">
                <span className="text-[#1D1C14]/60 font-medium">{t("applicantName")}:</span>
                <span className="font-semibold text-[#1E3A2B]">{appUser.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#1E3A2B]/10 pb-2">
                <span className="text-[#1D1C14]/60 font-medium">{t("requestedRole")}:</span>
                <span className="font-medium text-[#1D1C14]">{appUser.role}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#1D1C14]/60 font-medium">{t("jurisdiction")}:</span>
                <span className="font-semibold text-[#3F6B4A]">
                  {appUser.district?.name || "Unassigned"}
                </span>
              </div>
            </div>

            <div className="bg-[#C1622D]/10 backdrop-blur-md p-3.5 rounded-2xl border border-[#C1622D]/25 text-xs text-[#C1622D] flex items-start gap-2.5">
              <ShieldX className="h-5 w-5 text-[#C1622D] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-[#1D1C14]/80">
                {t("rejectedContact")}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center pt-2">
          <SignOutButton>
            <Button variant="outline" className="w-full gap-2 text-xs font-semibold rounded-full border-white/80 bg-white/60 hover:bg-white/90 text-[#1E3A2B] shadow-xs min-h-[42px]">
              <LogOut className="h-4 w-4" />
              <span>{t("signOut")}</span>
            </Button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
