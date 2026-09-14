import Link from "next/link";
import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { Activity, BellRing, ShieldCheck, UserCheck, FileSpreadsheet } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AuthorityLayout({ children }: { children: React.ReactNode }) {
  await requireDistrictAuthority();

  return (
    <div className="w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
