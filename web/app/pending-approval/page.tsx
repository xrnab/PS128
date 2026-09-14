import { getCurrentAppUser } from "@/lib/auth/session";
import { SignOutButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { defaultLocale, Locale } from "@/lib/i18n";
import { getPendingCopy } from "@/lib/i18n/pending";

export default async function PendingApprovalPage() {
  const appUser = await getCurrentAppUser();
  const localeCookie = (await cookies()).get("maitri-locale")?.value;
  const locale = ["en", "bn", "hi", "mr"].includes(localeCookie || "")
    ? (localeCookie as Locale)
    : defaultLocale;
  const copy = getPendingCopy(locale);
  const roleKey = appUser?.role || "";
  const roleName = copy.roleNames[roleKey] || copy.professional;
  const submittedText = copy.submitted.replace("{role}", roleName);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[#FBF8F3] text-[#1D1C14] overflow-hidden">
      {/* Ambient background light blobs */}
      <div className="ambient-blob -top-24 -left-20 h-96 w-96 bg-[#D9A441]/15 blur-3xl pointer-events-none" />
      <div className="ambient-blob top-1/2 -right-28 h-96 w-96 bg-[#3F6B4A]/12 blur-3xl pointer-events-none [animation-delay:-5s]" />

      <div className="liquid-glass-card max-w-md w-full relative z-10 text-center rounded-3xl overflow-hidden p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Header Icon & Status */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D9A441]/15 border border-[#D9A441]/30 text-[#D9A441] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>

          <Badge className="bg-[#D9A441]/20 text-[#1E3A2B] border-[#D9A441]/40 text-xs font-semibold px-3 py-1 rounded-full">
            {copy.badge}
          </Badge>

          <h1 className="text-2xl font-bold tracking-tight text-[#1E3A2B]">{copy.title}</h1>
          <p className="text-xs text-[#1D1C14]/70 leading-relaxed max-w-xs">{submittedText}</p>
        </div>

        {/* User Details Bento */}
        {appUser && (
          <div className="space-y-3 text-left">
            <div className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/80 text-xs space-y-2.5 shadow-xs">
              <div className="flex justify-between items-center border-b border-[#1E3A2B]/10 pb-2">
                <span className="text-[#1D1C14]/60 font-medium">{copy.applicant}:</span>
                <span className="font-semibold text-[#1E3A2B]">{appUser.name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#1E3A2B]/10 pb-2">
                <span className="text-[#1D1C14]/60 font-medium">{copy.phone}:</span>
                <span className="font-medium text-[#1D1C14]">{appUser.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#1D1C14]/60 font-medium">{copy.scope}:</span>
                <span className="font-semibold text-[#3F6B4A]">
                  {appUser.district?.name || appUser.block?.name || appUser.village?.name || copy.assignedDistrict}
                </span>
              </div>
            </div>

            <div className="bg-[#D9A441]/10 backdrop-blur-md p-3.5 rounded-2xl border border-[#D9A441]/25 text-xs text-[#1E3A2B] space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#1E3A2B]">
                <ShieldAlert className="h-4 w-4 text-[#D9A441]" />
                <span>{copy.whyTitle}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#1D1C14]/75">
                {copy.whyText}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/dashboard" className="w-full sm:w-auto flex-1">
            <Button className="w-full gap-2 text-xs font-semibold rounded-full bg-[#1E3A2B] text-[#FBF8F3] hover:bg-[#3F6B4A] shadow-md hover:shadow-lg transition-all min-h-[42px]">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{copy.checkStatus}</span>
            </Button>
          </Link>

          <SignOutButton>
            <Button variant="outline" className="w-full sm:w-auto flex-1 gap-2 text-xs font-semibold rounded-full border-white/80 bg-white/60 hover:bg-white/90 text-[#1E3A2B] shadow-xs min-h-[42px]">
              <LogOut className="h-3.5 w-3.5" />
              <span>{copy.signOut}</span>
            </Button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
