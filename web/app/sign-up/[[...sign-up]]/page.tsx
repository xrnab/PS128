import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  const { userId } = await auth();

  if (userId) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#FBF8F3] text-[#1D1C14] overflow-hidden">
      {/* Ambient background light blobs */}
      <div className="ambient-blob -top-24 -left-20 h-96 w-96 bg-[#3F6B4A]/15 blur-3xl pointer-events-none" />
      <div className="ambient-blob top-1/2 -right-28 h-96 w-96 bg-[#D9A441]/12 blur-3xl pointer-events-none [animation-delay:-5s]" />

      <div className="relative z-10 w-full max-w-md space-y-6 flex flex-col items-center">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E3A2B] text-[#FBF8F3] font-bold shadow-md">
            <span className="text-xl tracking-tight font-serif font-black">M</span>
          </div>
          <Badge className="border-white/80 text-[#1E3A2B] bg-white/70 backdrop-blur-md text-[11px] px-3 py-0.5 rounded-full shadow-2xs font-semibold">
            {t("maitriLivestockHealth")}
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E3A2B] font-display">
            {t("createAccount")}
          </h1>
          <p className="text-xs text-[#1D1C14]/70 max-w-xs leading-relaxed">
            {t("signUpDesc")}
          </p>
        </div>

        {/* Clerk Sign Up Card */}
        <div className="w-full flex justify-center">
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full shadow-xl",
                card: "liquid-glass-card border border-white/80 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_16px_36px_rgba(30,58,43,0.08)] p-4 sm:p-7 backdrop-blur-[24px]",
                headerTitle: "text-[#1E3A2B] text-lg font-bold font-display",
                headerSubtitle: "text-[#1D1C14]/60 text-xs",
                socialButtonsBlockButton: "bg-white/60 border border-white/80 hover:bg-white text-[#1E3A2B] text-xs font-semibold rounded-full min-h-[42px] transition-all shadow-xs cursor-pointer",
                socialButtonsBlockButtonText: "text-[#1E3A2B] font-semibold text-xs",
                formButtonPrimary: "liquid-button-primary text-xs font-semibold shadow-md rounded-full transition-all min-h-[44px] cursor-pointer",
                formFieldLabel: "text-[#1E3A2B] text-xs font-semibold",
                formFieldInput: "bg-white/80 border border-white/80 text-[#1D1C14] focus:border-[#3F6B4A] focus:ring-2 focus:ring-[#3F6B4A]/20 text-xs rounded-full min-h-[42px] px-4 shadow-2xs",
                footerActionLink: "text-[#3F6B4A] hover:text-[#1E3A2B] text-xs font-bold",
                footerActionText: "text-[#1D1C14]/60 text-xs",
                dividerLine: "bg-[#1E3A2B]/10",
                dividerText: "text-[#1D1C14]/40 text-xs uppercase font-medium",
                footer: "bg-white/40 border-t border-[#1E3A2B]/8 text-xs text-[#1D1C14]/60 rounded-b-3xl",
                identityPreview: "bg-white/60 border border-white/80 rounded-2xl text-xs",
                identityPreviewText: "text-[#1E3A2B] text-xs font-semibold",
                identityPreviewEditButton: "text-[#3F6B4A] hover:text-[#1E3A2B] text-xs font-bold",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
